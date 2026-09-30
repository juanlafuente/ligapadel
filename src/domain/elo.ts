import { chronological } from './history';
import { scoreMatch } from './scoring';
import type { HistoryMatch, Pair, PlayerId } from './types';

/** Todos empiezan con el mismo índice. */
export const ELO_START = 1000;
/** Máximo que se puede ganar o perder en un partido (sin bonus). */
export const ELO_K = 32;
/** Ganar 2-0 multiplica el cambio por este factor. */
export const SWEEP_BONUS = 1.2;

export interface EloChange {
  matchId: string;
  before: number;
  after: number;
  delta: number;
}

export interface EloResult {
  ratings: Map<PlayerId, number>;
  /** Cambios de cada jugador, en orden cronológico. */
  changes: Map<PlayerId, EloChange[]>;
}

/** Probabilidad de que gane la pareja con media `team` contra la de media `opponent`. */
export function expectedScore(team: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - team) / 400));
}

/**
 * Índice Matilda: Elo por parejas. La fuerza de cada pareja es la media de sus dos
 * jugadores; ganar con un compañero fuerte o contra rivales flojos suma menos.
 * Los dos jugadores de una pareja ganan o pierden lo mismo.
 */
export function computeElo(matches: readonly HistoryMatch[]): EloResult {
  const ratings = new Map<PlayerId, number>();
  const changes = new Map<PlayerId, EloChange[]>();
  const rating = (player: PlayerId) => ratings.get(player) ?? ELO_START;
  const average = (pair: Pair) => (rating(pair[0]) + rating(pair[1])) / 2;

  for (const match of chronological(matches)) {
    const outcome = scoreMatch(match.sets);
    const expected1 = expectedScore(average(match.pair1), average(match.pair2));
    // Con un resultado válido, 2 sets significa que alguien ganó 2-0.
    const bonus = match.sets.length === 2 ? SWEEP_BONUS : 1;
    const delta1 = ELO_K * bonus * ((outcome.winner === 1 ? 1 : 0) - expected1);

    for (const [pair, delta] of [[match.pair1, delta1], [match.pair2, -delta1]] as const) {
      for (const player of pair) {
        const before = rating(player);
        const after = before + delta;
        ratings.set(player, after);
        const list = changes.get(player) ?? [];
        list.push({ matchId: match.id, before, after, delta });
        changes.set(player, list);
      }
    }
  }
  return { ratings, changes };
}
