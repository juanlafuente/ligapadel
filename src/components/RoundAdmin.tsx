import { useEffect, useMemo, useState } from 'react';
import { generateRound, planRound } from '../domain/schedule';
import { MatchCard } from './MatchCard';
import type { Group, ScheduledMatch } from '../domain/types';
import { createRound, fetchRoundData, setRoundState, type RoundData } from '../lib/db';
import { errorMessage, GROUP_IDS, proposeNextGroups } from '../lib/league';
import type { League } from '../lib/useLeague';

/** Cierre de la vuelta en curso o creación de la siguiente. */
export function RoundAdmin({ league }: { league: League }) {
  const current = league.rounds.find((r) => r.estado === 'en_curso');
  const last = league.rounds[0];
  const [data, setData] = useState<RoundData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Datos de la vuelta en curso (para cerrarla) o de la última cerrada (para proponer grupos).
  const reference = current ?? (last?.estado === 'cerrada' ? last : undefined);
  useEffect(() => {
    setData(null);
    if (!reference) return;
    let cancelled = false;
    fetchRoundData(reference)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(errorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, [reference]);

  if (error) return <p className="error">{error}</p>;
  if (reference && !data) return <p className="muted">Cargando vuelta…</p>;
  if (current && data) return <CloseRound data={data} league={league} />;
  return <NewRound league={league} previous={data} />;
}

function CloseRound({ data, league }: { data: RoundData; league: League }) {
  const [error, setError] = useState<string | null>(null);
  const pending = data.matches.filter((m) => m.estado !== 'jugado').length;
  const next = proposeNextGroups(data);
  const moves = next.flatMap((group) =>
    group.players
      .filter((p) => !data.groups.find((g) => g.id === group.id)!.players.includes(p))
      .map((p) => {
        const from = data.groups.find((g) => g.players.includes(p))!.id;
        return { player: p, from, to: group.id, up: group.id < from };
      }),
  );

  const close = async () => {
    const warning = pending > 0 ? `\n\nOjo: quedan ${pending} partidos sin resultado y no contarán.` : '';
    if (!window.confirm(`¿Cerrar la vuelta ${data.round.numero}? Ya no se podrán cambiar sus resultados.${warning}`)) return;
    try {
      await setRoundState(data.round.id, 'cerrada');
      await league.refresh(data.round.id);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <section className="card">
      <h2>Vuelta {data.round.numero} en curso</h2>
      <p>
        {data.matches.length - pending} de {data.matches.length} partidos jugados.
      </p>
      <p className="muted">Si se cerrara ahora:</p>
      <ul className="moves">
        {moves
          .sort((a, b) => Number(b.up) - Number(a.up) || a.from.localeCompare(b.from))
          .map((m) => (
            <li key={m.player}>
              <span className={`arrow ${m.up ? 'up' : 'down'}`}>{m.up ? '▲' : '▼'}</span> {league.nameOf(m.player)}: {m.from} → {m.to}
            </li>
          ))}
      </ul>
      {error && <p className="error">{error}</p>}
      <button className="primary" onClick={close}>
        Cerrar vuelta
      </button>
    </section>
  );
}

function NewRound({ league, previous }: { league: League; previous: RoundData | null }) {
  const numero = (league.rounds[0]?.numero ?? 0) + 1;
  const active = league.players.filter((p) => p.activo);

  const proposal = useMemo(() => {
    if (!previous) return {};
    return Object.fromEntries(proposeNextGroups(previous).flatMap((g) => g.players.map((p) => [p, g.id])));
  }, [previous]);
  const [assign, setAssign] = useState<Record<string, string>>(proposal);
  useEffect(() => setAssign(proposal), [proposal]);

  const [preview, setPreview] = useState<ScheduledMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const groups: Group[] = GROUP_IDS.map((id) => ({ id, players: active.filter((p) => assign[p.id] === id).map((p) => p.id) }));
  const unassigned = active.filter((p) => !GROUP_IDS.includes(assign[p.id]));
  let planError: string | null = null;
  try {
    planRound(groups);
  } catch (e) {
    planError = errorMessage(e);
  }

  const choose = (playerId: string, group: string) => {
    setAssign((current) => ({ ...current, [playerId]: group }));
    setPreview(null);
  };

  const generate = () => {
    setError(null);
    try {
      setPreview(generateRound(groups));
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const save = async () => {
    if (!preview) return;
    setSaving(true);
    setError(null);
    try {
      const id = await createRound(numero, groups, preview);
      await league.refresh(id);
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  if (active.length === 0) {
    return (
      <section className="card">
        <h2>Nueva vuelta</h2>
        <p className="muted">Primero da de alta a los jugadores.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Nueva vuelta: {numero}</h2>
      <p className="muted">
        {previous
          ? `Grupos propuestos según la vuelta ${previous.round.numero} (sube 1 y baja 1). Puedes ajustarlos.`
          : 'Reparte los jugadores en los grupos. Cada grupo debe tener 4 o 5 jugadores.'}
      </p>
      <div className="groupCounts">
        {groups.map((g) => (
          <span key={g.id}>
            {g.id}: <strong>{g.players.length}</strong>
          </span>
        ))}
        {unassigned.length > 0 && <span>Sin grupo: {unassigned.length}</span>}
      </div>
      <ul className="assignList">
        {active.map((p) => (
          <li key={p.id}>
            <span>{p.nombre}</span>
            <span className="segmented" role="group" aria-label={`Grupo de ${p.nombre}`}>
              {[...GROUP_IDS, ''].map((g) => (
                <button key={g || 'none'} className={assign[p.id] === g || (!g && !assign[p.id]) ? 'selected' : undefined} onClick={() => choose(p.id, g)}>
                  {g || '—'}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>
      {planError && <p className="warn">{planError}</p>}
      {error && <p className="error">{error}</p>}
      <div className="buttons">
        <button className="primary" onClick={generate} disabled={planError !== null}>
          {preview ? 'Volver a generar' : 'Generar calendario'}
        </button>
      </div>

      {preview && (
        <>
          <h3>Vista previa</h3>
          {[...new Set(preview.map((m) => m.week))].map((week) => (
            <div key={week} className="previewWeek">
              <h4 className="sectionTitle">Semana {week}</h4>
              {preview
                .filter((m) => m.week === week)
                .map((m, i) => (
                  <MatchCard key={i} match={{ ...m, id: String(i), estado: 'pendiente', sets: [], updatedAt: '' }} nameOf={league.nameOf} />
                ))}
            </div>
          ))}
          <div className="buttons">
            <button className="primary" onClick={save} disabled={saving}>
              Guardar vuelta {numero}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
