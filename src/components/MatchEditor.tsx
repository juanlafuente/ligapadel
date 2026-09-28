import { useState } from 'react';
import { validateSchedule } from '../domain/validation';
import { updateMatch, type MatchState, type Player, type RoundData, type RoundMatch } from '../lib/db';
import { errorMessage } from '../lib/league';

interface Props {
  match: RoundMatch;
  data: RoundData;
  players: Player[];
  nameOf: (id: string) => string;
  onDone: () => void;
  onCancel: () => void;
}

const SLOT_LABELS = ['Pareja 1 · jugador 1', 'Pareja 1 · jugador 2', 'Pareja 2 · jugador 1', 'Pareja 2 · jugador 2'];

export function MatchEditor({ match, data, players, nameOf, onDone, onCancel }: Props) {
  const [week, setWeek] = useState(match.week);
  const [slots, setSlots] = useState<string[]>([...match.pair1, ...match.pair2]);
  const [estado, setEstado] = useState<MatchState>(match.estado);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasResult = match.sets.length > 0;
  const edited: RoundMatch = { ...match, week, pair1: [slots[0], slots[1]], pair2: [slots[2], slots[3]], estado };
  const index = data.matches.findIndex((m) => m.id === match.id);
  const schedule = data.matches.map((m) => (m.id === match.id ? edited : m));
  const issues = validateSchedule(data.groups, schedule, nameOf).filter((issue) => issue.matches.includes(index));
  const duplicated = new Set(slots).size !== slots.length;

  const maxWeek = Math.max(...data.matches.map((m) => m.week)) + 1;
  const roundPlayers = new Set(data.groups.flatMap((g) => g.players));
  const substitutes = players.filter((p) => p.activo && !roundPlayers.has(p.id));
  const busyThatWeek = new Set(schedule.filter((m) => m.week === week && m.id !== match.id).flatMap((m) => [...m.pair1, ...m.pair2]));
  const freeThatWeek = [...roundPlayers].filter((p) => !busyThatWeek.has(p) && !slots.includes(p));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateMatch(edited);
      onDone();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  return (
    <div className="form">
      <label>
        Semana
        <select value={week} onChange={(e) => setWeek(Number(e.target.value))}>
          {Array.from({ length: maxWeek }, (_, i) => i + 1).map((w) => (
            <option key={w} value={w}>
              Semana {w}
            </option>
          ))}
        </select>
      </label>

      {slots.map((player, i) => (
        <label key={i}>
          {SLOT_LABELS[i]}
          <select value={player} onChange={(e) => setSlots((current) => current.map((p, j) => (j === i ? e.target.value : p)))}>
            {data.groups.map((group) => (
              <optgroup key={group.id} label={`Grupo ${group.id}`}>
                {group.players.map((id) => (
                  <option key={id} value={id}>
                    {nameOf(id)}
                  </option>
                ))}
              </optgroup>
            ))}
            {substitutes.length > 0 && (
              <optgroup label="Suplentes">
                {substitutes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
      ))}

      {!hasResult && (
        <label>
          Estado
          <select value={estado} onChange={(e) => setEstado(e.target.value as MatchState)}>
            <option value="pendiente">Pendiente</option>
            <option value="aplazado">Aplazado</option>
          </select>
        </label>
      )}

      <p className="muted">Libres en la semana {week}: {freeThatWeek.length ? freeThatWeek.map(nameOf).join(', ') : 'nadie'}</p>

      {issues.length > 0 && (
        <ul className="issues">
          {issues.map((issue, i) => (
            <li key={i}>⚠️ {issue.message}</li>
          ))}
        </ul>
      )}
      {issues.length > 0 && !duplicated && <p className="muted">Puedes guardar igualmente si es un cambio puntual.</p>}
      {error && <p className="error">{error}</p>}

      <div className="buttons">
        <button className="primary" onClick={save} disabled={saving || duplicated}>
          Guardar
        </button>
        <button className="ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
