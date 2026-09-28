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
