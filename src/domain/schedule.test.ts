import { describe, expect, it } from 'vitest';
import { seededRng } from './rng';
import { generateRound, pairKey, planRound } from './schedule';
import type { Group, ScheduledMatch } from './types';
import { validateSchedule } from './validation';

function makeGroups(...sizes: number[]): Group[] {
  let n = 0;
  return sizes.map((size, i) => ({
    id: String.fromCharCode(65 + i),
    players: Array.from({ length: size }, () => `J${++n}`),
  }));
}

function countKinds(matches: ScheduledMatch[]) {
  return matches.reduce<Record<string, number>>((acc, m) => ({ ...acc, [m.kind]: (acc[m.kind] ?? 0) + 1 }), {});
}

function weeksOf(matches: ScheduledMatch[]) {
  return new Set(matches.map((m) => m.week)).size;
}

describe('planRound', () => {
  it('reproduce el esquema de 12 jugadores: A 3, B 2, C 3, AB 2, BC 2', () => {
    const plan = planRound(makeGroups(4, 4, 4));
    expect(Object.fromEntries(plan.intra)).toEqual({ A: 3, B: 2, C: 3 });
    expect(plan.cross.map((e) => e.matches)).toEqual([2, 2]);
  });

  it('con 13 jugadores y el grupo C de 5, C solo juega internos', () => {
    const plan = planRound(makeGroups(4, 4, 5));
    expect(Object.fromEntries(plan.intra)).toEqual({ A: 3, B: 3, C: 5 });
    expect(plan.cross.map((e) => e.matches)).toEqual([2, 0]);
  });

  it('rechaza grupos que no son de 4 o 5', () => {
    expect(() => planRound(makeGroups(4, 3, 4))).toThrow(/4 o 5/);
    expect(() => planRound(makeGroups(4, 6, 4))).toThrow(/4 o 5/);
  });

  it('rechaza jugadores repetidos entre grupos', () => {
    const groups = makeGroups(4, 4, 4);
    groups[1].players[0] = groups[0].players[0];
    expect(() => planRound(groups)).toThrow(/repetidos/);
  });
});

describe('generateRound', () => {
  const seeds = Array.from({ length: 25 }, (_, i) => i + 1);

  it.each(seeds)('12 jugadores (semilla %i): 4 semanas y todos juegan cada semana', (seed) => {
    const groups = makeGroups(4, 4, 4);
    const matches = generateRound(groups, { rng: seededRng(seed) });

    expect(validateSchedule(groups, matches)).toEqual([]);
    expect(matches).toHaveLength(12);
    expect(countKinds(matches)).toEqual({ A: 3, B: 2, C: 3, AB: 2, BC: 2 });
    expect(weeksOf(matches)).toBe(4);
    for (let week = 1; week <= 4; week++) {
      const players = matches.filter((m) => m.week === week).flatMap((m) => [...m.pair1, ...m.pair2]);
      expect(new Set(players).size).toBe(12);
    }
  });

  it.each(seeds)('13 jugadores (semilla %i): 5 semanas y cada uno descansa una', (seed) => {
    const groups = makeGroups(4, 4, 5);
    const matches = generateRound(groups, { rng: seededRng(seed) });

    expect(validateSchedule(groups, matches)).toEqual([]);
    expect(matches).toHaveLength(13);
    expect(countKinds(matches)).toEqual({ A: 3, B: 3, C: 5, AB: 2 });
    expect(weeksOf(matches)).toBe(5);
  });

  it.each([
    [[5, 4, 4]],
    [[4, 5, 4]],
    [[5, 4, 5]],
    [[4, 5, 5]],
    [[5, 5, 5]],
    [[4, 4]],
    [[4, 4, 4, 4]],
  ])('genera un calendario válido para grupos %j', (sizes) => {
    const groups = makeGroups(...sizes);
    for (const seed of [1, 2, 3]) {
      expect(validateSchedule(groups, generateRound(groups, { rng: seededRng(seed) }))).toEqual([]);
    }
  });

  it('en un grupo de 5 cada jugador es pareja de todos los demás una vez', () => {
    const groups = makeGroups(4, 4, 5);
    const matches = generateRound(groups, { rng: seededRng(7) }).filter((m) => m.kind === 'C');
    const partners = new Set(matches.flatMap((m) => [pairKey(m.pair1), pairKey(m.pair2)]));
    expect(partners.size).toBe(10);
  });
});

describe('validateSchedule', () => {
  const groups = makeGroups(4, 4, 4);
  const valid = generateRound(groups, { rng: seededRng(42) });

  it('avisa si un jugador juega dos veces la misma semana', () => {
    const edited = valid.map((m, i) => (i === 0 ? { ...m, week: valid.find((o) => o.week !== m.week)!.week } : m));
    expect(validateSchedule(groups, edited).map((issue) => issue.type)).toContain('same-week');
  });

  it('avisa si se repite pareja', () => {
    const [first, second, ...rest] = valid;
    const edited = [first, { ...second, pair1: first.pair1, pair2: first.pair2 }, ...rest];
    expect(validateSchedule(groups, edited).map((issue) => issue.type)).toContain('repeated-partner');
  });

  it('avisa si un jugador no tiene 4 partidos', () => {
    const issues = validateSchedule(groups, valid.slice(1));
    expect(issues.filter((issue) => issue.type === 'match-count')).toHaveLength(4);
  });

  it('avisa si un jugador no está en ningún grupo o las parejas no encajan con el tipo', () => {
    const m = valid.find((match) => match.kind === 'A')!;
    const edited = valid.map((match) => (match === m ? { ...m, pair1: ['Fulano', m.pair1[1]] as const } : match));
    expect(validateSchedule(groups, edited).map((issue) => issue.type)).toContain('unknown-player');

    const b = groups[1].players[0];
    const mixed = valid.map((match) => (match === m ? { ...m, pair1: [b, m.pair1[1]] as const } : match));
    expect(validateSchedule(groups, mixed).map((issue) => issue.type)).toContain('wrong-kind');
  });
});
