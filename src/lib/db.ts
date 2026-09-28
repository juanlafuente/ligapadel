import type { Group, ScheduledMatch, SetScore } from '../domain/types';
import { supabase } from './supabase';

export type RoundState = 'borrador' | 'en_curso' | 'cerrada';
export type MatchState = 'pendiente' | 'jugado' | 'aplazado';

export interface Player {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface Round {
  id: string;
  numero: number;
  estado: RoundState;
  fecha_inicio: string | null;
}

export interface RoundMatch extends ScheduledMatch {
  id: string;
  estado: MatchState;
  sets: SetScore[];
}

export interface RoundData {
  round: Round;
  groups: Group[];
  matches: RoundMatch[];
}

interface MatchRow {
  id: string;
  semana: number;
  tipo: string;
  pareja1_j1: string;
  pareja1_j2: string;
  pareja2_j1: string;
  pareja2_j2: string;
  estado: MatchState;
  sets: { numero: number; juegos_pareja1: number; juegos_pareja2: number }[];
}

type Result<T> = { data: T | null; error: { message: string } | null };

function client() {
  if (!supabase) throw new Error('Supabase no está configurado.');
  return supabase;
}

function unwrap<T>(result: Result<T>): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

export async function fetchPlayers(): Promise<Player[]> {
  return unwrap<Player[]>(await client().from('jugadores').select('id, nombre, activo').order('nombre'));
}

export async function createPlayer(nombre: string): Promise<void> {
  unwrap(await client().from('jugadores').insert({ nombre: nombre.trim() }));
}

export async function updatePlayer(id: string, patch: Partial<Pick<Player, 'nombre' | 'activo'>>): Promise<void> {
  unwrap(await client().from('jugadores').update(patch).eq('id', id));
}

export async function fetchRounds(): Promise<Round[]> {
  return unwrap<Round[]>(
    await client().from('vueltas').select('id, numero, estado, fecha_inicio').order('numero', { ascending: false }),
  );
}

export async function fetchRoundData(round: Round): Promise<RoundData> {
  const [groupResult, matchResult] = await Promise.all([
    client().from('vuelta_grupos').select('jugador_id, grupo').eq('vuelta_id', round.id),
    client()
      .from('partidos')
      .select('id, semana, tipo, pareja1_j1, pareja1_j2, pareja2_j1, pareja2_j2, estado, sets(numero, juegos_pareja1, juegos_pareja2)')
      .eq('vuelta_id', round.id)
      .order('semana'),
  ]);
  const groupRows = unwrap<{ jugador_id: string; grupo: string }[]>(groupResult);
  const matchRows = unwrap<MatchRow[]>(matchResult);

  const groupIds = [...new Set(groupRows.map((row) => row.grupo))].sort();
  const groups = groupIds.map((id) => ({
    id,
    players: groupRows.filter((row) => row.grupo === id).map((row) => row.jugador_id),
  }));
  const matches = matchRows.map((row) => ({
    id: row.id,
    week: row.semana,
    kind: row.tipo,
    pair1: [row.pareja1_j1, row.pareja1_j2] as const,
    pair2: [row.pareja2_j1, row.pareja2_j2] as const,
    estado: row.estado,
    sets: [...row.sets]
      .sort((a, b) => a.numero - b.numero)
      .map((set) => ({ pair1: set.juegos_pareja1, pair2: set.juegos_pareja2 })),
  }));
  return { round, groups, matches };
}

export async function createRound(numero: number, groups: readonly Group[], matches: readonly ScheduledMatch[]): Promise<string> {
  const grupos = groups.flatMap((group) => group.players.map((jugador_id) => ({ jugador_id, grupo: group.id })));
  const partidos = matches.map((match) => ({
    semana: match.week,
    tipo: match.kind,
    pareja1_j1: match.pair1[0],
    pareja1_j2: match.pair1[1],
    pareja2_j1: match.pair2[0],
    pareja2_j2: match.pair2[1],
  }));
  return unwrap<string>(await client().rpc('crear_vuelta', { p_numero: numero, p_grupos: grupos, p_partidos: partidos }));
}

export async function setRoundState(id: string, estado: RoundState): Promise<void> {
  unwrap(await client().from('vueltas').update({ estado }).eq('id', id));
}

/** Guarda los sets de un partido; con una lista vacía borra el resultado. */
export async function saveResult(matchId: string, sets: readonly SetScore[]): Promise<void> {
  const p_sets = sets.map((set) => ({ pareja1: set.pair1, pareja2: set.pair2 }));
  unwrap(await client().rpc('guardar_resultado', { p_partido: matchId, p_sets }));
}

export async function updateMatch(match: Pick<RoundMatch, 'id' | 'week' | 'pair1' | 'pair2' | 'estado'>): Promise<void> {
  unwrap(
    await client()
      .from('partidos')
      .update({
        semana: match.week,
        pareja1_j1: match.pair1[0],
        pareja1_j2: match.pair1[1],
        pareja2_j1: match.pair2[0],
        pareja2_j2: match.pair2[1],
        estado: match.estado,
      })
      .eq('id', match.id),
  );
}
