import { describe, expect, it } from 'vitest';
import type { RoundMatch } from './db';
import { formatSets, playedMatches, proposeNextGroups, roundStandings } from './league';

const match = (id: string, pair1: [string, string], pair2: [string, string], sets: [number, number][], estado: RoundMatch['estado'] = 'jugado'): RoundMatch => ({
  id,
  week: 1,
  kind: 'A',
  pair1,
  pair2,
  estado,
  sets: sets.map(([pair1, pair2]) => ({ pair1, pair2 })),
});

const groups = [
  { id: 'A', players: ['a1', 'a2', 'a3', 'a4'] },
  { id: 'B', players: ['b1', 'b2', 'b3', 'b4'] },
];

describe('league', () => {
  it('solo cuenta partidos jugados con resultado válido', () => {
    const matches = [
      match('1', ['a1', 'a2'], ['a3', 'a4'], [[6, 1], [6, 1]]),
      match('2', ['a1', 'a3'], ['a2', 'a4'], [], 'pendiente'),
      match('3', ['a1', 'a4'], ['a2', 'a3'], [[6, 5], [6, 1]]),
    ];
    expect(playedMatches(matches).map((m) => (m as RoundMatch).id)).toEqual(['1']);
    expect(roundStandings({ groups, matches }).get('A')![0]).toMatchObject({ points: 1, played: 1 });
  });

  it('propone los grupos siguientes con 1 ascenso y 1 descenso', () => {
    const matches = [
      match('1', ['a1', 'a2'], ['a3', 'a4'], [[6, 1], [6, 1]]),
      match('2', ['b3', 'b4'], ['b1', 'b2'], [[6, 1], [6, 1]]),
    ];
    const next = proposeNextGroups({ groups, matches });
    expect(next[0].players).toContain('b3');
    expect(next[0].players).not.toContain(roundStandings({ groups, matches }).get('A')![3].player);
    expect(next.map((g) => g.players.length)).toEqual([4, 4]);
  });

  it('formatea los sets', () => {
    expect(formatSets(match('1', ['a', 'b'], ['c', 'd'], [[6, 4], [3, 6], [7, 5]]))).toBe('6-4  3-6  7-5');
  });
});
