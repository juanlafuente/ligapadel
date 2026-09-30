import type { ReactNode } from 'react';

/** Nombre de jugador que abre su ficha. */
export function PlayerLink({ id, children }: { id: string; children: ReactNode }) {
  return (
    <a className="playerLink" href={`#/jugador/${id}`}>
      {children}
    </a>
  );
}
