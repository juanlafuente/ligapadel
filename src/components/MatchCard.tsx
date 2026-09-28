import { Fragment, type ReactNode } from 'react';
import { scoreMatch } from '../domain/scoring';
import type { Pair } from '../domain/types';
import type { RoundMatch } from '../lib/db';
import { kindLabel } from '../lib/league';
import { Avatar } from './Brand';

interface Props {
  match: RoundMatch;
  nameOf: (id: string) => string;
  /** Texto extra en la cabecera, p. ej. «Semana 2». */
  note?: string;
  /** Botones de admin. */
  children?: ReactNode;
}

const STATUS_LABEL = { pendiente: 'Pendiente', aplazado: 'Aplazado', jugado: 'Jugado' } as const;

/** Tarjeta de partido: marcador por sets si hay resultado, o «pareja vs pareja» si no. */
export function MatchCard({ match, nameOf, note, children }: Props) {
  const outcome = match.estado === 'jugado' ? safeScore(match) : null;

  return (
    <article className="card matchCard">
      <header className="matchHead">
        <span className={`chip chip-${match.kind}`}>{match.kind.split('').join('·')}</span>
        <span>{kindLabel(match.kind)}</span>
        {note && <span>· {note}</span>}
        <span className={`matchStatus status-${match.estado}`}>{STATUS_LABEL[match.estado]}</span>
      </header>

      {outcome ? (
        <div className="score" style={{ gridTemplateColumns: `1fr repeat(${match.sets.length}, 28px)` }}>
          {([match.pair1, match.pair2] as const).map((pair, p) => {
            const won = outcome.winner === p + 1;
            return (
              <Fragment key={p}>
                <PairName pair={pair} nameOf={nameOf} className={won ? 'pair winner' : 'pair'} />
                {match.sets.map((set, i) => {
                  const mine = p === 0 ? set.pair1 : set.pair2;
                  const theirs = p === 0 ? set.pair2 : set.pair1;
                  return (
                    <span key={i} className={mine > theirs ? 'game won' : 'game'}>
                      {mine}
                    </span>
                  );
                })}
              </Fragment>
            );
          })}
        </div>
      ) : (
        <div className="versus">
          <PairName pair={match.pair1} nameOf={nameOf} className="pair" />
          <em>vs</em>
          <PairName pair={match.pair2} nameOf={nameOf} className="pair right" />
        </div>
      )}

      {children && <footer className="matchActions">{children}</footer>}
    </article>
  );
}

function PairName({ pair, nameOf, className }: { pair: Pair; nameOf: (id: string) => string; className: string }) {
  return (
    <span className={className}>
      <span className="avatars">
        {pair.map((id) => (
          <Avatar key={id} id={id} name={nameOf(id)} />
        ))}
      </span>
      <span className="pairNames">{pair.map(nameOf).join(' / ')}</span>
    </span>
  );
}

function safeScore(match: RoundMatch) {
  try {
    return scoreMatch(match.sets);
  } catch {
    return null;
  }
}
