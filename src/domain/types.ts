export type PlayerId = string;

/** Identificador de grupo: 'A', 'B', 'C'... El orden de los grupos es el orden de nivel. */
export type GroupId = string;

export interface Group {
  id: GroupId;
  players: PlayerId[];
}

export type Pair = readonly [PlayerId, PlayerId];

/**
 * Tipo de partido: el id del grupo en el que se juega ('A', 'B'...).
 */
export type MatchKind = string;

export interface ScheduledMatch {
  week: number;
  kind: MatchKind;
  pair1: Pair;
  pair2: Pair;
}

export interface SetScore {
  pair1: number;
  pair2: number;
}

/** Partido con resultado, con lo necesario para ordenarlo en el tiempo (estadísticas y Elo). */
export interface HistoryMatch {
  id: string;
  /** Número de vuelta. */
  round: number;
  week: number;
  /** Momento en que se guardó el resultado; desempata dentro de la misma semana. */
  playedAt: string;
  pair1: Pair;
  pair2: Pair;
  sets: readonly SetScore[];
}
