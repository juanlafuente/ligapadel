-- Operaciones que tocan varias tablas a la vez, en una sola transacción.
-- Se ejecutan con los permisos del usuario (security invoker), así que las reglas RLS siguen aplicando.

create or replace function public.crear_vuelta(p_numero integer, p_grupos jsonb, p_partidos jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo los administradores pueden crear vueltas.';
  end if;
  if exists (select 1 from public.vueltas where estado = 'en_curso') then
    raise exception 'Hay una vuelta en curso; ciérrala antes de crear otra.';
  end if;

  insert into public.vueltas (numero, estado, fecha_inicio)
  values (p_numero, 'en_curso', current_date)
  returning id into v_id;

  insert into public.vuelta_grupos (vuelta_id, jugador_id, grupo)
  select v_id, (g ->> 'jugador_id')::uuid, g ->> 'grupo'
  from jsonb_array_elements(p_grupos) as g;

  insert into public.partidos (vuelta_id, semana, tipo, pareja1_j1, pareja1_j2, pareja2_j1, pareja2_j2)
  select v_id, (p ->> 'semana')::integer, p ->> 'tipo',
         (p ->> 'pareja1_j1')::uuid, (p ->> 'pareja1_j2')::uuid,
         (p ->> 'pareja2_j1')::uuid, (p ->> 'pareja2_j2')::uuid
  from jsonb_array_elements(p_partidos) as p;

  return v_id;
end;
$$;

-- Sustituye los sets de un partido. Con una lista vacía borra el resultado.
create or replace function public.guardar_resultado(p_partido uuid, p_sets jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo los administradores pueden guardar resultados.';
  end if;

  delete from public.sets where partido_id = p_partido;

  insert into public.sets (partido_id, numero, juegos_pareja1, juegos_pareja2)
  select p_partido, t.orden::smallint, (t.s ->> 'pareja1')::smallint, (t.s ->> 'pareja2')::smallint
  from jsonb_array_elements(p_sets) with ordinality as t(s, orden);

  update public.partidos
  set estado = case when jsonb_array_length(p_sets) > 0 then 'jugado' else 'pendiente' end
  where id = p_partido;
end;
$$;

revoke all on function public.crear_vuelta(integer, jsonb, jsonb) from public, anon;
revoke all on function public.guardar_resultado(uuid, jsonb) from public, anon;
grant execute on function public.crear_vuelta(integer, jsonb, jsonb) to authenticated;
grant execute on function public.guardar_resultado(uuid, jsonb) to authenticated;
