import { useMemo, useState } from 'react';
import { generateRound } from './domain/schedule';
import type { Group, ScheduledMatch } from './domain/types';
import { validateSchedule } from './domain/validation';

const GROUP_IDS = ['A', 'B', 'C'];
const DEFAULT_PLAYERS = GROUP_IDS.map((_, g) => Array.from({ length: 4 }, (_, i) => `Jugador ${g * 4 + i + 1}`).join('\n'));

/** Pantalla provisional para probar el generador de calendario sin base de datos. */
export function App() {
  const [texts, setTexts] = useState(DEFAULT_PLAYERS);
  const [matches, setMatches] = useState<ScheduledMatch[]>([]);
  const [error, setError] = useState<string | null>(null);

  const groups: Group[] = useMemo(
    () =>
      GROUP_IDS.map((id, i) => ({
        id,
        players: texts[i].split('\n').map((name) => name.trim()).filter(Boolean),
      })),
    [texts],
  );

  const issues = useMemo(() => (matches.length ? validateSchedule(groups, matches) : []), [groups, matches]);
  const weeks = [...new Set(matches.map((m) => m.week))].sort((a, b) => a - b);

  const generate = () => {
    try {
      setMatches(generateRound(groups));
      setError(null);
    } catch (e) {
      setMatches([]);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const moveMatch = (index: number, week: number) =>
    setMatches((current) => current.map((m, i) => (i === index ? { ...m, week } : m)));

  const resting = (week: number) => {
    const playing = new Set(matches.filter((m) => m.week === week).flatMap((m) => [...m.pair1, ...m.pair2]));
    return groups.flatMap((g) => g.players).filter((p) => !playing.has(p));
  };

  return (
    <main className="app">
      <header className="header">
        <h1>Liga de Pádel</h1>
        <p>Generador de calendario (prueba local)</p>
      </header>

      <section className="card">
        <h2>Grupos</h2>
        <p className="hint">Un jugador por línea. Cada grupo debe tener 4 o 5 jugadores.</p>
        <div className="groups">
          {GROUP_IDS.map((id, i) => (
            <label key={id} className="group">
              <span>
                Grupo {id} <small>({groups[i].players.length})</small>
              </span>
              <textarea
                rows={5}
                value={texts[i]}
                onChange={(e) => setTexts((current) => current.map((t, j) => (j === i ? e.target.value : t)))}
              />
            </label>
          ))}
        </div>
        <button className="primary" onClick={generate}>
          Generar calendario
        </button>
        {error && <p className="error">{error}</p>}
      </section>

      {matches.length > 0 && (
        <section className="card">
          <h2>Calendario</h2>
          {issues.length === 0 ? (
            <p className="ok">✓ Sin parejas repetidas, 4 partidos por jugador y 1 por semana.</p>
          ) : (
            <ul className="issues">
              {issues.map((issue, i) => (
                <li key={i}>⚠️ {issue.message}</li>
              ))}
            </ul>
          )}
          {weeks.map((week) => (
            <div key={week} className="week">
              <h3>Semana {week}</h3>
              {matches.map((m, index) =>
                m.week !== week ? null : (
                  <div key={index} className="match">
                    <span className={`kind kind-${m.kind}`}>{m.kind}</span>
                    <span className="pairs">
                      {m.pair1.join(' / ')} <em>vs</em> {m.pair2.join(' / ')}
                    </span>
                    <select value={m.week} onChange={(e) => moveMatch(index, Number(e.target.value))} aria-label="Mover a semana">
                      {Array.from({ length: Math.max(...weeks) + 1 }, (_, w) => w + 1).map((w) => (
                        <option key={w} value={w}>
                          Sem. {w}
                        </option>
                      ))}
                    </select>
                  </div>
                ),
              )}
              {resting(week).length > 0 && <p className="rest">Descansan: {resting(week).join(', ')}</p>}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
