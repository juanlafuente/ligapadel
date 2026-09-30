import { useMemo } from 'react';
import { Avatar } from '../components/Brand';
import { MatchCard } from '../components/MatchCard';
import { PlayerLink } from '../components/PlayerLink';
import { computeElo, ELO_START } from '../domain/elo';
import { medalTable } from '../domain/medals';
import { MIN_SHARED_MATCHES, playerStats, type HeadToHead } from '../domain/playerStats';
import type { RoundMatch } from '../lib/db';
import { categoryOf, closedRounds, historyMatches, trajectory } from '../lib/league';
import type { League } from '../lib/useLeague';
import { Delta } from './StatsPage';

export function PlayerPage({ league, playerId }: { league: League; playerId: string | null }) {
  const matches = useMemo(() => historyMatches(league.history), [league.history]);
  const elo = useMemo(() => computeElo(matches), [matches]);
  const medals = useMemo(() => medalTable(closedRounds(league.history)), [league.history]);
  const player = league.players.find((p) => p.id === playerId);

  if (!player) {
    return (
      <section className="card welcome">
        <div className="welcomeIcon">🤷</div>
        <h2>Jugador no encontrado</h2>
        <a href="#/estadisticas">← Volver a estadísticas</a>
      </section>
    );
  }

  const stats = playerStats(player.id, matches);
  const steps = trajectory(player.id, league.history);
  const current = steps.at(-1);
  const rating = elo.ratings.get(player.id) ?? ELO_START;
  const ranking = [...elo.ratings.entries()].sort((a, b) => b[1] - a[1]);
  const rank = ranking.findIndex(([id]) => id === player.id) + 1;
  const deltaByMatch = new Map((elo.changes.get(player.id) ?? []).map((c) => [c.matchId, c.delta]));

  const allMatches = league.history.flatMap((data) => data.matches.map((m) => ({ match: m, round: data.round.numero })));
  const recent = [...matches]
    .filter((m) => m.pair1.includes(player.id) || m.pair2.includes(player.id))
    .sort((a, b) => b.round - a.round || b.week - a.week || b.playedAt.localeCompare(a.playedAt))
    .slice(0, 5)
    .map((m) => allMatches.find((x) => x.match.id === m.id)!)
    .filter(Boolean);

  const myMedals = medals.find((row) => row.player === player.id);
  const pct = stats.played ? Math.round((stats.won / stats.played) * 100) : 0;

  return (
    <>
      <a className="backLink" href="#/estadisticas">
        ← Estadísticas
      </a>

      <section className="card playerHeader">
        <span className="avatarLarge">
          <Avatar id={player.id} name={player.nombre} />
        </span>
        <div>
          <h2>{player.nombre}</h2>
          {current && (
            <span className={`chip chip-${current.group}`}>
              {categoryOf(current.group).medal} {categoryOf(current.group).name}
            </span>
          )}
        </div>
        <div className="playerRating">
          <strong>{Math.round(rating).toLocaleString('es')}</strong>
          <small>Índice Matilda{rank > 0 ? ` · ${rank}º` : ''}</small>
        </div>
      </section>

      {steps.length > 0 && (
        <section className="section">
          <h2 className="sectionTitle">
            Trayectoria
            {myMedals && (
              <span className="medalSummary" title={`Medallero: ${myMedals.position}º`}>
                🥇{myMedals.gold} 🥈{myMedals.silver} 🥉{myMedals.bronze} ⭐{myMedals.titles}
              </span>
            )}
          </h2>
          <div className="trajectory">
            {steps.map((step) => (
              <span key={step.round} className={`trajectoryStep tone-${categoryOf(step.group).tone}${step.final ? '' : ' provisional'}`} title={step.final ? undefined : 'Vuelta en curso (provisional)'}>
                <small>V{step.round}</small>
                <span>{categoryOf(step.group).medal}</span>
                <strong>{step.position}º</strong>
              </span>
            ))}
          </div>
        </section>
      )}

      {stats.played === 0 ? (
        <p className="emptyLine">Todavía no ha jugado ningún partido.</p>
      ) : (
        <>
          <section className="section">
            <h2 className="sectionTitle">Balance</h2>
            <div className="tiles">
              <Tile label="Partidos" value={stats.played} />
              <Tile label="Victorias" value={`${stats.won}-${stats.lost}`} detail={`${pct} %`} />
              <Tile label="Sets" value={`${stats.setsWon}-${stats.setsLost}`} />
              <Tile label="Juegos" value={`${stats.gamesWon}-${stats.gamesLost}`} />
              <Tile
                label="Racha"
                value={stats.streak ? `${stats.streak.won ? '🔥' : '🥶'} ${stats.streak.count}` : '–'}
                detail={stats.streak ? (stats.streak.won ? 'ganando' : 'perdiendo') : undefined}
              />
              <Tile label="Mejor racha" value={stats.bestWinStreak} detail="victorias seguidas" />
              <Tile label="Tie-breaks" value={`${stats.tiebreaksWon}/${stats.tiebreaksPlayed}`} detail="ganados" />
              <Tile label="Remontadas" value={stats.comebacks} detail="tras perder el 1er set" />
            </div>
          </section>

          <section className="section">
            <h2 className="sectionTitle">Compañeros y rivales</h2>
            <div className="duo">
              <Highlight title="🤝 Mejor compañero" entry={stats.bestPartner} nameOf={league.nameOf} verb="ganados juntos" />
              <Highlight title="😈 Bestia negra" entry={stats.nemesis} nameOf={league.nameOf} verb="ganados contra" />
            </div>
            <p className="legend">Cuentan a partir de {MIN_SHARED_MATCHES} partidos juntos o enfrentados.</p>
          </section>

          <section className="section">
            <h2 className="sectionTitle">Últimos partidos</h2>
            {recent.map(({ match, round }) => (
              <MatchCard key={match.id} match={match as RoundMatch} nameOf={league.nameOf} note={`V${round} · S${match.week}`}>
                <Delta value={deltaByMatch.get(match.id) ?? null} />
              </MatchCard>
            ))}
          </section>
        </>
      )}
    </>
  );
}

function Tile({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="tile">
      <small>{label}</small>
      <strong>{value}</strong>
      {detail && <span>{detail}</span>}
    </div>
  );
}

function Highlight({ title, entry, nameOf, verb }: { title: string; entry: HeadToHead | null; nameOf: (id: string) => string; verb: string }) {
  return (
    <div className="card highlight">
      <small>{title}</small>
      {entry ? (
        <>
          <PlayerLink id={entry.player}>
            <span className="playerCell">
              <Avatar id={entry.player} name={nameOf(entry.player)} />
              <strong>{nameOf(entry.player)}</strong>
            </span>
          </PlayerLink>
          <span className="muted">
            {entry.won} de {entry.played} {verb}
          </span>
        </>
      ) : (
        <span className="muted">Aún sin datos</span>
      )}
    </div>
  );
}
