import type { Group, PlayerId } from './types';

/**
 * Grupos de la siguiente vuelta. `ranking` tiene los jugadores de cada grupo
 * ordenados por clasificación final; los grupos van ordenados de mayor a menor nivel.
 * Los `moves` primeros de cada grupo suben y los `moves` últimos bajan.
 */
export function nextGroups(groups: readonly Group[], ranking: ReadonlyMap<string, readonly PlayerId[]>, moves = 1): Group[] {
  const ordered = groups.map((group) => {
    const players = ranking.get(group.id);
    if (!players || players.length !== group.players.length || !group.players.every((p) => players.includes(p))) {
      throw new Error(`La clasificación del grupo ${group.id} no coincide con sus jugadores.`);
    }
    if (players.length < 2 * moves) throw new Error(`El grupo ${group.id} es demasiado pequeño para ${moves} ascensos y descensos.`);
    return players;
  });

  return groups.map((group, i) => {
    const current = ordered[i];
    const isTop = i === 0;
    const isBottom = i === groups.length - 1;
    const stay = current.slice(isTop ? 0 : moves, isBottom ? current.length : current.length - moves);
    const relegated = isTop ? [] : ordered[i - 1].slice(-moves);
    const promoted = isBottom ? [] : ordered[i + 1].slice(0, moves);
    return { id: group.id, players: [...relegated, ...stay, ...promoted] };
  });
}
