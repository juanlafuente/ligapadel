import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchHistory, fetchPlayers, fetchRounds, fetchSeasons, type Player, type Round, type RoundData, type Season } from './db';
import { errorMessage } from './league';
import { supabase } from './supabase';

export interface League {
  loading: boolean;
  error: string | null;
  players: Player[];
  /** Ordenadas de la más reciente a la más antigua. */
  seasons: Season[];
  /** Ordenadas de la más reciente a la más antigua. */
  rounds: Round[];
  /** Datos de todas las vueltas, en el mismo orden que `rounds`. */
  history: RoundData[];
  selectedRoundId: string | null;
  selectRound: (id: string) => void;
  roundData: RoundData | null;
  nameOf: (playerId: string) => string;
  /** Recarga todo; si se indica una vuelta, la deja seleccionada. */
  refresh: (roundId?: string) => Promise<void>;
}

export function useLeague(): League {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [history, setHistory] = useState<RoundData[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);

  const refresh = useCallback(async (roundId?: string) => {
    if (!supabase) return;
    try {
      setError(null);
      const [nextPlayers, nextSeasons, nextRounds] = await Promise.all([fetchPlayers(), fetchSeasons(), fetchRounds()]);
      const nextHistory = await fetchHistory(nextRounds);
      setPlayers(nextPlayers);
      setSeasons(nextSeasons);
      setRounds(nextRounds);
      setHistory(nextHistory);
      setSelectedRoundId((current) => {
        const wanted = roundId ?? current;
        if (wanted && nextRounds.some((round) => round.id === wanted)) return wanted;
        return (nextRounds.find((round) => round.estado === 'en_curso') ?? nextRounds[0])?.id ?? null;
      });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const roundData = useMemo(() => history.find((data) => data.round.id === selectedRoundId) ?? null, [history, selectedRoundId]);

  const nameOf = useCallback(
    (playerId: string) => players.find((player) => player.id === playerId)?.nombre ?? '¿?',
    [players],
  );

  return {
    loading,
    error,
    players,
    seasons,
    rounds,
    history,
    selectedRoundId,
    selectRound: setSelectedRoundId,
    roundData,
    nameOf,
    refresh,
  };
}
