import { shuffle, type Rng } from './rng';
import type { Group, Pair, PlayerId, ScheduledMatch } from './types';

export const GROUP_SIZE = 4;
export const MATCHES_PER_PLAYER = 3;
export const WEEKS_PER_ROUND = 4;

/** Devuelve un mensaje si los grupos no sirven para generar una vuelta, o null si están bien. */
export function checkGroups(groups: readonly Group[]): string | null {
  if (groups.length === 0) return 'Hace falta al menos un grupo.';
  const wrong = groups.find((group) => group.players.length !== GROUP_SIZE);
  if (wrong) return `El grupo ${wrong.id} tiene ${wrong.players.length} jugadores; cada grupo debe tener ${GROUP_SIZE}.`;
  const allPlayers = groups.flatMap((group) => group.players);
  if (new Set(allPlayers).size !== allPlayers.length) return 'Hay jugadores repetidos entre grupos.';
  return null;
}

/**
 * Genera los partidos de una vuelta: en cada grupo de 4 se juegan los 3 partidos
 * posibles sin repetir pareja, uno por semana durante 4 semanas. Cada grupo descansa
 * una semana distinta (sorteada), así nunca coinciden todos los grupos descansando.
 */
export function generateRound(groups: readonly Group[], options: { rng?: Rng } = {}): ScheduledMatch[] {
  const error = checkGroups(groups);
  if (error) throw new Error(error);
  const rng = options.rng ?? Math.random;

  const weeks = Array.from({ length: WEEKS_PER_ROUND }, (_, i) => i + 1);
  const restWeeks = shuffle(weeks, rng);

  return groups
    .flatMap((group, g) => {
      const rest = restWeeks[g % WEEKS_PER_ROUND];
      const playWeeks = weeks.filter((week) => week !== rest);
      const pairings = shuffle(pairingsOf(shuffle(group.players, rng)), rng);
      return pairings.map(([pair1, pair2], i) => ({ week: playWeeks[i], kind: group.id, pair1, pair2 }));
    })
    .sort((a, b) => a.week - b.week || a.kind.localeCompare(b.kind));
}

/** Las 3 formas de repartir 4 jugadores en dos parejas. */
function pairingsOf([a, b, c, d]: readonly PlayerId[]): [Pair, Pair][] {
  return [
    [[a, b], [c, d]],
    [[a, c], [b, d]],
    [[a, d], [b, c]],
  ];
}

export function pairKey([a, b]: Pair): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
