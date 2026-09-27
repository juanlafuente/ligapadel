-- Liga de pádel: esquema inicial.
-- Lectura pública; solo los usuarios de public.admins pueden modificar datos.

create table public.jugadores (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique check (length(trim(nombre)) > 0),
  activo     boolean not null default true,
  creado_en  timestamptz not null default now()
);

create table public.vueltas (
  id            uuid primary key default gen_random_uuid(),
  numero        integer not null unique check (numero > 0),
  fecha_inicio  date,
  estado        text not null default 'borrador' check (estado in ('borrador', 'en_curso', 'cerrada')),
  creado_en     timestamptz not null default now()
);

-- En qué grupo está cada jugador en cada vuelta. Los grupos se ordenan por nivel: A > B > C.
create table public.vuelta_grupos (
  vuelta_id   uuid not null references public.vueltas (id) on delete cascade,
  jugador_id  uuid not null references public.jugadores (id),
  grupo       text not null check (grupo ~ '^[A-Z]$'),
  primary key (vuelta_id, jugador_id)
);

create table public.partidos (
  id              uuid primary key default gen_random_uuid(),
  vuelta_id       uuid not null references public.vueltas (id) on delete cascade,
  semana          integer not null check (semana > 0),
  -- 'A' | 'B' | 'C' para internos, 'AB' | 'BC' para cruzados.
  tipo            text not null check (tipo ~ '^[A-Z]{1,2}$'),
  pareja1_j1      uuid not null references public.jugadores (id),
  pareja1_j2      uuid not null references public.jugadores (id),
  pareja2_j1      uuid not null references public.jugadores (id),
  pareja2_j2      uuid not null references public.jugadores (id),
  estado          text not null default 'pendiente' check (estado in ('pendiente', 'jugado', 'aplazado')),
  actualizado_en  timestamptz not null default now(),
  actualizado_por uuid references auth.users (id) default auth.uid(),
  constraint jugadores_distintos check (
    pareja1_j1 <> pareja1_j2 and pareja1_j1 <> pareja2_j1 and pareja1_j1 <> pareja2_j2
    and pareja1_j2 <> pareja2_j1 and pareja1_j2 <> pareja2_j2 and pareja2_j1 <> pareja2_j2
  )
);

create index partidos_vuelta_semana_idx on public.partidos (vuelta_id, semana);

-- Resultado de cada set, p. ej. 6-4 o 7-5. El tercer set se juega completo.
create table public.sets (
  partido_id      uuid not null references public.partidos (id) on delete cascade,
  numero          smallint not null check (numero between 1 and 3),
  juegos_pareja1  smallint not null,
  juegos_pareja2  smallint not null,
  primary key (partido_id, numero),
  constraint set_valido check (
    (greatest(juegos_pareja1, juegos_pareja2) = 6 and least(juegos_pareja1, juegos_pareja2) between 0 and 4)
    or (greatest(juegos_pareja1, juegos_pareja2) = 7 and least(juegos_pareja1, juegos_pareja2) in (5, 6))
  )
);

create table public.admins (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  nombre   text
);

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.tocar_partido()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  new.actualizado_por := auth.uid();
  return new;
end;
$$;

create trigger partidos_tocar before update on public.partidos
  for each row execute function public.tocar_partido();

-- Permisos (RLS)
alter table public.jugadores     enable row level security;
alter table public.vueltas       enable row level security;
alter table public.vuelta_grupos enable row level security;
alter table public.partidos      enable row level security;
alter table public.sets          enable row level security;
alter table public.admins        enable row level security;

grant select on public.jugadores, public.vueltas, public.vuelta_grupos, public.partidos, public.sets
  to anon, authenticated;
grant insert, update, delete on public.jugadores, public.vueltas, public.vuelta_grupos, public.partidos, public.sets
  to authenticated;
grant select on public.admins to authenticated;
grant execute on function public.es_admin() to anon, authenticated;

do $$
declare
  tabla text;
begin
  foreach tabla in array array['jugadores', 'vueltas', 'vuelta_grupos', 'partidos', 'sets'] loop
    execute format('create policy "lectura publica" on public.%I for select to anon, authenticated using (true)', tabla);
    execute format('create policy "admins insertan" on public.%I for insert to authenticated with check (public.es_admin())', tabla);
    execute format('create policy "admins modifican" on public.%I for update to authenticated using (public.es_admin()) with check (public.es_admin())', tabla);
    execute format('create policy "admins borran" on public.%I for delete to authenticated using (public.es_admin())', tabla);
  end loop;
end;
$$;

-- Cada usuario solo puede ver si él mismo es admin. Los admins se dan de alta a mano desde el SQL Editor.
create policy "ver mi fila de admin" on public.admins for select to authenticated using (user_id = auth.uid());
