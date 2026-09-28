import { Avatar, LEAGUE_NAME, Logo } from '../components/Brand';
import { MatchCard } from '../components/MatchCard';
import { PLAY_WEEKS, RECOVERY_WEEK } from '../domain/schedule';
import type { RoundData } from '../lib/db';
import { categoryOf, latestResults, roundProgress, roundStandings } from '../lib/league';
import type { Route } from '../lib/useRoute';

interface Props {
  data: RoundData | null;
  nameOf: (id: string) => string;
  isAdmin: boolean;
  navigate: (route: Route) => void;
}

const ROUND_STATE = { borrador: 'borrador', en_curso: 'en curso', cerrada: 'cerrada' } as const;

export function HomePage({ data, nameOf, isAdmin, navigate }: Props) {
  if (!data) {
    return (
      <>
        <header className="hero">
          <Brand subtitle="Temporada 2026" />
        </header>
        <div className="page">
          <section className="card welcome">
            <div className="welcomeIcon">🎾</div>
            <h2>La liga arranca pronto</h2>
            <p className="muted">En cuanto se sorteen los grupos y el calendario, aquí verás la clasificación, los partidos de la semana y los resultados.</p>
            {isAdmin && (
              <button className="primary" onClick={() => navigate('admin')}>
                Crear la primera vuelta
              </button>
            )}
          </section>
        </div>
      </>
    );
  }

  const progress = roundProgress(data.matches);
  const standings = roundStandings(data);
  const week = progress.currentWeek;
  const thisWeek = week === null ? [] : data.matches.filter((m) => m.week === week);
  const latest = latestResults(data.matches, 3);
  const percent = progress.total ? Math.round((progress.played / progress.total) * 100) : 0;

  return (
    <>
      <header className="hero">
        <Brand subtitle={`Vuelta ${data.round.numero} · ${ROUND_STATE[data.round.estado]}`} />
        <div className="progress">
          <div className="progressTop">
            <span>
              {week === null ? (
                'Vuelta completada'
              ) : week >= RECOVERY_WEEK ? (
                <strong>Semana de recuperación</strong>
              ) : (
                <>
                  Semana <strong>{week}</strong> de {PLAY_WEEKS}
                </>
              )}
            </span>
            <span>
              <strong>{progress.played}</strong>/{progress.total} partidos
            </span>
          </div>
          <div className="bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div style={{ width: `${percent}%` }} />
          </div>
          <div className="weekChips">
            {progress.weeks.map((w) => (
              <span key={w.week} className={w.complete ? 'done' : w.week === week ? 'now' : undefined}>
                {w.week >= RECOVERY_WEEK ? 'Recup.' : `S${w.week}`}
                {w.complete && ' ✓'}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="page">
        <section className="section">
          <h2 className="sectionTitle">Líderes</h2>
          <div className="leaders">
            {data.groups.map((group) => {
              const category = categoryOf(group.id);
              const leader = standings.get(group.id)?.[0];
              const hasPlayed = leader !== undefined && leader.played > 0;
              return (
                <button key={group.id} className={`leader tone-${category.tone}`} onClick={() => navigate('clasificacion')}>
                  <span className="medal">{category.medal}</span>
                  <span className="leaderCat">
                    {category.name} · {group.id}
                  </span>
                  {hasPlayed ? (
                    <>
                      <span className="leaderName">{nameOf(leader.player)}</span>
                      <span className="leaderRecord">
                        {leader.won}-{leader.lost}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="avatars small">
                        {group.players.map((id) => (
                          <Avatar key={id} id={id} name={nameOf(id)} />
                        ))}
                      </span>
                      <span className="leaderRecord">Por decidir</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="section">
          <h2 className="sectionTitle">
            {week === null ? 'Calendario' : week >= RECOVERY_WEEK ? 'Recuperación' : `Semana ${week}`}
            <button className="link" onClick={() => navigate('calendario')}>
              Ver calendario →
            </button>
          </h2>
          {week === null ? (
            <div className="card welcome compact">
              <div className="welcomeIcon">🎉</div>
              <p>
                Se han jugado todos los partidos de la vuelta {data.round.numero}. Mira quién sube y quién baja en la clasificación.
              </p>
            </div>
          ) : (
            thisWeek.map((match) => <MatchCard key={match.id} match={match} nameOf={nameOf} />)
          )}
        </section>

        <section className="section">
          <h2 className="sectionTitle">Últimos resultados</h2>
          {latest.length === 0 ? (
            <p className="emptyLine">Todavía no hay resultados. ¡Que empiece el juego! 🎾</p>
          ) : (
            latest.map((match) => <MatchCard key={match.id} match={match} nameOf={nameOf} note={`Semana ${match.week}`} />)
          )}
        </section>
      </div>
    </>
  );
}

function Brand({ subtitle }: { subtitle: string }) {
  return (
    <div className="brand">
      <Logo size={42} />
      <div>
        <h1>{LEAGUE_NAME}</h1>
        <small>{subtitle}</small>
      </div>
    </div>
  );
}
