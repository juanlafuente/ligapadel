import { useMemo, useState } from 'react';
import { Avatar } from '../components/Brand';
import { PlayerLink } from '../components/PlayerLink';
import { computeElo, ELO_K, ELO_START, SWEEP_BONUS } from '../domain/elo';
import { medalTable } from '../domain/medals';
import { closedRounds, historyMatches } from '../lib/league';
import type { League } from '../lib/useLeague';

type Tab = 'medallero' | 'indice';

export function StatsPage({ league }: { league: League }) {
  const [tab, setTab] = useState<Tab>('medallero');
  return (
    <>
      <div className="subTabs" role="tablist">
        <button role="tab" aria-selected={tab === 'medallero'} className={tab === 'medallero' ? 'active' : undefined} onClick={() => setTab('medallero')}>
          Medallero
        </button>
        <button role="tab" aria-selected={tab === 'indice'} className={tab === 'indice' ? 'active' : undefined} onClick={() => setTab('indice')}>
          Índice Matilda
        </button>
      </div>
      {tab === 'medallero' ? <MedalTable league={league} /> : <EloRanking league={league} />}
      <p className="legend">Pulsa en un jugador para ver su ficha.</p>
    </>
  );
}

function MedalTable({ league }: { league: League }) {
  const rows = useMemo(() => medalTable(closedRounds(league.history)), [league.history]);
  const rounds = league.history.filter((d) => d.round.estado === 'cerrada').length;

  return (
    <>
      <section className="groupCard">
        <header className="groupHead tone-gold">
          <span className="medal">🏅</span>
          <strong>Medallero</strong>
          <small>
            histórico · {rounds} {rounds === 1 ? 'vuelta' : 'vueltas'}
          </small>
        </header>
        {rows.length === 0 ? (
          <p className="emptyLine inCard">El medallero arranca cuando se cierre la primera vuelta.</p>
        ) : (
          <div className="tableWrap">
            <table className="standings medalTable">
              <thead>
                <tr>
                  <th>#</th>
                  <th className="left">Jugador</th>
                  <th title="Vueltas en Oro">🥇</th>
                  <th title="Vueltas en Plata">🥈</th>
                  <th title="Vueltas en Bronce">🥉</th>
                  <th title="Veces 1º de su grupo (entre paréntesis, en Oro)">⭐</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.player}>
                    <td className="pos">
                      {row.position}
                      {row.tiedWithPrevious && <span title="Empate">=</span>}
                    </td>
                    <td className="left">
                      <PlayerLink id={row.player}>
                        <span className="playerCell">
                          <Avatar id={row.player} name={league.nameOf(row.player)} />
                          <span>{league.nameOf(row.player)}</span>
                        </span>
                      </PlayerLink>
                    </td>
                    <td className={row.gold ? 'wins' : 'zero'}>{row.gold}</td>
                    <td className={row.silver ? undefined : 'zero'}>{row.silver}</td>
                    <td className={row.bronze ? undefined : 'zero'}>{row.bronze}</td>
                    <td className={row.titles ? undefined : 'zero'}>
                      {row.titles}
                      {row.goldTitles > 0 && <small className="goldTitles"> ({row.goldTitles})</small>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="legend">
        🥇 🥈 🥉 = vueltas jugadas en Oro, Plata y Bronce. ⭐ = veces 1º de su grupo; entre paréntesis, en Oro. Orden como en las
        olimpiadas: más 🥇; a igualdad, más 🥈; luego más 🥉. Si siguen empatados, deciden los ⭐ en Oro y después la posición media.
        Solo cuentan las vueltas cerradas.
      </p>
    </>
  );
}

function EloRanking({ league }: { league: League }) {
  const { ratings, changes } = useMemo(() => computeElo(historyMatches(league.history)), [league.history]);

  const rows = league.players
    .filter((p) => p.activo || ratings.has(p.id))
    .map((p) => ({
      player: p,
      rating: ratings.get(p.id) ?? ELO_START,
      played: changes.get(p.id)?.length ?? 0,
      last: changes.get(p.id)?.at(-1)?.delta ?? null,
    }))
    .sort((a, b) => b.rating - a.rating || b.played - a.played || a.player.nombre.localeCompare(b.player.nombre));

  return (
    <>
      <section className="groupCard">
        <header className="groupHead tone-neutral">
          <span className="medal">📈</span>
          <strong>Índice Matilda</strong>
          <small>histórico</small>
        </header>
        {ratings.size === 0 ? (
          <p className="emptyLine inCard">El índice arranca con el primer resultado. Todos empiezan en {ELO_START.toLocaleString('es')}.</p>
        ) : (
          <div className="tableWrap">
            <table className="standings">
              <thead>
                <tr>
                  <th>#</th>
                  <th className="left">Jugador</th>
                  <th title="Índice Matilda">Índice</th>
                  <th title="Cambio en el último partido">Último</th>
                  <th title="Partidos jugados">PJ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.player.id}>
                    <td className="pos">{i + 1}</td>
                    <td className="left">
                      <PlayerLink id={row.player.id}>
                        <span className="playerCell">
                          <Avatar id={row.player.id} name={row.player.nombre} />
                          <span>{row.player.nombre}</span>
                        </span>
                      </PlayerLink>
                    </td>
                    <td className="wins">{Math.round(row.rating).toLocaleString('es')}</td>
                    <td>
                      <Delta value={row.last} />
                    </td>
                    <td>{row.played}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <details className="card explainer">
        <summary>¿Cómo funciona el Índice Matilda?</summary>
        <ul>
          <li>Todos empiezan en {ELO_START.toLocaleString('es')} puntos.</li>
          <li>La fuerza de cada pareja es la media del índice de sus dos jugadores.</li>
          <li>
            Antes de cada partido se calcula quién es favorito. Ganar siendo favorito suma poco; ganar siendo el débil suma mucho. Perder
            funciona al revés.
          </li>
          <li>
            Por eso cuenta tu pareja: ganar con alguien muy fuerte al lado suma menos que ganar con alguien flojo.
          </li>
          <li>
            En un partido se pueden ganar o perder como mucho {ELO_K} puntos; ganar 2-0 da un {Math.round((SWEEP_BONUS - 1) * 100)} % más.
          </li>
          <li>No se reinicia con las temporadas: mide el nivel histórico de cada uno.</li>
        </ul>
      </details>

    </>
  );
}

export function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="muted">–</span>;
  const rounded = Math.round(value);
  if (rounded === 0) return <span className="delta">±0</span>;
  return <span className={`delta ${rounded > 0 ? 'up' : 'down'}`}>{rounded > 0 ? `▲ +${rounded}` : `▼ ${rounded}`}</span>;
}
