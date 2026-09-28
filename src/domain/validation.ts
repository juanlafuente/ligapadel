import { MATCHES_PER_PLAYER, pairKey } from './schedule';
import type { Group, PlayerId, ScheduledMatch } from './types';

export type ScheduleIssueType =
  | 'unknown-player'
  | 'duplicate-in-match'
  | 'repeated-partner'
  | 'same-week'
  | 'match-count'
  | 'wrong-kind';

export interface ScheduleIssue {
  type: ScheduleIssueType;
  message: string;
  /** Índices de los partidos afectados dentro de la lista recibida. */
  matches: number[];
}

/**
 * Revisa un calendario (por ejemplo, después de editarlo a mano) y devuelve
 * los avisos. Un calendario correcto devuelve una lista vacía.
 */
export function validateSchedule(
  groups: readonly Group[],
  matches: readonly ScheduledMatch[],
  nameOf: (player: PlayerId) => string = (player) => player,
): ScheduleIssue[] {
  const issues: ScheduleIssue[] = [];
  const groupOf = new Map(groups.flatMap((group) => group.players.map((player) => [player, group.id] as const)));
  const byPartners = new Map<string, number[]>();
  const byPlayerWeek = new Map<string, number[]>();
  const byPlayer = new Map<PlayerId, number[]>(groups.flatMap((group) => group.players.map((p) => [p, []] as [PlayerId, number[]])));

  matches.forEach((match, index) => {
    const players = [...match.pair1, ...match.pair2];
    const label = `Semana ${match.week}: ${describe(match, nameOf)}`;

    const unknown = players.filter((player) => !groupOf.has(player));
    if (unknown.length > 0) {
      issues.push({ type: 'unknown-player', message: `${label} — ${unknown.map(nameOf).join(', ')} no está en ningún grupo.`, matches: [index] });
    }
    if (new Set(players).size !== players.length) {
      issues.push({ type: 'duplicate-in-match', message: `${label} — un jugador aparece dos veces.`, matches: [index] });
    }
    const kind = kindOf(match, groupOf);
    if (kind !== null && kind !== match.kind) {
      issues.push({ type: 'wrong-kind', message: `${label} — hay jugadores de fuera del grupo ${match.kind}.`, matches: [index] });
    }

    for (const pair of [match.pair1, match.pair2]) push(byPartners, pairKey(pair), index);
    for (const player of new Set(players)) {
      push(byPlayerWeek, `${player}|${match.week}`, index);
      push(byPlayer, player, index);
    }
  });

  for (const [key, indexes] of byPartners) {
    if (indexes.length > 1) {
      const [a, b] = key.split('|');
      issues.push({ type: 'repeated-partner', message: `${nameOf(a)} y ${nameOf(b)} son pareja en ${indexes.length} partidos.`, matches: indexes });
    }
  }
  for (const [key, indexes] of byPlayerWeek) {
    if (indexes.length > 1) {
      const [player, week] = key.split('|');
      issues.push({ type: 'same-week', message: `${nameOf(player)} juega ${indexes.length} partidos la semana ${week}.`, matches: indexes });
    }
  }
  for (const [player, indexes] of byPlayer) {
    if (groupOf.has(player) && indexes.length !== MATCHES_PER_PLAYER) {
      issues.push({ type: 'match-count', message: `${nameOf(player)} tiene ${indexes.length} partidos en vez de ${MATCHES_PER_PLAYER}.`, matches: indexes });
    }
  }
  return issues;
}

/** Grupo al que corresponden los jugadores, o 'mixto' si hay jugadores de varios grupos. */
function kindOf(match: ScheduledMatch, groupOf: ReadonlyMap<PlayerId, string>): string | null {
  const ids = [...match.pair1, ...match.pair2].map((player) => groupOf.get(player));
  if (ids.some((id) => id === undefined)) return null;
  return ids.every((id) => id === ids[0]) ? ids[0]! : 'mixto';
}

function describe(match: ScheduledMatch, nameOf: (player: PlayerId) => string): string {
  return `${match.pair1.map(nameOf).join('/')} vs ${match.pair2.map(nameOf).join('/')}`;
}

function push<K>(map: Map<K, number[]>, key: K, value: number) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}
