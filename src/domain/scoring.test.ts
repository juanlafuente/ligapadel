import { describe, expect, it } from 'vitest';
import { isValidSet, scoreMatch, validateSets } from './scoring';

const s = (pair1: number, pair2: number) => ({ pair1, pair2 });

describe('isValidSet', () => {
  it.each([[6, 0], [6, 4], [4, 6], [7, 5], [7, 6], [6, 7]])('%i-%i es válido', (a, b) => {
    expect(isValidSet(s(a, b))).toBe(true);
  });
  it.each([[6, 5], [5, 3], [7, 4], [8, 6], [6, 6], [-1, 6]])('%i-%i no es válido', (a, b) => {
    expect(isValidSet(s(a, b))).toBe(false);
  });
});

describe('validateSets', () => {
  it('exige 2 o 3 sets', () => {
    expect(validateSets([s(6, 4)])).not.toBeNull();
    expect(validateSets([s(6, 4), s(6, 4), s(6, 4), s(6, 4)])).not.toBeNull();
  });
  it('exige tercer set si hay 1-1 y lo prohíbe si hay 2-0', () => {
    expect(validateSets([s(6, 4), s(4, 6)])).toMatch(/tercer set/);
    expect(validateSets([s(6, 4), s(6, 4), s(6, 4)])).toMatch(/tercer set/);
  });
});

describe('scoreMatch', () => {
  it('2-0: 1 punto al ganador y 0 al perdedor', () => {
    expect(scoreMatch([s(6, 4), s(7, 5)])).toEqual({
      winner: 1, setsPair1: 2, setsPair2: 0, gamesPair1: 13, gamesPair2: 9, pointsPair1: 1, pointsPair2: 0,
    });
  });
  it('2-1: también 1 punto al ganador y 0 al perdedor', () => {
    expect(scoreMatch([s(6, 4), s(3, 6), s(5, 7)])).toEqual({
      winner: 2, setsPair1: 1, setsPair2: 2, gamesPair1: 14, gamesPair2: 17, pointsPair1: 0, pointsPair2: 1,
    });
  });
  it('lanza error con un resultado inválido', () => {
    expect(() => scoreMatch([s(6, 5), s(6, 4)])).toThrow();
  });
});
