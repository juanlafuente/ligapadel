import { useState } from 'react';
import { createPlayer, updatePlayer, type Player } from '../lib/db';
import { errorMessage } from '../lib/league';

export function PlayersAdmin({ players, onChanged }: { players: Player[]; onChanged: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>): Promise<boolean> => {
    setError(null);
    try {
      await action();
      await onChanged();
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    }
  };

  const rename = (player: Player) => {
    const next = window.prompt('Nuevo nombre', player.nombre)?.trim();
    if (next && next !== player.nombre) void run(() => updatePlayer(player.id, { nombre: next }));
  };

  return (
    <section className="card">
      <h2>Jugadores ({players.filter((p) => p.activo).length} activos)</h2>
      <form
        className="inline"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) void run(() => createPlayer(name)).then((ok) => ok && setName(''));
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del jugador" aria-label="Nombre del jugador" />
        <button className="primary" type="submit" disabled={!name.trim()}>
          Añadir
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      <ul className="playerList">
        {players.map((player) => (
          <li key={player.id} className={player.activo ? undefined : 'inactive'}>
            <span>{player.nombre}</span>
            <span className="actions">
              <button className="ghost" onClick={() => rename(player)}>
                Renombrar
              </button>
              <button className="ghost" onClick={() => void run(() => updatePlayer(player.id, { activo: !player.activo }))}>
                {player.activo ? 'Desactivar' : 'Activar'}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
