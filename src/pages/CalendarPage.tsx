import { useState } from 'react';
import { MatchEditor } from '../components/MatchEditor';
import { Modal } from '../components/Modal';
import { ResultForm } from '../components/ResultForm';
import { scoreMatch } from '../domain/scoring';
import type { Player, RoundData, RoundMatch } from '../lib/db';
import { formatSets } from '../lib/league';

interface Props {
  data: RoundData | null;
  players: Player[];
  nameOf: (id: string) => string;
  isAdmin: boolean;
  onChanged: () => Promise<void>;
}

export function CalendarPage({ data, players, nameOf, isAdmin, onChanged }: Props) {
  const [editing, setEditing] = useState<{ match: RoundMatch; mode: 'result' | 'edit' } | null>(null);
  if (!data) return <p className="empty">Todavía no hay ninguna vuelta. Créala desde Admin.</p>;

  const editable = isAdmin && data.round.estado !== 'cerrada';
  const weeks = [...new Set(data.matches.map((m) => m.week))].sort((a, b) => a - b);
  const roundPlayers = data.groups.flatMap((g) => g.players);

  const close = () => setEditing(null);
  const done = async () => {
    close();
    await onChanged();
  };

  return (
    <>
      {weeks.map((week) => {
        const matches = data.matches.filter((m) => m.week === week);
        const playing = new Set(matches.flatMap((m) => [...m.pair1, ...m.pair2]));
        const resting = roundPlayers.filter((p) => !playing.has(p));
        return (
          <section className="card" key={week}>
            <h2>Semana {week}</h2>
            {matches.map((match) => (
              <MatchRow
                key={match.id}
                match={match}
                nameOf={nameOf}
                editable={editable}
                onResult={() => setEditing({ match, mode: 'result' })}
                onEdit={() => setEditing({ match, mode: 'edit' })}
              />
            ))}
            {resting.length > 0 && <p className="rest">Descansan: {resting.map(nameOf).join(', ')}</p>}
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

function MatchRow({ match, nameOf, editable, onResult, onEdit }: {
  match: RoundMatch;
  nameOf: (id: string) => string;
  editable: boolean;
  onResult: () => void;
  onEdit: () => void;
}) {
  const winner = match.estado === 'jugado' && match.sets.length > 0 ? safeWinner(match) : null;
  return (
    <div className="match">
      <span className="kind">{match.kind}</span>
      <div className="pairs">
        <span className={winner === 1 ? 'winner' : undefined}>{match.pair1.map(nameOf).join(' / ')}</span>
        <em>vs</em>
        <span className={winner === 2 ? 'winner' : undefined}>{match.pair2.map(nameOf).join(' / ')}</span>
      </div>
      <span className={`status status-${match.estado}`}>
        {match.estado === 'jugado' ? formatSets(match) : match.estado === 'aplazado' ? 'Aplazado' : 'Pendiente'}
      </span>
      {editable && (
        <span className="actions">
          <button onClick={onResult}>Resultado</button>
          <button className="ghost" onClick={onEdit}>
            Editar
          </button>
        </span>
      )}
    </div>
  );
}

function safeWinner(match: RoundMatch): 1 | 2 | null {
  try {
    return scoreMatch(match.sets).winner;
  } catch {
    return null;
  }
}
