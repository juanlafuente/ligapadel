export type PlayerId = string;

/** Identificador de grupo: 'A', 'B', 'C'... El orden de los grupos es el orden de nivel. */
export type GroupId = string;

export interface Group {
  id: GroupId;
  players: PlayerId[];
}

export type Pair = readonly [PlayerId, PlayerId];

/**
 * Tipo de partido: el id del grupo si es interno ('A') o la concatenación
 * de dos grupos contiguos si es cruzado ('AB'), con parejas mixtas.
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
