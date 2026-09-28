import { nextGroups } from '../domain/promotion';
import { validateSets } from '../domain/scoring';
import { groupStandings, type PlayedMatch, type StandingRow } from '../domain/standings';
import type { Group, GroupId } from '../domain/types';
import type { RoundData, RoundMatch } from './db';

export const GROUP_IDS: GroupId[] = ['A', 'B', 'C'];

/** Partidos con resultado válido, que son los que cuentan para la clasificación. */
export function playedMatches(matches: readonly RoundMatch[]): PlayedMatch[] {
  return matches.filter((match) => match.estado === 'jugado' && validateSets(match.sets) === null);
}

export function roundStandings(data: Pick<RoundData, 'groups' | 'matches'>): Map<GroupId, StandingRow[]> {
  const played = playedMatches(data.matches);
  return new Map(data.groups.map((group) => [group.id, groupStandings(group.players, played)]));
}

/** Grupos de la siguiente vuelta aplicando 1 ascenso y 1 descenso. */
export function proposeNextGroups(data: Pick<RoundData, 'groups' | 'matches'>): Group[] {
  const standings = roundStandings(data);
  const ranking = new Map([...standings].map(([id, rows]) => [id, rows.map((row) => row.player)]));
  return nextGroups(data.groups, ranking);
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

/** Texto corto del tipo de partido: la categoría si es interno, «Cruzado» si mezcla dos grupos. */
export function kindLabel(kind: string): string {
  return kind.length === 1 ? categoryOf(kind).name : 'Cruzado';
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

/** Partidos en los que participa algún jugador del grupo (internos y cruzados). */
export function groupMatches(groupId: string, matches: readonly RoundMatch[]): RoundMatch[] {
  return matches.filter((m) => m.kind.includes(groupId));
}

/** Últimos partidos con resultado, del más reciente al más antiguo. */
export function latestResults(matches: readonly RoundMatch[], limit: number): RoundMatch[] {
  return matches
    .filter((m) => m.estado === 'jugado' && validateSets(m.sets) === null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}
