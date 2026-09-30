import { describe, expect, it } from 'vitest';
import { seasonPoints, seasonStandings } from './season';

describe('seasonPoints', () => {
  it('sigue la tabla de la liga', () => {
    expect([1, 2, 3, 4].map((p) => seasonPoints('A', p))).toEqual([12, 10, 8, 6]);
    expect([1, 2, 3, 4].map((p) => seasonPoints('B', p))).toEqual([9, 7, 5, 3]);
    expect([1, 2, 3, 4].map((p) => seasonPoints('C', p))).toEqual([6, 4, 2, 0]);
  });
});

describe('seasonStandings', () => {
  const round1 = { round: 1, ranking: new Map([['A', ['a1', 'a2', 'a3', 'a4']], ['B', ['b1', 'b2', 'b3', 'b4']]]) };
  const round2 = { round: 2, ranking: new Map([['A', ['b1', 'a1', 'b2', 'a2']], ['B', ['a3', 'b3', 'a4', 'b4']]]) };

  it('suma los puntos de cada vuelta', () => {
    const rows = seasonStandings([round1, round2]);
    const byPlayer = new Map(rows.map((r) => [r.player, r]));
    expect(byPlayer.get('a1')!.points).toBe(12 + 10);
    expect(byPlayer.get('b1')!.points).toBe(9 + 12);
    expect(byPlayer.get('b1')!.rounds).toEqual([
      { round: 1, group: 'B', position: 1, points: 9 },
      { round: 2, group: 'A', position: 1, points: 12 },
    ]);
    expect(rows[0].player).toBe('a1');
  });

  it('ordena por puntos', () => {
    const rows = seasonStandings([round1, round2]);
    expect(rows.map((r) => [r.player, r.points])).toEqual([
      ['a1', 22],
      ['b1', 21],
      ['a3', 17],
      ['a2', 16],
      ['b2', 15],
      ['b3', 12],
      ['a4', 11],
      ['b4', 6],
    ]);
  });

  it('a igualdad de puntos gana quien sumó más en la última vuelta', () => {
    // x: 10 + 6 = 16 (última 6); y: 12 + 4 = 16 (última 4).
    const rows = seasonStandings([
      { round: 1, ranking: new Map([['A', ['y', 'x']]]) },
      { round: 2, ranking: new Map([['A', ['p', 'q', 'r', 'x']], ['C', ['s', 'y']]]) },
    ]);
    const x = rows.find((r) => r.player === 'x')!;
    const y = rows.find((r) => r.player === 'y')!;
    expect([x.points, y.points]).toEqual([16, 16]);
    expect(x.position).toBeLessThan(y.position);
    expect(y.tiedWithPrevious).toBe(false);
  });

  it('marca empate total (mismos puntos y misma última vuelta)', () => {
    // x: 4º de Oro (6) y 1º de Bronce (6); y: al revés. Los dos suman 12 y 6 en la última.
    const rows = seasonStandings([
      { round: 1, ranking: new Map([['A', ['a', 'b', 'c', 'x']], ['C', ['y']]]) },
      { round: 2, ranking: new Map([['A', ['a', 'b', 'c', 'y']], ['C', ['x']]]) },
    ]);
    const tied = rows.filter((r) => r.player === 'x' || r.player === 'y');
    expect(tied.map((r) => r.points)).toEqual([12, 12]);
    expect(tied[1].tiedWithPrevious).toBe(true);
  });
});
