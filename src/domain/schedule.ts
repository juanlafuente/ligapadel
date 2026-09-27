import { shuffle, type Rng } from './rng';
import type { Group, GroupId, MatchKind, Pair, PlayerId, ScheduledMatch } from './types';

export const MATCHES_PER_PLAYER = 4;

/** Máximo de partidos internos sin repetir pareja: 3 en un grupo de 4 y 5 en uno de 5. */
const MAX_INTRA_MATCHES: Record<number, number> = { 4: 3, 5: 5 };

export interface RoundPlan {
  /** Partidos internos de cada grupo. */
  intra: Map<GroupId, number>;
  /** Partidos cruzados entre cada par de grupos contiguos, en orden (A-B, B-C...). */
  cross: { upper: GroupId; lower: GroupId; matches: number }[];
}

/**
 * Decide cuántos partidos internos y cruzados hay en la vuelta para que cada
 * jugador juegue exactamente 4, usando el mínimo de partidos cruzados.
 * Con 4-4-4: A 3, B 2, C 3, AB 2, BC 2. Con un grupo de 5, ese grupo solo juega internos.
 */
export function planRound(groups: readonly Group[]): RoundPlan {
  if (groups.length === 0) throw new Error('Hace falta al menos un grupo.');
  for (const group of groups) {
    if (!(group.players.length in MAX_INTRA_MATCHES)) {
      throw new Error(`El grupo ${group.id} tiene ${group.players.length} jugadores; cada grupo debe tener 4 o 5.`);
    }
  }
  const allPlayers = groups.flatMap((group) => group.players);
  if (new Set(allPlayers).size !== allPlayers.length) throw new Error('Hay jugadores repetidos entre grupos.');

  // Cada partido cruzado ocupa 2 plazas de cada grupo; se prueban 0, 2 o 4 por frontera.
  const edges = groups.length - 1;
  let best: { cross: number[]; intra: number[] } | null = null;
  for (let combo = 0; combo < 3 ** edges; combo++) {
    const cross = Array.from({ length: edges }, (_, e) => 2 * (Math.floor(combo / 3 ** e) % 3));
    const intra = groups.map((group, i) => {
      const crossSlots = 2 * ((cross[i - 1] ?? 0) + (cross[i] ?? 0));
      return (MATCHES_PER_PLAYER * group.players.length - crossSlots) / 4;
    });
    const valid = intra.every((n, i) => Number.isInteger(n) && n >= 0 && n <= MAX_INTRA_MATCHES[groups[i].players.length]);
    if (!valid) continue;
    const total = cross.reduce((a, b) => a + b, 0);
    if (!best || total < best.cross.reduce((a, b) => a + b, 0)) best = { cross, intra };
  }
  if (!best) throw new Error('No hay una combinación de partidos que encaje con estos grupos.');

  const { cross, intra } = best;
  return {
    intra: new Map(groups.map((group, i) => [group.id, intra[i]])),
    cross: cross.map((matches, e) => ({ upper: groups[e].id, lower: groups[e + 1].id, matches })),
  };
}

export interface GenerateOptions {
  rng?: Rng;
  /** Intentos aleatorios por cada número de semanas antes de probar con una semana más. */
  attemptsPerWeekCount?: number;
}

/**
 * Genera los partidos de una vuelta: parejas aleatorias sin repetir compañero,
 * 4 partidos por jugador y como mucho 1 partido por jugador y semana.
 * Usa el mínimo de semanas posible (4 con 12 jugadores, 5 con 13 y un descanso por jugador).
 */
export function generateRound(groups: readonly Group[], options: GenerateOptions = {}): ScheduledMatch[] {
  const rng = options.rng ?? Math.random;
  const attempts = options.attemptsPerWeekCount ?? 200;
  const plan = planRound(groups);
  const playerCount = groups.reduce((sum, group) => sum + group.players.length, 0);
  const totalMatches =
    [...plan.intra.values()].reduce((a, b) => a + b, 0) + plan.cross.reduce((sum, edge) => sum + edge.matches, 0);
  const minWeeks = Math.max(MATCHES_PER_PLAYER, Math.ceil(totalMatches / Math.floor(playerCount / 4)));

  for (let weeks = minWeeks; weeks <= minWeeks + 2; weeks++) {
    for (let attempt = 0; attempt < attempts; attempt++) {
      const matches = pickMatches(groups, plan, rng);
      if (!matches) continue;
      const assigned = assignWeeks(matches, weeks, rng);
      if (assigned) return assigned.sort((a, b) => a.week - b.week || a.kind.localeCompare(b.kind));
    }
  }
  throw new Error('No se ha podido generar un calendario; prueba de nuevo.');
}

type Candidate = Omit<ScheduledMatch, 'week'>;

interface Slot {
  kind: MatchKind;
  groupIds: GroupId[];
  candidates: Candidate[];
}

function pickMatches(groups: readonly Group[], plan: RoundPlan, rng: Rng): Candidate[] | null {
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const groupOf = new Map(groups.flatMap((group) => group.players.map((player) => [player, group.id] as const)));

  // Primero los cruzados (más restringidos), luego los internos.
  const slots: Slot[] = [];
  for (const edge of plan.cross) {
    const upper = groupById.get(edge.upper)!;
    const lower = groupById.get(edge.lower)!;
    const kind = edge.upper + edge.lower;
    for (let i = 0; i < edge.matches; i++) {
      slots.push({ kind, groupIds: [upper.id, lower.id], candidates: crossCandidates(kind, upper.players, lower.players) });
    }
  }
  for (const group of groups) {
    for (let i = 0; i < plan.intra.get(group.id)!; i++) {
      slots.push({ kind: group.id, groupIds: [group.id], candidates: intraCandidates(group.id, group.players) });
    }
  }

  // Reparto equilibrado de los cruzados: con 2 partidos AB, cada jugador de A y de B juega 1.
  const crossCap = new Map<string, number>();
  for (const edge of plan.cross) {
    for (const id of [edge.upper, edge.lower]) {
      crossCap.set(`${edge.upper}${edge.lower}:${id}`, Math.ceil((2 * edge.matches) / groupById.get(id)!.players.length));
    }
  }

  const played = new Map<PlayerId, number>();
  const crossPlayed = new Map<string, number>();
  const partners = new Set<string>();
  const chosen: Candidate[] = [];
  let budget = 20_000;

  const fits = (slot: Slot, candidate: Candidate): boolean => {
    for (const pair of [candidate.pair1, candidate.pair2]) {
      if (partners.has(pairKey(pair))) return false;
      for (const player of pair) {
        if ((played.get(player) ?? 0) >= MATCHES_PER_PLAYER) return false;
        if (slot.groupIds.length === 2) {
          const key = `${slot.kind}:${player}`;
          const cap = crossCap.get(`${slot.kind}:${groupOf.get(player)}`)!;
          if ((crossPlayed.get(key) ?? 0) >= cap) return false;
        }
      }
    }
    return true;
  };

  const apply = (slot: Slot, candidate: Candidate, delta: 1 | -1) => {
    for (const pair of [candidate.pair1, candidate.pair2]) {
      if (delta === 1) partners.add(pairKey(pair));
      else partners.delete(pairKey(pair));
      for (const player of pair) {
        played.set(player, (played.get(player) ?? 0) + delta);
        if (slot.groupIds.length === 2) {
          const key = `${slot.kind}:${player}`;
          crossPlayed.set(key, (crossPlayed.get(key) ?? 0) + delta);
        }
      }
    }
  };

  // Poda: a cada jugador le tienen que quedar huecos suficientes para llegar a 4 partidos.
  const stillFeasible = (from: number): boolean => {
    const remaining = new Map<GroupId, number>();
    for (let i = from; i < slots.length; i++) {
      for (const id of slots[i].groupIds) remaining.set(id, (remaining.get(id) ?? 0) + 1);
    }
    for (const [player, group] of groupOf) {
      if (MATCHES_PER_PLAYER - (played.get(player) ?? 0) > (remaining.get(group) ?? 0)) return false;
    }
    return true;
  };

  const solve = (index: number): boolean => {
    if (index === slots.length) return true;
    if (--budget <= 0) return false;
    const slot = slots[index];
    for (const candidate of shuffle(slot.candidates, rng)) {
      if (!fits(slot, candidate)) continue;
      apply(slot, candidate, 1);
      chosen.push(candidate);
      if (stillFeasible(index + 1) && solve(index + 1)) return true;
      chosen.pop();
      apply(slot, candidate, -1);
    }
    return false;
  };

  return solve(0) ? chosen : null;
}

/** Colorea los partidos con `weeks` semanas sin que nadie juegue dos veces la misma semana. */
function assignWeeks(matches: readonly Candidate[], weeks: number, rng: Rng): ScheduledMatch[] | null {
  const order = shuffle(matches.map((_, i) => i), rng);
  const players = matches.map((match) => [...match.pair1, ...match.pair2]);
  const weekOf = new Array<number>(matches.length).fill(0);
  const busy = Array.from({ length: weeks + 1 }, () => new Set<PlayerId>());
  let budget = 20_000;

  const available = (i: number) =>
    Array.from({ length: weeks }, (_, w) => w + 1).filter((w) => players[i].every((p) => !busy[w].has(p)));

  const solve = (): boolean => {
    // Siguiente partido: el que menos semanas libres tiene.
    let next = -1;
    let nextOptions: number[] = [];
    for (const i of order) {
      if (weekOf[i] !== 0) continue;
      const options = available(i);
      if (next === -1 || options.length < nextOptions.length) {
        next = i;
        nextOptions = options;
      }
    }
    if (next === -1) return true;
    if (--budget <= 0) return false;
    for (const week of shuffle(nextOptions, rng)) {
      weekOf[next] = week;
      players[next].forEach((p) => busy[week].add(p));
      if (solve()) return true;
      players[next].forEach((p) => busy[week].delete(p));
      weekOf[next] = 0;
    }
    return false;
  };

  if (!solve()) return null;
  return matches.map((match, i) => ({ ...match, week: weekOf[i] }));
}

function intraCandidates(kind: MatchKind, players: readonly PlayerId[]): Candidate[] {
  return combinations(players, 4).flatMap(([a, b, c, d]) => [
    { kind, pair1: [a, b] as Pair, pair2: [c, d] as Pair },
    { kind, pair1: [a, c] as Pair, pair2: [b, d] as Pair },
    { kind, pair1: [a, d] as Pair, pair2: [b, c] as Pair },
  ]);
}

/** Partido cruzado: cada pareja tiene un jugador de cada grupo. */
function crossCandidates(kind: MatchKind, upper: readonly PlayerId[], lower: readonly PlayerId[]): Candidate[] {
  return combinations(upper, 2).flatMap(([u1, u2]) =>
    combinations(lower, 2).flatMap(([l1, l2]) => [
      { kind, pair1: [u1, l1] as Pair, pair2: [u2, l2] as Pair },
      { kind, pair1: [u1, l2] as Pair, pair2: [u2, l1] as Pair },
    ]),
  );
}

function combinations<T>(items: readonly T[], size: number): T[][] {
  if (size === 0) return [[]];
  return items.flatMap((item, i) => combinations(items.slice(i + 1), size - 1).map((rest) => [item, ...rest]));
}

export function pairKey([a, b]: Pair): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
