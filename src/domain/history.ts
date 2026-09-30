import { validateSets } from './scoring';
import type { HistoryMatch } from './types';

/** Partidos con resultado válido, del más antiguo al más reciente. */
export function chronological(matches: readonly HistoryMatch[]): HistoryMatch[] {
  return matches
    .filter((match) => validateSets(match.sets) === null)
    .sort((a, b) => a.round - b.round || a.week - b.week || a.playedAt.localeCompare(b.playedAt) || a.id.localeCompare(b.id));
}
