import { describe, expect, it } from 'vitest';
import { computeElo, ELO_K, ELO_START, expectedScore, SWEEP_BONUS } from './elo';
import type { HistoryMatch } from './types';

let n = 0;
const m = (pair1: [string, string], pair2: [string, string], sets: [number, number][], round = 1, week = 1): HistoryMatch => ({
  id: `m${++n}`,
  round,
  week,
  playedAt: `2026-01-01T00:00:${String(n).padStart(2, '0')}Z`,
  pair1,
  pair2,
  sets: sets.map(([pair1, pair2]) => ({ pair1, pair2 })),
});

describe('expectedScore', () => {
  it('es 0,5 entre parejas iguales y ~0,64 con 100 puntos de ventaja', () => {
    expect(expectedScore(1000, 1000)).toBe(0.5);
    expect(expectedScore(1100, 1000)).toBeCloseTo(0.64, 2);
  });
});

describe('computeElo', () => {
  it('todos empiezan en 1000; entre iguales, ganar 2-1 da +16 y perder -16', () => {
    const { ratings } = computeElo([m(['a', 'b'], ['c', 'd'], [[6, 4], [4, 6], [6, 4]])]);
    expect(ratings.get('a')).toBeCloseTo(ELO_START + ELO_K / 2);
    expect(ratings.get('b')).toBeCloseTo(ELO_START + ELO_K / 2);
    expect(ratings.get('c')).toBeCloseTo(ELO_START - ELO_K / 2);
  });

  it('ganar 2-0 da un 20 % más', () => {
    const { ratings } = computeElo([m(['a', 'b'], ['c', 'd'], [[6, 4], [6, 4]])]);
    expect(ratings.get('a')).toBeCloseTo(ELO_START + (ELO_K / 2) * SWEEP_BONUS);
  });

  it('tiene en cuenta al compañero: ganar con uno fuerte suma menos', () => {
    // a sube primero; luego a juega con b contra c y d.
    const setup = m(['a', 'x'], ['y', 'z'], [[6, 0], [6, 0]]);
    const withStrong = computeElo([setup, m(['a', 'b'], ['c', 'd'], [[6, 4], [4, 6], [6, 4]])]);
    const bGain = withStrong.ratings.get('b')! - ELO_START;
    // b gana lo mismo que a, pero menos que si hubiera ganado entre iguales.
    expect(bGain).toBeLessThan(ELO_K / 2);
    expect(withStrong.changes.get('a')!.at(-1)!.delta).toBeCloseTo(bGain);
  });

  it('es de suma cero y procesa los partidos en orden cronológico', () => {
    const later = m(['a', 'b'], ['c', 'd'], [[6, 1], [6, 1]], 2, 1);
    const earlier = m(['c', 'd'], ['a', 'b'], [[6, 1], [6, 1]], 1, 1);
    const { ratings, changes } = computeElo([later, earlier]);
    const total = [...ratings.values()].reduce((s, r) => s + r, 0);
    expect(total).toBeCloseTo(4 * ELO_START);
    expect(changes.get('a')!.map((c) => c.matchId)).toEqual([earlier.id, later.id]);
  });

  it('ignora partidos con resultado inválido', () => {
    const { ratings } = computeElo([m(['a', 'b'], ['c', 'd'], [[6, 5], [6, 4]])]);
    expect(ratings.size).toBe(0);
  });
});
