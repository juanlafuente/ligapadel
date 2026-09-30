import { useMemo } from 'react';
import { Avatar } from '../components/Brand';
import { PlayerLink } from '../components/PlayerLink';
import { computeElo, ELO_K, ELO_START, SWEEP_BONUS } from '../domain/elo';
import { historyMatches } from '../lib/league';
import type { League } from '../lib/useLeague';

export function StatsPage({ league }: { league: League }) {
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

      <p className="legend">Pulsa en un jugador para ver su ficha.</p>
    </>
  );
}

export function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="muted">–</span>;
  const rounded = Math.round(value);
  if (rounded === 0) return <span className="delta">±0</span>;
  return <span className={`delta ${rounded > 0 ? 'up' : 'down'}`}>{rounded > 0 ? `▲ +${rounded}` : `▼ ${rounded}`}</span>;
}
