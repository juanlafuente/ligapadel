import type { SetScore } from './types';

export interface MatchOutcome {
  winner: 1 | 2;
  setsPair1: number;
  setsPair2: number;
  gamesPair1: number;
  gamesPair2: number;
  pointsPair1: number;
  pointsPair2: number;
}

/** Un set es válido si termina 6-0…6-4, 7-5 o 7-6 (tie-break). */
export function isValidSet({ pair1, pair2 }: SetScore): boolean {
  if (!Number.isInteger(pair1) || !Number.isInteger(pair2)) return false;
  const high = Math.max(pair1, pair2);
  const low = Math.min(pair1, pair2);
  return (high === 6 && low >= 0 && low <= 4) || (high === 7 && (low === 5 || low === 6));
}

/** Devuelve un mensaje de error si el resultado no es válido, o null si lo es. */
export function validateSets(sets: readonly SetScore[]): string | null {
  if (sets.length < 2 || sets.length > 3) return 'Un partido tiene 2 o 3 sets.';
  const invalid = sets.findIndex((set) => !isValidSet(set));
  if (invalid >= 0) {
    const { pair1, pair2 } = sets[invalid];
    return `El set ${invalid + 1} (${pair1}-${pair2}) no es un resultado válido.`;
  }
  const firstTwo = sets.slice(0, 2).filter((set) => set.pair1 > set.pair2).length;
  if (sets.length === 2 && firstTwo === 1) return 'Con un set para cada pareja falta el tercer set.';
  if (sets.length === 3 && firstTwo !== 1) return 'No se juega tercer set si una pareja ya ganó los dos primeros.';
  return null;
}

/** Ganar 2-0 da 3 puntos al ganador y 0 al perdedor; ganar 2-1 da 2 y 1. */
export function scoreMatch(sets: readonly SetScore[]): MatchOutcome {
  const error = validateSets(sets);
  if (error) throw new Error(error);

  const setsPair1 = sets.filter((set) => set.pair1 > set.pair2).length;
  const setsPair2 = sets.length - setsPair1;
  const winner = setsPair1 > setsPair2 ? 1 : 2;
  const [winnerPoints, loserPoints] = sets.length === 2 ? [3, 0] : [2, 1];

  return {
    winner,
    setsPair1,
    setsPair2,
    gamesPair1: sets.reduce((sum, set) => sum + set.pair1, 0),
    gamesPair2: sets.reduce((sum, set) => sum + set.pair2, 0),
    pointsPair1: winner === 1 ? winnerPoints : loserPoints,
    pointsPair2: winner === 2 ? winnerPoints : loserPoints,
  };
}
