import { useState } from 'react';
import { MatchCard } from '../components/MatchCard';
import { MatchEditor } from '../components/MatchEditor';
import { Modal } from '../components/Modal';
import { ResultForm } from '../components/ResultForm';
import type { Player, RoundData, RoundMatch } from '../lib/db';
import { roundProgress } from '../lib/league';
import { EmptyRound } from './StandingsPage';

interface Props {
  data: RoundData | null;
  players: Player[];
  nameOf: (id: string) => string;
  isAdmin: boolean;
  onChanged: () => Promise<void>;
}

export function CalendarPage({ data, players, nameOf, isAdmin, onChanged }: Props) {
  const [editing, setEditing] = useState<{ match: RoundMatch; mode: 'result' | 'edit' } | null>(null);
  if (!data) return <EmptyRound />;

  const editable = isAdmin && data.round.estado !== 'cerrada';
  const progress = roundProgress(data.matches);
  const roundPlayers = data.groups.flatMap((g) => g.players);

  const close = () => setEditing(null);
  const done = async () => {
    close();
    await onChanged();
  };

  return (
    <>
      {progress.weeks.map(({ week, complete }) => {
        const matches = data.matches.filter((m) => m.week === week);
        const playing = new Set(matches.flatMap((m) => [...m.pair1, ...m.pair2]));
        const resting = roundPlayers.filter((p) => !playing.has(p));
        return (
          <section className="section" key={week}>
            <h2 className="sectionTitle">
              Semana {week}
              <span className="weekState">{complete ? '✓ completa' : week === progress.currentWeek ? 'esta semana' : ''}</span>
            </h2>
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} nameOf={nameOf}>
                {editable && (
                  <>
                    <button onClick={() => setEditing({ match, mode: 'result' })}>Resultado</button>
                    <button className="ghost" onClick={() => setEditing({ match, mode: 'edit' })}>
                      Editar
                    </button>
                  </>
                )}
              </MatchCard>
            ))}
            {resting.length > 0 && <p className="rest">😴 Descansan: {resting.map(nameOf).join(', ')}</p>}
          </section>
        );
      })}

      {editing?.mode === 'result' && (
        <Modal title="Resultado" onClose={close}>
          <ResultForm match={editing.match} nameOf={nameOf} onDone={done} onCancel={close} />
        </Modal>
      )}
      {editing?.mode === 'edit' && (
        <Modal title="Editar partido" onClose={close}>
          <MatchEditor match={editing.match} data={data} players={players} nameOf={nameOf} onDone={done} onCancel={close} />
        </Modal>
      )}
    </>
  );
}
