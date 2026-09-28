import { describe, expect, it } from 'vitest';
import { groupStandings, type PlayedMatch } from './standings';

const s = (pair1: number, pair2: number) => ({ pair1, pair2 });

describe('groupStandings', () => {
  const players = ['Ana', 'Bea', 'Carla', 'Dani'];

  it('ordena por victorias: cada victoria vale 1 punto, sea 2-0 o 2-1', () => {
    const matches: PlayedMatch[] = [
      { pair1: ['Ana', 'Bea'], pair2: ['Carla', 'Dani'], sets: [s(6, 2), s(6, 3)] },
      { pair1: ['Ana', 'Carla'], pair2: ['Bea', 'Dani'], sets: [s(6, 4), s(4, 6), s(6, 4)] },
    ];
    const rows = groupStandings(players, matches);
    expect(rows.map((r) => [r.player, r.points])).toEqual([
      ['Ana', 2],
      ['Bea', 1],
      ['Carla', 1],
      ['Dani', 0],
    ]);
    expect(rows[0]).toMatchObject({ played: 2, won: 2, lost: 0, setsWon: 4, setsLost: 1, setDiff: 3, gamesWon: 28, gamesLost: 19, gameDiff: 9 });
  });

  it('a igualdad de victorias desempata por diferencia de sets', () => {
    const matches: PlayedMatch[] = [
      // Bea gana 2-0 y pierde 1-2 (+1 set); Carla gana 2-1 y pierde 0-2 (-1 set).
      { pair1: ['Ana', 'Bea'], pair2: ['Carla', 'Dani'], sets: [s(6, 0), s(6, 0)] },
      { pair1: ['Ana', 'Carla'], pair2: ['Bea', 'Dani'], sets: [s(6, 4), s(4, 6), s(6, 4)] },
    ];
    const rows = groupStandings(players, matches);
    const bea = rows.find((r) => r.player === 'Bea')!;
    const carla = rows.find((r) => r.player === 'Carla')!;
    expect([bea.points, bea.setDiff, carla.points, carla.setDiff]).toEqual([1, 1, 1, -1]);
    expect(bea.position).toBeLessThan(carla.position);
  });

  it('a igualdad de victorias y sets desempata por diferencia de juegos', () => {
    const matches: PlayedMatch[] = [
      { pair1: ['Ana', 'Bea'], pair2: ['Carla', 'Dani'], sets: [s(6, 0), s(6, 0)] },
      { pair1: ['Ana', 'Carla'], pair2: ['Bea', 'Dani'], sets: [s(6, 4), s(4, 6), s(6, 4)] },
      { pair1: ['Ana', 'Dani'], pair2: ['Bea', 'Carla'], sets: [s(5, 7), s(6, 3), s(5, 7)] },
    ];
    const rows = groupStandings(players, matches);
    // Ana y Bea: 2 victorias y +2 sets; Ana +13 juegos, Bea +11.
    expect(rows.slice(0, 2).map((r) => [r.player, r.points, r.setDiff, r.gameDiff])).toEqual([
      ['Ana', 2, 2, 13],
      ['Bea', 2, 2, 11],
    ]);
  });

  it('marca empate total para decidir por sorteo', () => {
    const rows = groupStandings(players, [{ pair1: ['Ana', 'Bea'], pair2: ['Carla', 'Dani'], sets: [s(6, 3), s(6, 3)] }]);
    expect(rows.map((r) => r.tiedWithPrevious)).toEqual([false, true, false, true]);
  });

  it('cuenta los partidos cruzados e ignora a los jugadores de otros grupos', () => {
    const rows = groupStandings(players, [{ pair1: ['Ana', 'Zoe'], pair2: ['Bea', 'Yara'], sets: [s(6, 1), s(6, 1)] }]);
    expect(rows.map((r) => r.player)).toEqual(['Ana', 'Carla', 'Dani', 'Bea']);
    expect(rows[0].points).toBe(1);
  });
});
