-- Temporadas (agrupan varias vueltas para el ranking por puntos) y posición final de cada vuelta.

create table public.temporadas (
  id            uuid primary key default gen_random_uuid(),
  numero        integer not null unique check (numero > 0),
  fecha_inicio  date not null default current_date,
  estado        text not null default 'en_curso' check (estado in ('en_curso', 'cerrada')),
  creado_en     timestamptz not null default now()
);

-- Solo puede haber una temporada en curso.
create unique index temporadas_una_en_curso on public.temporadas ((true)) where estado = 'en_curso';

insert into public.temporadas (numero) values (1);

-- Las vueltas que ya existen pasan a la temporada 1.
alter table public.vueltas add column temporada_id uuid references public.temporadas (id);
update public.vueltas set temporada_id = (select id from public.temporadas where numero = 1);
alter table public.vueltas alter column temporada_id set not null;

-- Posición final de cada jugador en su grupo, guardada al cerrar la vuelta (incluye el sorteo si hubo empate).
alter table public.vuelta_grupos add column posicion_final smallint check (posicion_final between 1 and 10);

-- Permisos (RLS), igual que el resto de tablas.
alter table public.temporadas enable row level security;
grant select on public.temporadas to anon, authenticated;
grant insert, update, delete on public.temporadas to authenticated;
create policy "lectura publica" on public.temporadas for select to anon, authenticated using (true);
create policy "admins insertan" on public.temporadas for insert to authenticated with check (public.es_admin());
create policy "admins modifican" on public.temporadas for update to authenticated using (public.es_admin()) with check (public.es_admin());
create policy "admins borran" on public.temporadas for delete to authenticated using (public.es_admin());

-- crear_vuelta: ahora asigna la vuelta a la temporada en curso.
create or replace function public.crear_vuelta(p_numero integer, p_grupos jsonb, p_partidos jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_temporada uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo los administradores pueden crear vueltas.';
  end if;
  if exists (select 1 from public.vueltas where estado = 'en_curso') then
    raise exception 'Hay una vuelta en curso; ciérrala antes de crear otra.';
  end if;
  select id into v_temporada from public.temporadas where estado = 'en_curso';
  if v_temporada is null then
    raise exception 'No hay ninguna temporada en curso.';
  end if;

  insert into public.vueltas (numero, estado, fecha_inicio, temporada_id)
  values (p_numero, 'en_curso', current_date, v_temporada)
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

-- Cierra una vuelta guardando la posición final de cada jugador: [{ "jugador_id": ..., "posicion": 1 }, ...].
create or replace function public.cerrar_vuelta(p_vuelta uuid, p_posiciones jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo los administradores pueden cerrar vueltas.';
  end if;

  update public.vuelta_grupos vg
  set posicion_final = (p ->> 'posicion')::smallint
  from jsonb_array_elements(p_posiciones) as p
  where vg.vuelta_id = p_vuelta and vg.jugador_id = (p ->> 'jugador_id')::uuid;

  if exists (select 1 from public.vuelta_grupos where vuelta_id = p_vuelta and posicion_final is null) then
    raise exception 'Falta la posición final de algún jugador.';
  end if;

  update public.vueltas set estado = 'cerrada' where id = p_vuelta;
end;
$$;

-- Cierra la temporada en curso y abre la siguiente.
create or replace function public.nueva_temporada()
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo los administradores pueden empezar temporadas.';
  end if;
  if exists (select 1 from public.vueltas where estado = 'en_curso') then
    raise exception 'Hay una vuelta en curso; ciérrala antes de empezar otra temporada.';
  end if;

  update public.temporadas set estado = 'cerrada' where estado = 'en_curso';
  insert into public.temporadas (numero)
  select coalesce(max(numero), 0) + 1 from public.temporadas
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.cerrar_vuelta(uuid, jsonb) from public, anon;
revoke all on function public.nueva_temporada() from public, anon;
grant execute on function public.cerrar_vuelta(uuid, jsonb) to authenticated;
grant execute on function public.nueva_temporada() to authenticated;
