import { Logo } from './components/Brand';
import { AdminPage } from './pages/AdminPage';
import { CalendarPage } from './pages/CalendarPage';
import { HomePage } from './pages/HomePage';
import { StandingsPage } from './pages/StandingsPage';
import { supabase } from './lib/supabase';
import { useAuth } from './lib/useAuth';
import { useLeague } from './lib/useLeague';
import { useRoute, type Route } from './lib/useRoute';

const TABS: { route: Route; icon: string; label: string }[] = [
  { route: 'inicio', icon: '🏠', label: 'Inicio' },
  { route: 'clasificacion', icon: '🏆', label: 'Clasificación' },
  { route: 'calendario', icon: '🎾', label: 'Calendario' },
  { route: 'admin', icon: '⚙️', label: 'Admin' },
];

const ROUND_STATE_LABEL = { borrador: 'borrador', en_curso: 'en curso', cerrada: 'cerrada' } as const;

export function App() {
  const [route, navigate] = useRoute();
  const auth = useAuth();
  const league = useLeague();

  if (!supabase) {
    return (
      <main className="app">
        <div className="page">
          <section className="card">
            <h2>Falta configurar Supabase</h2>
            <p>
              Crea <code>.env.local</code> a partir de <code>.env.example</code> con <code>VITE_SUPABASE_URL</code> y{' '}
              <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>, y reinicia <code>npm run dev</code>.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const title = TABS.find((tab) => tab.route === route)!.label;
  const showRoundPicker = league.rounds.length > 1 && (route === 'clasificacion' || route === 'calendario');

  return (
    <>
      <main className="app">
        {route !== 'inicio' && (
          <header className="topbar">
            <Logo size={30} />
            <h1>{title}</h1>
            {showRoundPicker && (
              <select className="roundPicker" value={league.selectedRoundId ?? ''} onChange={(e) => league.selectRound(e.target.value)} aria-label="Vuelta">
                {league.rounds.map((round) => (
                  <option key={round.id} value={round.id}>
                    Vuelta {round.numero} · {ROUND_STATE_LABEL[round.estado]}
                  </option>
                ))}
              </select>
            )}
          </header>
        )}

        {league.error && <p className="error page">{league.error}</p>}
        {league.loading ? (
          <p className="muted page">Cargando…</p>
        ) : route === 'inicio' ? (
          <HomePage data={league.roundData} nameOf={league.nameOf} isAdmin={auth.isAdmin === true} navigate={navigate} />
        ) : (
          <div className="page">
            {route === 'clasificacion' && <StandingsPage data={league.roundData} nameOf={league.nameOf} />}
            {route === 'calendario' && (
              <CalendarPage
                data={league.roundData}
                players={league.players}
                nameOf={league.nameOf}
                isAdmin={auth.isAdmin === true}
                onChanged={() => league.refresh()}
              />
            )}
            {route === 'admin' && <AdminPage auth={auth} league={league} />}
          </div>
        )}
      </main>

      <nav className="bottomNav">
        {TABS.map((tab) => (
          <button key={tab.route} className={route === tab.route ? 'active' : undefined} onClick={() => navigate(tab.route)}>
            <span aria-hidden="true">{tab.icon}</span>
            <small>{tab.label}</small>
          </button>
        ))}
      </nav>
    </>
  );
}
