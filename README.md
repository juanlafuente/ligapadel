# Liga de Pádel

Web para gestionar una liga de pádel entre amigos: grupos con ascensos y descensos,
calendario generado automáticamente con parejas que rotan y clasificación individual.

## Reglas

- Cada vuelta, cada jugador juega **4 partidos** sin repetir compañero y como mucho 1 por semana.
- Grupos de 4 o 5 jugadores, ordenados por nivel (A > B > C).
  - **12 jugadores (4-4-4):** A juega 3 internos + 1 cruzado con B; B juega 2 internos + 1 con A + 1 con C;
    C juega 3 internos + 1 con B. 12 partidos en 4 semanas, todos juegan cada semana.
  - **13 jugadores (p. ej. 4-4-5):** el grupo de 5 juega 5 partidos internos (en cada uno descansa uno)
    y cada jugador es pareja de todos los demás una vez. La vuelta dura 5 semanas y cada jugador descansa una.
- Resultados por sets (6-4, 7-5, 7-6…); el tercer set se juega completo.
- Ganar 2-0: **3 puntos** para el ganador y 0 para el perdedor. Ganar 2-1: **2 y 1 puntos**.
- Clasificación: puntos → diferencia de juegos → juegos ganados → sorteo.
  Los partidos cruzados cuentan para la clasificación del grupo de cada jugador.
- Al cerrar la vuelta sube el primero y baja el último de cada grupo.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173/ligapadel/
npm test         # tests de la lógica (src/domain)
npm run build
```

## Estructura

```
src/domain/     lógica sin dependencias: generador, puntuación, clasificación, ascensos
src/            interfaz (React)
supabase/       esquema de base de datos y permisos
.github/        despliegue automático en GitHub Pages
```

## Puesta en marcha de Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecuta `supabase/migrations/001_init.sql`.
3. Copia `.env.example` a `.env.local` y rellena la URL y la clave *publishable*
   (Project Settings → API). **No uses nunca la clave `service_role` en la web.**
4. Para darte de alta como administrador, entra una vez en la web con tu email y después ejecuta en el SQL Editor:
   ```sql
   insert into public.admins (user_id, nombre)
   select id, 'Tu nombre' from auth.users where email = 'tu@email.com';
   ```

## Despliegue en GitHub Pages

1. En el repositorio: **Settings → Pages → Source: GitHub Actions**.
2. En **Settings → Secrets and variables → Actions → Variables**, crea `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_PUBLISHABLE_KEY` (son públicas por diseño; los permisos los controla la base de datos).
3. Cada push a `main` pasa los tests, compila y publica en `https://<usuario>.github.io/ligapadel/`.
