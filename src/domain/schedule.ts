import { shuffle, type Rng } from './rng';
import type { Group, Pair, PlayerId, ScheduledMatch } from './types';

export const GROUP_SIZE = 4;
export const MATCHES_PER_PLAYER = 3;
/** Semanas con partido: 1, 2 y 3. */
export const PLAY_WEEKS = 3;
/** Semana extra al final de la vuelta para recuperar partidos aplazados. */
export const RECOVERY_WEEK = PLAY_WEEKS + 1;

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
 * posibles sin repetir pareja, uno por semana en las semanas 1, 2 y 3. La semana 4
 * queda libre para recuperar aplazados.
 */
export function generateRound(groups: readonly Group[], options: { rng?: Rng } = {}): ScheduledMatch[] {
  const error = checkGroups(groups);
  if (error) throw new Error(error);
  const rng = options.rng ?? Math.random;

  return groups
    .flatMap((group) => {
      const pairings = shuffle(pairingsOf(shuffle(group.players, rng)), rng);
      return pairings.map(([pair1, pair2], i) => ({ week: i + 1, kind: group.id, pair1, pair2 }));
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
