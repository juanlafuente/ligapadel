import type { RoundData } from '../lib/db';
import { roundStandings } from '../lib/league';

export function StandingsPage({ data, nameOf }: { data: RoundData | null; nameOf: (id: string) => string }) {
  if (!data) return <p className="empty">Todavía no hay ninguna vuelta. Créala desde Admin.</p>;

  const standings = roundStandings(data);
  const played = data.matches.filter((m) => m.estado === 'jugado').length;
  const last = data.groups.length - 1;
  const anyTie = [...standings.values()].some((rows) => rows.some((row) => row.tiedWithPrevious && row.played > 0));

  return (
    <>
      <p className="muted">
        Vuelta {data.round.numero} · {played} de {data.matches.length} partidos jugados
      </p>
      {data.groups.map((group, g) => (
        <section className="card" key={group.id}>
          <h2>Grupo {group.id}</h2>
          <div className="tableWrap">
            <table className="standings">
              <thead>
                <tr>
                  <th>#</th>
                  <th className="left">Jugador</th>
                  <th title="Partidos jugados">PJ</th>
                  <th title="Victorias">V</th>
                  <th title="Derrotas">D</th>
                  <th title="Sets ganados-perdidos">Sets</th>
                  <th title="Juegos ganados-perdidos">Juegos</th>
                </tr>
              </thead>
              <tbody>
                {standings.get(group.id)!.map((row, i, rows) => {
                  const up = g > 0 && i === 0;
                  const down = g < last && i === rows.length - 1;
                  return (
                    <tr key={row.player} className={up ? 'up' : down ? 'down' : undefined}>
                      <td>
                        {row.position}
                        {row.tiedWithPrevious && row.played > 0 && <span title="Empate total: se decide por sorteo">=</span>}
                      </td>
                      <td className="left">
                        {nameOf(row.player)} {up && <span className="arrow up">▲</span>}
                        {down && <span className="arrow down">▼</span>}
                      </td>
                      <td>{row.played}</td>
                      <td className="points">{row.won}</td>
                      <td>{row.lost}</td>
                      <td title={`Diferencia ${signed(row.setDiff)}`}>
                        {row.setsWon}-{row.setsLost}
                      </td>
                      <td title={`Diferencia ${signed(row.gameDiff)}`}>
                        {row.gamesWon}-{row.gamesLost}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <p className="legend">
        ▲ sube de grupo · ▼ baja de grupo. Orden: victorias; si hay empate, diferencia de sets y después de juegos.
        {anyTie && ' = empate total, se decide por sorteo.'}
      </p>
    </>
  );
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}
