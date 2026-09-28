import { useState } from 'react';
import { scoreMatch, validateSets } from '../domain/scoring';
import { saveResult, type RoundMatch } from '../lib/db';
import { errorMessage } from '../lib/league';

interface Props {
  match: RoundMatch;
  nameOf: (id: string) => string;
  onDone: () => void;
  onCancel: () => void;
}

export function ResultForm({ match, nameOf, onDone, onCancel }: Props) {
  const [values, setValues] = useState(() =>
    [0, 1, 2].map((i) => [String(match.sets[i]?.pair1 ?? ''), String(match.sets[i]?.pair2 ?? '')]),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filled = values.filter(([a, b]) => a !== '' && b !== '');
  const sets = filled.map(([a, b]) => ({ pair1: Number(a), pair2: Number(b) }));
  const halfFilled = values.some(([a, b]) => (a === '') !== (b === ''));
  const problem = halfFilled ? 'Hay un set a medias.' : validateSets(sets);
  const outcome = problem ? null : scoreMatch(sets);

  const set = (row: number, col: number, value: string) =>
    setValues((current) => current.map((r, i) => (i === row ? r.map((v, j) => (j === col ? value.replace(/\D/g, '') : v)) : r)));

  const run = async (next: typeof sets) => {
    setSaving(true);
    setError(null);
    try {
      await saveResult(match.id, next);
      onDone();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  const pairName = (pair: readonly string[]) => pair.map(nameOf).join(' / ');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!problem) void run(sets);
      }}
    >
      <table className="setsTable">
        <thead>
          <tr>
            <th className="left">Pareja</th>
            <th>Set 1</th>
            <th>Set 2</th>
            <th>Set 3</th>
          </tr>
        </thead>
        <tbody>
          {[match.pair1, match.pair2].map((pair, col) => (
            <tr key={col}>
              <td className="left">{pairName(pair)}</td>
              {values.map((row, i) => (
                <td key={i}>
                  <input
                    inputMode="numeric"
                    maxLength={1}
                    value={row[col]}
                    onChange={(e) => set(i, col, e.target.value)}
                    aria-label={`Set ${i + 1}, ${pairName(pair)}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {sets.length > 0 && problem && <p className="warn">{problem}</p>}
      {outcome && (
        <p className="ok">
          Gana {pairName(outcome.winner === 1 ? match.pair1 : match.pair2)} por {Math.max(outcome.setsPair1, outcome.setsPair2)}-
          {Math.min(outcome.setsPair1, outcome.setsPair2)} en sets.
        </p>
      )}
      {error && <p className="error">{error}</p>}

      <div className="buttons">
        <button type="submit" className="primary" disabled={saving || problem !== null}>
          Guardar
        </button>
        <button type="button" className="ghost" onClick={onCancel}>
          Cancelar
        </button>
        {match.sets.length > 0 && (
          <button
            type="button"
            className="danger"
            disabled={saving}
            onClick={() => window.confirm('¿Borrar el resultado de este partido?') && void run([])}
          >
            Borrar resultado
          </button>
        )}
      </div>
    </form>
  );
}
