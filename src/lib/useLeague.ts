import { useCallback, useEffect, useState } from 'react';
import { fetchPlayers, fetchRoundData, fetchRounds, type Player, type Round, type RoundData } from './db';
import { errorMessage } from './league';
import { supabase } from './supabase';

export interface League {
  loading: boolean;
  error: string | null;
  players: Player[];
  /** Ordenadas de la más reciente a la más antigua. */
  rounds: Round[];
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
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [roundData, setRoundData] = useState<RoundData | null>(null);

  const refresh = useCallback(async (roundId?: string) => {
    if (!supabase) return;
    try {
      setError(null);
      const [nextPlayers, nextRounds] = await Promise.all([fetchPlayers(), fetchRounds()]);
      setPlayers(nextPlayers);
      setRounds(nextRounds);
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

  useEffect(() => {
    const round = rounds.find((r) => r.id === selectedRoundId);
    if (!round) {
      setRoundData(null);
      return;
    }
    let cancelled = false;
    fetchRoundData(round)
      .then((data) => !cancelled && setRoundData(data))
      .catch((e) => !cancelled && setError(errorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, [rounds, selectedRoundId]);

  const nameOf = useCallback(
    (playerId: string) => players.find((player) => player.id === playerId)?.nombre ?? '¿?',
    [players],
  );

  return { loading, error, players, rounds, selectedRoundId, selectRound: setSelectedRoundId, roundData, nameOf, refresh };
}
