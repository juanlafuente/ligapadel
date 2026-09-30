import { useEffect, useMemo, useState } from 'react';
import { checkGroups, generateRound } from '../domain/schedule';
import { MatchCard } from './MatchCard';
import type { Group, ScheduledMatch } from '../domain/types';
import { closeRound, createRound, startSeason, type RoundData } from '../lib/db';
import { categoryOf, errorMessage, GROUP_IDS, groupOrder, PROMOTIONS, proposeNextGroups, roundStandings } from '../lib/league';
import type { League } from '../lib/useLeague';

/** Temporada, cierre de la vuelta en curso o creación de la siguiente. */
export function RoundAdmin({ league }: { league: League }) {
  const current = league.history.find((data) => data.round.estado === 'en_curso');
  const last = league.history[0];
  return (
    <>
      <SeasonAdmin league={league} roundInProgress={current !== undefined} />
      {current ? <CloseRound data={current} league={league} /> : <NewRound league={league} previous={last?.round.estado === 'cerrada' ? last : null} />}
    </>
  );
}

function SeasonAdmin({ league, roundInProgress }: { league: League; roundInProgress: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const season = league.seasons.find((s) => s.estado === 'en_curso');
  if (!season) {
    return (
      <section className="card">
        <h2>Temporada</h2>
        <p className="warn">No hay ninguna temporada en curso. ¿Has ejecutado el SQL 003_temporadas.sql en Supabase?</p>
      </section>
    );
  }
  const closedRounds = league.rounds.filter((r) => r.temporada_id === season.id && r.estado === 'cerrada').length;

  const start = async () => {
    if (!window.confirm(`¿Terminar la temporada ${season.numero} (${closedRounds} vueltas) y empezar la ${season.numero + 1}? El ranking de temporada vuelve a cero; el histórico se conserva.`)) return;
    setError(null);
    try {
      await startSeason();
      await league.refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <section className="card">
      <h2>Temporada {season.numero}</h2>
      <p className="muted">
        {closedRounds} {closedRounds === 1 ? 'vuelta cerrada' : 'vueltas cerradas'} en esta temporada.
        {roundInProgress && ' Cierra la vuelta en curso para poder empezar otra temporada.'}
      </p>
      {error && <p className="error">{error}</p>}
      <button className="ghost" onClick={start} disabled={roundInProgress || closedRounds === 0}>
        Empezar temporada nueva
      </button>
    </section>
  );
}

function CloseRound({ data, league }: { data: RoundData; league: League }) {
  const [error, setError] = useState<string | null>(null);
  const standings = useMemo(() => roundStandings(data), [data]);
  const [order, setOrder] = useState(() => groupOrder(data));
  useEffect(() => setOrder(groupOrder(data)), [data]);

  // Bloques de empate total: jugadores con la misma clave pueden intercambiarse (sorteo).
  const tieBlock = useMemo(() => {
    const block = new Map<string, number>();
    let n = 0;
    for (const rows of standings.values()) {
      rows.forEach((row) => {
        if (!row.tiedWithPrevious) n += 1;
        block.set(row.player, n);
      });
    }
    return block;
  }, [standings]);
  const tiedGroups = data.groups.filter((g) => {
    const blocks = g.players.map((p) => tieBlock.get(p));
    return new Set(blocks).size < blocks.length;
  });

  const pending = data.matches.filter((m) => m.estado !== 'jugado').length;
  const next = proposeNextGroups(data, order);
  const moves = next.flatMap((group) =>
    group.players
      .filter((p) => !data.groups.find((g) => g.id === group.id)!.players.includes(p))
      .map((p) => {
        const from = data.groups.find((g) => g.players.includes(p))!.id;
        return { player: p, from, to: group.id, up: group.id < from };
      }),
  );

  const swap = (groupId: string, i: number) =>
    setOrder((current) => {
      const players = [...current.get(groupId)!];
      [players[i], players[i + 1]] = [players[i + 1], players[i]];
      return new Map(current).set(groupId, players);
    });

  const close = async () => {
    const warning = pending > 0 ? `\n\nOjo: quedan ${pending} partidos sin resultado y no contarán.` : '';
    if (!window.confirm(`¿Cerrar la vuelta ${data.round.numero}? Ya no se podrán cambiar sus resultados.${warning}`)) return;
    setError(null);
    try {
      await closeRound(data.round.id, order);
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

      {tiedGroups.length > 0 && (
        <>
          <p className="warn">Hay empates totales. Ordénalos según el sorteo antes de cerrar:</p>
          {tiedGroups.map((group) => {
            const players = order.get(group.id)!;
            return (
              <div key={group.id} className="tieGroup">
                <h4 className="sectionTitle">Grupo {group.id} · {categoryOf(group.id).name}</h4>
                <ol className="tieList">
                  {players.map((p, i) => {
                    const canSwap = i < players.length - 1 && tieBlock.get(p) === tieBlock.get(players[i + 1]);
                    return (
                      <li key={p}>
                        <span>{league.nameOf(p)}</span>
                        {canSwap && (
                          <button className="ghost" onClick={() => swap(group.id, i)} aria-label={`Intercambiar con ${league.nameOf(players[i + 1])}`}>
                            ⇅
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </>
      )}

      <p className="muted">Si se cierra ahora:</p>
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
  const planError = checkGroups(groups);

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
          ? `Grupos propuestos según la vuelta ${previous.round.numero} (suben ${PROMOTIONS} y bajan ${PROMOTIONS}). Puedes ajustarlos.`
          : 'Reparte los jugadores en los grupos de 4. Cada grupo juega 3 partidos (semanas 1 a 3); la semana 4 es de recuperación.'}
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
