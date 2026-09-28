import { Avatar } from '../components/Brand';
import type { RoundData } from '../lib/db';
import { categoryOf, groupMatches, roundStandings } from '../lib/league';

export function StandingsPage({ data, nameOf }: { data: RoundData | null; nameOf: (id: string) => string }) {
  if (!data) return <EmptyRound />;

  const standings = roundStandings(data);
  const last = data.groups.length - 1;
  const anyTie = [...standings.values()].some((rows) => rows.some((row) => row.tiedWithPrevious && row.played > 0));

  return (
    <>
      {data.groups.map((group, g) => {
        const category = categoryOf(group.id);
        const matches = groupMatches(group.id, data.matches);
        const played = matches.filter((m) => m.estado === 'jugado').length;
        return (
          <section className="groupCard" key={group.id}>
            <header className={`groupHead tone-${category.tone}`}>
              <span className="medal">{category.medal}</span>
              <strong>
                Grupo {group.id} · {category.name}
              </strong>
              <small>
                {played}/{matches.length} jugados
              </small>
            </header>
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
                        <td className="pos">
                          {row.position}
                          {row.tiedWithPrevious && row.played > 0 && <span title="Empate total: se decide por sorteo">=</span>}
                        </td>
                        <td className="left">
                          <span className="playerCell">
                            <Avatar id={row.player} name={nameOf(row.player)} />
                            <span>{nameOf(row.player)}</span>
                            {up && <span className="tag up">▲ SUBE</span>}
                            {down && <span className="tag down">▼ BAJA</span>}
                          </span>
                        </td>
                        <td>{row.played}</td>
                        <td className="wins">{row.won}</td>
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
        );
      })}
      <p className="legend">
        Orden: victorias; si hay empate, diferencia de sets y después de juegos. El primero de cada grupo sube y el último baja al
        cerrar la vuelta.
        {anyTie && ' «=» empate total, se decide por sorteo.'}
      </p>
    </>
  );
}

export function EmptyRound() {
  return (
    <section className="card welcome">
      <div className="welcomeIcon">🎾</div>
      <h2>Todavía no hay ninguna vuelta</h2>
      <p className="muted">Cuando se sorteen los grupos aparecerán aquí.</p>
    </section>
  );
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}
