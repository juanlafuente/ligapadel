import { describe, expect, it } from 'vitest';
import { playerStats } from './playerStats';
import type { HistoryMatch } from './types';

let n = 0;
const m = (pair1: [string, string], pair2: [string, string], sets: [number, number][]): HistoryMatch => ({
  id: `m${++n}`,
  round: 1,
  week: n,
  playedAt: '2026-01-01T00:00:00Z',
  pair1,
  pair2,
  sets: sets.map(([pair1, pair2]) => ({ pair1, pair2 })),
});

describe('playerStats', () => {
  const matches = [
    m(['ana', 'bea'], ['carla', 'dani'], [[6, 4], [7, 6]]), // gana, 1 tie-break ganado
    m(['ana', 'carla'], ['bea', 'dani'], [[3, 6], [6, 3], [6, 4]]), // gana remontando
    m(['ana', 'dani'], ['bea', 'carla'], [[4, 6], [6, 7]]), // pierde, 1 tie-break perdido
    m(['ana', 'bea'], ['carla', 'dani'], [[6, 1], [6, 2]]), // gana
    m(['bea', 'carla'], ['ana', 'dani'], [[6, 0], [6, 0]]), // pierde
  ];

  it('balance, sets, juegos, tie-breaks y remontadas', () => {
    expect(playerStats('ana', matches)).toMatchObject({
      played: 5,
      won: 3,
      lost: 2,
      setsWon: 6,
      setsLost: 5,
      gamesWon: 50,
      gamesLost: 51,
      tiebreaksPlayed: 2,
      tiebreaksWon: 1,
      comebacks: 1,
    });
  });

  it('rachas', () => {
    const stats = playerStats('ana', matches);
    expect(stats.streak).toEqual({ won: false, count: 1 });
    expect(stats.bestWinStreak).toBe(2);
  });

  it('mejor compañero y bestia negra (mínimo 2 partidos)', () => {
    const stats = playerStats('ana', matches);
    expect(stats.bestPartner).toEqual({ player: 'bea', played: 2, won: 2 });
    // Contra Bea y Carla: 1 de 3 ganados cada una; empata a peor ratio y más partidos → la primera por orden.
    expect(stats.nemesis?.won).toBe(1);
    expect(stats.nemesis?.played).toBe(3);
  });

  it('sin partidos no hay mejor compañero ni bestia negra', () => {
    expect(playerStats('nadie', matches)).toMatchObject({ played: 0, streak: null, bestPartner: null, nemesis: null });
  });
});
