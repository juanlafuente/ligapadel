import { describe, expect, it } from 'vitest';
import { seededRng } from './rng';
import { checkGroups, generateRound, pairKey } from './schedule';
import type { Group } from './types';
import { validateSchedule } from './validation';

function makeGroups(...sizes: number[]): Group[] {
  let n = 0;
  return sizes.map((size, i) => ({
    id: String.fromCharCode(65 + i),
    players: Array.from({ length: size }, () => `J${++n}`),
  }));
}

describe('checkGroups', () => {
  it('acepta grupos de 4', () => {
    expect(checkGroups(makeGroups(4, 4, 4))).toBeNull();
  });

  it('rechaza grupos que no son de 4', () => {
    expect(checkGroups(makeGroups(4, 5, 4))).toMatch(/debe tener 4/);
    expect(checkGroups(makeGroups(4, 3, 4))).toMatch(/debe tener 4/);
    expect(checkGroups([])).not.toBeNull();
  });

  it('rechaza jugadores repetidos entre grupos', () => {
    const groups = makeGroups(4, 4, 4);
    groups[1].players[0] = groups[0].players[0];
    expect(checkGroups(groups)).toMatch(/repetidos/);
  });
});

describe('generateRound', () => {
  const seeds = Array.from({ length: 25 }, (_, i) => i + 1);

  it.each(seeds)('12 jugadores (semilla %i): 3 partidos por grupo en las semanas 1, 2 y 3', (seed) => {
    const groups = makeGroups(4, 4, 4);
    const matches = generateRound(groups, { rng: seededRng(seed) });

    expect(validateSchedule(groups, matches)).toEqual([]);
    expect(matches).toHaveLength(9);
    for (const group of groups) {
      const own = matches.filter((m) => m.kind === group.id);
      expect(own.map((m) => m.week).sort()).toEqual([1, 2, 3]);
      // Cada jugador es pareja de los otros 3 una vez.
      expect(new Set(own.flatMap((m) => [pairKey(m.pair1), pairKey(m.pair2)])).size).toBe(6);
    }
  });

  it('cada semana se juega un partido por grupo y la semana 4 queda libre', () => {
    const matches = generateRound(makeGroups(4, 4, 4), { rng: seededRng(5) });
    expect([1, 2, 3, 4].map((week) => matches.filter((m) => m.week === week).length)).toEqual([3, 3, 3, 0]);
  });

  it('sortea parejas distintas con otra semilla', () => {
    const groups = makeGroups(4, 4, 4);
    const a = generateRound(groups, { rng: seededRng(1) });
    const b = generateRound(groups, { rng: seededRng(2) });
    expect(a).not.toEqual(b);
  });

  it('funciona con 2 y 4 grupos', () => {
    for (const sizes of [[4, 4], [4, 4, 4, 4]]) {
      const groups = makeGroups(...sizes);
      expect(validateSchedule(groups, generateRound(groups, { rng: seededRng(3) }))).toEqual([]);
    }
  });

  it('lanza error si un grupo no tiene 4 jugadores', () => {
    expect(() => generateRound(makeGroups(4, 5, 4))).toThrow(/debe tener 4/);
  });
});

describe('validateSchedule', () => {
  const groups = makeGroups(4, 4, 4);
  const valid = generateRound(groups, { rng: seededRng(42) });

  it('avisa si un jugador juega dos veces la misma semana', () => {
    const a = valid.filter((m) => m.kind === 'A');
    const edited = valid.map((m) => (m === a[0] ? { ...m, week: a[1].week } : m));
    expect(validateSchedule(groups, edited).map((issue) => issue.type)).toContain('same-week');
  });

  it('avisa si se repite pareja', () => {
    const [first, second] = valid.filter((m) => m.kind === 'A');
    const edited = valid.map((m) => (m === second ? { ...m, pair1: first.pair1, pair2: first.pair2 } : m));
    expect(validateSchedule(groups, edited).map((issue) => issue.type)).toContain('repeated-partner');
  });

  it('avisa si un jugador no tiene 3 partidos', () => {
    const issues = validateSchedule(groups, valid.slice(1));
    expect(issues.filter((issue) => issue.type === 'match-count')).toHaveLength(4);
  });

  it('avisa si un jugador no está en ningún grupo o es de otro grupo', () => {
    const m = valid.find((match) => match.kind === 'A')!;
    const unknown = valid.map((match) => (match === m ? { ...m, pair1: ['Fulano', m.pair1[1]] as const } : match));
    expect(validateSchedule(groups, unknown).map((issue) => issue.type)).toContain('unknown-player');

    const b = groups[1].players[0];
    const mixed = valid.map((match) => (match === m ? { ...m, pair1: [b, m.pair1[1]] as const } : match));
    expect(validateSchedule(groups, mixed).map((issue) => issue.type)).toContain('wrong-kind');
  });
});
