import type { GroupId, PlayerId } from './types';

/** Puntos de temporada según el grupo y la posición final en la vuelta. */
export const SEASON_POINTS: Record<GroupId, readonly number[]> = {
  A: [12, 10, 8, 6],
  B: [9, 7, 5, 3],
  C: [6, 4, 2, 0],
};

export function seasonPoints(group: GroupId, position: number): number {
  return SEASON_POINTS[group]?.[position - 1] ?? 0;
}

export interface SeasonRound {
  round: number;
  /** Jugadores de cada grupo en su orden final. */
  ranking: ReadonlyMap<GroupId, readonly PlayerId[]>;
}

export interface SeasonRoundResult {
  round: number;
  group: GroupId;
  position: number;
  points: number;
}

export interface SeasonRow {
  player: PlayerId;
  points: number;
  rounds: SeasonRoundResult[];
  position: number;
  /** Mismos puntos y mismo resultado en la última vuelta que el anterior. */
  tiedWithPrevious: boolean;
}

/**
 * Ranking de la temporada: suma de puntos de las vueltas cerradas.
 * A igualdad de puntos, gana quien sumó más en la última vuelta jugada.
 */
export function seasonStandings(rounds: readonly SeasonRound[]): SeasonRow[] {
  const ordered = [...rounds].sort((a, b) => a.round - b.round);
  const rows = new Map<PlayerId, SeasonRow>();

  for (const { round, ranking } of ordered) {
    for (const [group, players] of ranking) {
      players.forEach((player, i) => {
        const row = rows.get(player) ?? { player, points: 0, rounds: [], position: 0, tiedWithPrevious: false };
        const points = seasonPoints(group, i + 1);
        row.points += points;
        row.rounds.push({ round, group, position: i + 1, points });
        rows.set(player, row);
      });
    }
  }

  const lastPoints = (row: SeasonRow) => row.rounds.at(-1)?.points ?? 0;
  const sorted = [...rows.values()].sort((a, b) => b.points - a.points || lastPoints(b) - lastPoints(a) || a.player.localeCompare(b.player));
  sorted.forEach((row, i) => {
    const previous = sorted[i - 1];
    row.position = i + 1;
    row.tiedWithPrevious = previous !== undefined && previous.points === row.points && lastPoints(previous) === lastPoints(row);
  });
  return sorted;
}
