import { useState } from 'react';
import { Avatar } from '../components/Brand';
import { PlayerLink } from '../components/PlayerLink';
import { SEASON_POINTS, seasonStandings } from '../domain/season';
import type { RoundData } from '../lib/db';
import { categoryOf, groupMatches, GROUP_IDS, PROMOTIONS, roundStandings, seasonRounds } from '../lib/league';
import type { League } from '../lib/useLeague';

type Tab = 'vuelta' | 'temporada';

export function StandingsPage({ league }: { league: League }) {
  const [tab, setTab] = useState<Tab>('vuelta');
  return (
    <>
      <div className="subTabs" role="tablist">
        <button role="tab" aria-selected={tab === 'vuelta'} className={tab === 'vuelta' ? 'active' : undefined} onClick={() => setTab('vuelta')}>
          Vuelta
        </button>
        <button role="tab" aria-selected={tab === 'temporada'} className={tab === 'temporada' ? 'active' : undefined} onClick={() => setTab('temporada')}>
          Temporada
        </button>
      </div>
      {tab === 'vuelta' ? <RoundStandings data={league.roundData} nameOf={league.nameOf} /> : <SeasonStandings league={league} />}
    </>
  );
}

function RoundStandings({ data, nameOf }: { data: RoundData | null; nameOf: (id: string) => string }) {
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
        // Si la vuelta está cerrada, se muestra el orden final guardado (con los sorteos resueltos).
        const rowsById = new Map(standings.get(group.id)!.map((row) => [row.player, row]));
        const order = data.finalRanking?.get(group.id) ?? [...rowsById.keys()];
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
                  {order.map((player, i) => {
                    const row = rowsById.get(player)!;
                    const up = g > 0 && i < PROMOTIONS;
                    const down = g < last && i >= order.length - PROMOTIONS;
                    return (
                      <tr key={player} className={up ? 'up' : down ? 'down' : undefined}>
                        <td className="pos">
                          {i + 1}
                          {!data.finalRanking && row.tiedWithPrevious && row.played > 0 && <span title="Empate total: se decide por sorteo">=</span>}
                        </td>
                        <td className="left">
                          <PlayerLink id={player}>
                            <span className="playerCell">
                              <Avatar id={player} name={nameOf(player)} />
                              <span>{nameOf(player)}</span>
                              {up && <span className="tag up">▲ SUBE</span>}
                              {down && <span className="tag down">▼ BAJA</span>}
                            </span>
                          </PlayerLink>
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
        Orden: victorias; si hay empate, diferencia de sets y después de juegos. Al cerrar la vuelta suben los {PROMOTIONS} primeros de
        cada grupo y bajan los {PROMOTIONS} últimos.
        {anyTie && !data.finalRanking && ' «=» empate total, se decide por sorteo.'}
      </p>
    </>
  );
}

function SeasonStandings({ league }: { league: League }) {
  const defaultSeason = (league.seasons.find((s) => s.estado === 'en_curso') ?? league.seasons[0])?.id ?? null;
  const [seasonId, setSeasonId] = useState(defaultSeason);
  const season = league.seasons.find((s) => s.id === seasonId);
  if (!season) return <EmptyRound />;

  const rounds = seasonRounds(league.history, season.id).sort((a, b) => a.round - b.round);
  const rows = seasonStandings(rounds);
  const inProgress = league.rounds.some((r) => r.temporada_id === season.id && r.estado === 'en_curso');
  const champion = season.estado === 'cerrada' ? rows[0] : undefined;

  return (
    <>
      {league.seasons.length > 1 && (
        <select className="seasonPicker" value={season.id} onChange={(e) => setSeasonId(e.target.value)} aria-label="Temporada">
          {league.seasons.map((s) => (
            <option key={s.id} value={s.id}>
              Temporada {s.numero}
              {s.estado === 'en_curso' ? ' · en curso' : ''}
            </option>
          ))}
        </select>
      )}

      {champion && (
        <section className="card champion">
          <span className="championTrophy">🏆</span>
          <div>
            <small>Campeón de la temporada {season.numero}</small>
            <strong>{league.nameOf(champion.player)}</strong>
            <span className="muted">{champion.points} puntos</span>
          </div>
        </section>
      )}

      {rows.length === 0 ? (
        <section className="card welcome">
          <div className="welcomeIcon">🏅</div>
          <h2>Temporada {season.numero}</h2>
          <p className="muted">Cuando se cierre la primera vuelta de la temporada, aquí aparecerán los puntos de cada jugador.</p>
        </section>
      ) : (
        <section className="groupCard">
          <header className="groupHead tone-neutral">
            <span className="medal">🏅</span>
            <strong>Temporada {season.numero}</strong>
            <small>
              {rounds.length} {rounds.length === 1 ? 'vuelta' : 'vueltas'}
            </small>
          </header>
          <div className="tableWrap">
            <table className="standings">
              <thead>
                <tr>
                  <th>#</th>
                  <th className="left">Jugador</th>
                  {rounds.map((r) => (
                    <th key={r.round} title={`Vuelta ${r.round}`}>
                      V{r.round}
                    </th>
                  ))}
                  <th title="Puntos de temporada">Pts</th>
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
                    {rounds.map((r) => {
                      const result = row.rounds.find((x) => x.round === r.round);
                      return (
                        <td key={r.round}>
                          {result ? (
                            <span className={`seasonCell tone-${categoryOf(result.group).tone}`} title={`${categoryOf(result.group).name}, ${result.position}º`}>
                              {result.points}
                            </span>
                          ) : (
                            '–'
                          )}
                        </td>
                      );
                    })}
                    <td className="wins">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card">
        <h2>Puntos por vuelta</h2>
        <table className="pointsTable">
          <thead>
            <tr>
              <th className="left">Grupo</th>
              <th>1º</th>
              <th>2º</th>
              <th>3º</th>
              <th>4º</th>
            </tr>
          </thead>
          <tbody>
            {GROUP_IDS.map((id) => (
              <tr key={id}>
                <td className="left">
                  {categoryOf(id).medal} {categoryOf(id).name}
                </td>
                {SEASON_POINTS[id].map((points, i) => (
                  <td key={i}>{points}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="legend">
          Suman las vueltas cerradas{inProgress ? '; la vuelta en curso sumará al cerrarse' : ''}. A igualdad de puntos gana quien sumó
          más en la última vuelta.
        </p>
      </section>
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
