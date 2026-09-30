import { chronological } from './history';
import { scoreMatch } from './scoring';
import type { HistoryMatch, PlayerId } from './types';

/** Mínimo de partidos juntos (o enfrentados) para contar como mejor compañero o bestia negra. */
export const MIN_SHARED_MATCHES = 2;

export interface HeadToHead {
  player: PlayerId;
  played: number;
  won: number;
}

export interface PlayerStats {
  played: number;
  won: number;
  lost: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  tiebreaksPlayed: number;
  tiebreaksWon: number;
  /** Partidos ganados después de perder el primer set. */
  comebacks: number;
  /** Racha actual: victorias (won) o derrotas seguidas. */
  streak: { won: boolean; count: number } | null;
  bestWinStreak: number;
  partners: HeadToHead[];
  opponents: HeadToHead[];
  bestPartner: HeadToHead | null;
  /** Rival contra el que peor le va. */
  nemesis: HeadToHead | null;
}

export function playerStats(player: PlayerId, matches: readonly HistoryMatch[]): PlayerStats {
  const stats: PlayerStats = {
    played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0, gamesWon: 0, gamesLost: 0,
    tiebreaksPlayed: 0, tiebreaksWon: 0, comebacks: 0, streak: null, bestWinStreak: 0,
    partners: [], opponents: [], bestPartner: null, nemesis: null,
  };
  const partners = new Map<PlayerId, HeadToHead>();
  const opponents = new Map<PlayerId, HeadToHead>();
  const tally = (map: Map<PlayerId, HeadToHead>, other: PlayerId, won: boolean) => {
    const entry = map.get(other) ?? { player: other, played: 0, won: 0 };
    entry.played += 1;
    entry.won += won ? 1 : 0;
    map.set(other, entry);
  };
  let winStreak = 0;

  for (const match of chronological(matches)) {
    const side = match.pair1.includes(player) ? 1 : match.pair2.includes(player) ? 2 : 0;
    if (side === 0) continue;
    const outcome = scoreMatch(match.sets);
    const won = outcome.winner === side;
    const mine = (set: { pair1: number; pair2: number }) => (side === 1 ? set.pair1 : set.pair2);
    const theirs = (set: { pair1: number; pair2: number }) => (side === 1 ? set.pair2 : set.pair1);

    stats.played += 1;
    stats.won += won ? 1 : 0;
    stats.lost += won ? 0 : 1;
    for (const set of match.sets) {
      stats.setsWon += mine(set) > theirs(set) ? 1 : 0;
      stats.setsLost += mine(set) < theirs(set) ? 1 : 0;
      stats.gamesWon += mine(set);
      stats.gamesLost += theirs(set);
      if (Math.max(set.pair1, set.pair2) === 7 && Math.min(set.pair1, set.pair2) === 6) {
        stats.tiebreaksPlayed += 1;
        stats.tiebreaksWon += mine(set) > theirs(set) ? 1 : 0;
      }
    }
    if (won && mine(match.sets[0]) < theirs(match.sets[0])) stats.comebacks += 1;

    stats.streak = stats.streak && stats.streak.won === won ? { won, count: stats.streak.count + 1 } : { won, count: 1 };
    winStreak = won ? winStreak + 1 : 0;
    stats.bestWinStreak = Math.max(stats.bestWinStreak, winStreak);

    const [own, other] = side === 1 ? [match.pair1, match.pair2] : [match.pair2, match.pair1];
    tally(partners, own[0] === player ? own[1] : own[0], won);
    for (const rival of other) tally(opponents, rival, won);
  }

  const byPlayed = (a: HeadToHead, b: HeadToHead) => b.played - a.played || b.won - a.won;
  stats.partners = [...partners.values()].sort(byPlayed);
  stats.opponents = [...opponents.values()].sort(byPlayed);

  const ratio = (h: HeadToHead) => h.won / h.played;
  stats.bestPartner =
    stats.partners
      .filter((p) => p.played >= MIN_SHARED_MATCHES && p.won > 0)
      .sort((a, b) => ratio(b) - ratio(a) || b.played - a.played)[0] ?? null;
  stats.nemesis =
    stats.opponents
      .filter((o) => o.played >= MIN_SHARED_MATCHES && o.won < o.played)
      .sort((a, b) => ratio(a) - ratio(b) || b.played - a.played)[0] ?? null;
  return stats;
}
