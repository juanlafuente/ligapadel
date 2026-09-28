import { useState } from 'react';
import { PlayersAdmin } from '../components/PlayersAdmin';
import { RoundAdmin } from '../components/RoundAdmin';
import { errorMessage } from '../lib/league';
import type { Auth } from '../lib/useAuth';
import type { League } from '../lib/useLeague';

export function AdminPage({ auth, league }: { auth: Auth; league: League }) {
  if (!auth.ready) return <p className="muted">Cargando…</p>;
  if (!auth.session) return <LoginForm signIn={auth.signIn} />;
  if (auth.isAdmin === null) return <p className="muted">Comprobando permisos…</p>;

  const email = auth.session.user.email ?? '';
  if (!auth.isAdmin) {
    return (
      <section className="card">
        <h2>Sin permisos de administración</h2>
        <p>
          Has entrado como <strong>{email}</strong>, pero este usuario todavía no es administrador. Para darlo de alta, ejecuta en el SQL
          Editor de Supabase:
        </p>
        <pre className="code">{`insert into public.admins (user_id, nombre)\nselect id, 'Tu nombre' from auth.users\nwhere email = '${email}';`}</pre>
        <p className="muted">Después recarga esta página.</p>
        <p className="muted">
          Tu identificador de usuario: <code>{auth.session.user.id}</code>
        </p>
        {auth.adminError && <p className="error">Error al comprobar permisos: {auth.adminError}</p>}
        <button className="ghost" onClick={auth.signOut}>
          Salir
        </button>
      </section>
    );
  }

  return (
    <>
      <RoundAdmin league={league} />
      <PlayersAdmin players={league.players} onChanged={() => league.refresh()} />
      <p className="muted signedIn">
        Admin: {email} ·{' '}
        <button className="link" onClick={auth.signOut}>
          Salir
        </button>
      </p>
    </>
  );
}

function LoginForm({ signIn }: { signIn: (email: string) => Promise<void> }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sent) {
    return (
      <section className="card">
        <h2>Revisa tu correo</h2>
        <p>
          Te hemos enviado un enlace a <strong>{email}</strong>. Ábrelo en este mismo navegador para entrar.
        </p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Entrar</h2>
      <p className="muted">Solo hace falta para meter resultados y gestionar la liga.</p>
      <form
        className="inline"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          try {
            await signIn(email.trim());
            setSent(true);
          } catch (err) {
            setError(errorMessage(err));
          }
        }}
      >
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" aria-label="Email" />
        <button className="primary" type="submit">
          Enviarme enlace
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </section>
  );
}
