import type { SeasonRound } from './season';
import type { PlayerId } from './types';

export interface MedalRow {
  player: PlayerId;
  /** Vueltas en el 1er grupo (Oro), 2º (Plata) y 3º (Bronce). */
  gold: number;
  silver: number;
  bronze: number;
  /** Vueltas terminadas 1º de su grupo, en cualquier grupo. */
  titles: number;
  /** Vueltas terminadas 1º del grupo Oro. */
  goldTitles: number;
  /** Posición media dentro de su grupo. */
  averagePosition: number;
  position: number;
  tiedWithPrevious: boolean;
}

/**
 * Medallero histórico, como en las olimpiadas: manda el número de vueltas en Oro,
 * luego en Plata y luego en Bronce. Si siguen empatados, deciden los títulos en Oro
 * (vueltas ganadas en Oro) y después la posición media.
 */
export function medalTable(rounds: readonly SeasonRound[]): MedalRow[] {
  const rows = new Map<PlayerId, MedalRow & { positionSum: number }>();

  for (const { ranking } of rounds) {
    const groupIds = [...ranking.keys()].sort();
    groupIds.forEach((groupId, level) => {
      ranking.get(groupId)!.forEach((player, i) => {
        const row = rows.get(player) ?? {
          player, gold: 0, silver: 0, bronze: 0, titles: 0, goldTitles: 0,
          averagePosition: 0, position: 0, tiedWithPrevious: false, positionSum: 0,
        };
        if (level === 0) row.gold += 1;
        else if (level === 1) row.silver += 1;
        else row.bronze += 1;
        if (i === 0) {
          row.titles += 1;
          if (level === 0) row.goldTitles += 1;
        }
        row.positionSum += i + 1;
        rows.set(player, row);
      });
    });
  }

  const compare = (a: MedalRow, b: MedalRow) =>
    b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze || b.goldTitles - a.goldTitles || a.averagePosition - b.averagePosition;

  const sorted = [...rows.values()]
    .map(({ positionSum, ...row }) => ({ ...row, averagePosition: positionSum / (row.gold + row.silver + row.bronze) }))
    .sort((a, b) => compare(a, b) || a.player.localeCompare(b.player));
  sorted.forEach((row, i) => {
    row.position = i + 1;
    row.tiedWithPrevious = i > 0 && compare(sorted[i - 1], row) === 0;
  });
  return sorted;
}
