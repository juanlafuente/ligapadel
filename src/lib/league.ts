import { nextGroups } from '../domain/promotion';
import { validateSets } from '../domain/scoring';
import { groupStandings, type PlayedMatch, type StandingRow } from '../domain/standings';
import type { SeasonRound } from '../domain/season';
import type { Group, GroupId, HistoryMatch, PlayerId } from '../domain/types';
import type { RoundData, RoundMatch } from './db';

export const GROUP_IDS: GroupId[] = ['A', 'B', 'C'];

/** Jugadores que suben y bajan entre cada par de grupos al cerrar una vuelta. */
export const PROMOTIONS = 2;

/** Partidos con resultado válido, que son los que cuentan para la clasificación. */
export function playedMatches(matches: readonly RoundMatch[]): PlayedMatch[] {
  return matches.filter((match) => match.estado === 'jugado' && validateSets(match.sets) === null);
}

export function roundStandings(data: Pick<RoundData, 'groups' | 'matches'>): Map<GroupId, StandingRow[]> {
  const played = playedMatches(data.matches);
  return new Map(data.groups.map((group) => [group.id, groupStandings(group.players, played)]));
}

type RankingSource = Pick<RoundData, 'groups' | 'matches'> & { finalRanking?: RoundData['finalRanking'] };

/** Orden de cada grupo: el guardado al cerrar la vuelta o, si no lo hay, el de la clasificación actual. */
export function groupOrder(data: RankingSource): Map<GroupId, PlayerId[]> {
  if (data.finalRanking) return data.finalRanking;
  return new Map([...roundStandings(data)].map(([id, rows]) => [id, rows.map((row) => row.player)]));
}

/** Grupos de la siguiente vuelta aplicando los ascensos y descensos. */
export function proposeNextGroups(data: RankingSource, order: ReadonlyMap<GroupId, readonly PlayerId[]> = groupOrder(data)): Group[] {
  return nextGroups(data.groups, order, PROMOTIONS);
}

/** Todos los partidos con resultado, para Elo y estadísticas. */
export function historyMatches(history: readonly RoundData[]): HistoryMatch[] {
  return history.flatMap((data) =>
    playedMatches(data.matches).map((match) => {
      const m = match as RoundMatch;
      return { id: m.id, round: data.round.numero, week: m.week, playedAt: m.updatedAt, pair1: m.pair1, pair2: m.pair2, sets: m.sets };
    }),
  );
}

/** Vueltas cerradas con su orden final (de todas las temporadas, o de una si se indica). */
export function closedRounds(history: readonly RoundData[], seasonId?: string): SeasonRound[] {
  return history
    .filter((data) => data.round.estado === 'cerrada' && (seasonId === undefined || data.round.temporada_id === seasonId))
    .map((data) => ({ round: data.round.numero, ranking: groupOrder(data) }));
}

/** Vueltas cerradas de una temporada, para el ranking de temporada. */
export function seasonRounds(history: readonly RoundData[], seasonId: string): SeasonRound[] {
  return closedRounds(history, seasonId);
}

export interface TrajectoryStep {
  round: number;
  group: GroupId;
  position: number;
  /** false si la vuelta sigue en curso (posición provisional). */
  final: boolean;
}

/** Grupo y posición de un jugador en cada vuelta, de la primera a la última. */
export function trajectory(player: PlayerId, history: readonly RoundData[]): TrajectoryStep[] {
  return [...history]
    .sort((a, b) => a.round.numero - b.round.numero)
    .flatMap((data) => {
      for (const [group, players] of groupOrder(data)) {
        const i = players.indexOf(player);
        if (i >= 0) return [{ round: data.round.numero, group, position: i + 1, final: data.round.estado === 'cerrada' }];
      }
      return [];
    });
}

export function formatSets(match: Pick<RoundMatch, 'sets'>): string {
  return match.sets.map((set) => `${set.pair1}-${set.pair2}`).join('  ');
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export interface Category {
  name: string;
  medal: string;
  /** Sufijo de las clases CSS: gold, silver, bronze. */
  tone: string;
}

const CATEGORIES: Record<string, Category> = {
  A: { name: 'Oro', medal: '🥇', tone: 'gold' },
  B: { name: 'Plata', medal: '🥈', tone: 'silver' },
  C: { name: 'Bronce', medal: '🥉', tone: 'bronze' },
};

export function categoryOf(groupId: string): Category {
  return CATEGORIES[groupId] ?? { name: groupId, medal: '🎾', tone: 'neutral' };
}

/** Texto corto del tipo de partido: la categoría de su grupo. */
export function kindLabel(kind: string): string {
  return categoryOf(kind).name;
}

export interface RoundProgress {
  weeks: { week: number; complete: boolean }[];
  /** Primera semana con partidos sin jugar; null si la vuelta está completa. */
  currentWeek: number | null;
  played: number;
  total: number;
}

export function roundProgress(matches: readonly RoundMatch[]): RoundProgress {
  const weekNumbers = [...new Set(matches.map((m) => m.week))].sort((a, b) => a - b);
  const weeks = weekNumbers.map((week) => ({
    week,
    complete: matches.filter((m) => m.week === week).every((m) => m.estado === 'jugado'),
  }));
  return {
    weeks,
    currentWeek: weeks.find((w) => !w.complete)?.week ?? null,
    played: matches.filter((m) => m.estado === 'jugado').length,
    total: matches.length,
  };
}

export function groupMatches(groupId: string, matches: readonly RoundMatch[]): RoundMatch[] {
  return matches.filter((m) => m.kind === groupId);
}

/** Últimos partidos con resultado, del más reciente al más antiguo. */
export function latestResults(matches: readonly RoundMatch[], limit: number): RoundMatch[] {
  return matches
    .filter((m) => m.estado === 'jugado' && validateSets(m.sets) === null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}
