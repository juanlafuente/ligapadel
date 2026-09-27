import { scoreMatch } from './scoring';
import type { Pair, PlayerId, SetScore } from './types';

export interface PlayedMatch {
  pair1: Pair;
  pair2: Pair;
  sets: readonly SetScore[];
}

export interface StandingRow {
  player: PlayerId;
  played: number;
  won: number;
  lost: number;
  points: number;
  gamesWon: number;
  gamesLost: number;
  gameDiff: number;
  position: number;
  /** Empatado en todos los criterios con el anterior: se decide por sorteo. */
  tiedWithPrevious: boolean;
}

/**
 * Clasificación individual de un grupo. Cuenta todos los partidos en los que
 * participa cada jugador, también los cruzados con otros grupos.
 * Orden: puntos, diferencia de juegos, juegos ganados.
 */
export function groupStandings(players: readonly PlayerId[], matches: readonly PlayedMatch[]): StandingRow[] {
  const rows = new Map<PlayerId, StandingRow>(
    players.map((player) => [
      player,
      { player, played: 0, won: 0, lost: 0, points: 0, gamesWon: 0, gamesLost: 0, gameDiff: 0, position: 0, tiedWithPrevious: false },
    ]),
  );

  for (const match of matches) {
    const outcome = scoreMatch(match.sets);
    const sides = [
      { pair: match.pair1, won: outcome.winner === 1, points: outcome.pointsPair1, gamesFor: outcome.gamesPair1, gamesAgainst: outcome.gamesPair2 },
      { pair: match.pair2, won: outcome.winner === 2, points: outcome.pointsPair2, gamesFor: outcome.gamesPair2, gamesAgainst: outcome.gamesPair1 },
    ];
    for (const side of sides) {
      for (const player of side.pair) {
        const row = rows.get(player);
        if (!row) continue;
        row.played += 1;
        row.won += side.won ? 1 : 0;
        row.lost += side.won ? 0 : 1;
        row.points += side.points;
        row.gamesWon += side.gamesFor;
        row.gamesLost += side.gamesAgainst;
        row.gameDiff = row.gamesWon - row.gamesLost;
      }
    }
  }

  const sorted = [...rows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.gameDiff - a.gameDiff ||
      b.gamesWon - a.gamesWon ||
      a.player.localeCompare(b.player),
  );
  sorted.forEach((row, index) => {
    const previous = sorted[index - 1];
    row.position = index + 1;
    row.tiedWithPrevious =
      previous !== undefined &&
      previous.points === row.points &&
      previous.gameDiff === row.gameDiff &&
      previous.gamesWon === row.gamesWon;
  });
  return sorted;
}
