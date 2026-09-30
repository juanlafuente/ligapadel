# Liga de Pádel

Web para gestionar una liga de pádel entre amigos: grupos con ascensos y descensos,
calendario generado automáticamente con parejas que rotan y clasificación individual.

## Reglas

- Grupos de 4 jugadores, ordenados por nivel (A oro > B plata > C bronce).
- En cada grupo se juegan los **3 partidos** posibles sin repetir pareja (cada jugador juega una vez
  con cada compañero), uno por semana: **semanas 1, 2 y 3**.
- La **semana 4 es de recuperación**: si un partido se aplaza, se mueve ahí desde «Editar».
- Resultados por sets (6-4, 7-5, 7-6…); el tercer set se juega completo.
- Cada victoria vale **1 punto**, da igual ganar 2-0 o 2-1 (victorias y derrotas, como en la NFL).
- Clasificación: victorias → diferencia de sets → diferencia de juegos → juegos ganados → sorteo.
- Al cerrar la vuelta **suben los 2 primeros y bajan los 2 últimos** entre Oro y Plata y entre Plata y Bronce.
  Si hay empate total, al cerrar la vuelta se indica el orden según el sorteo; la posición final queda guardada.

### Temporada

- Cada vuelta cerrada da **puntos de temporada** según el grupo y la posición final:

  | Grupo | 1º | 2º | 3º | 4º |
  |---|---|---|---|---|
  | Oro | 12 | 10 | 8 | 6 |
  | Plata | 9 | 7 | 5 | 3 |
  | Bronce | 6 | 4 | 2 | 0 |

- A igualdad de puntos gana quien sumó más en la última vuelta.
- Desde Admin se empieza una temporada nueva (p. ej. cada 4 o 5 vueltas); las anteriores se conservan.

### Medallero (histórico)

- 🥇 🥈 🥉 = vueltas cerradas jugadas en Oro, Plata y Bronce; ⭐ = veces 1º de su grupo.
- Orden como en las olimpiadas: más 🥇, luego más 🥈, luego más 🥉; si siguen empatados,
  más ⭐ en Oro y después mejor posición media.

### Índice Matilda

- Rating tipo Elo para parejas: todos empiezan en 1000, la fuerza de una pareja es la media de sus dos
  jugadores y el cambio depende de lo esperado que fuera el resultado (máximo 32 por partido, +20 % si se gana 2-0).
- Es histórico: no se reinicia con las temporadas.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173/laligamatilda/
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
2. En **SQL Editor**, ejecuta por orden `001_init.sql`, `002_funciones.sql` y `003_temporadas.sql` (carpeta `supabase/migrations`).
3. Copia `.env.example` a `.env.local` y rellena la URL y la clave *publishable*
   (Project Settings → API). **No uses nunca la clave `service_role` en la web.**
4. En **Authentication → URL Configuration**, pon como *Site URL* `https://<usuario>.github.io/laligamatilda/`
   y añade como *Redirect URLs* `https://<usuario>.github.io/laligamatilda/**` y `http://localhost:5173/laligamatilda/**`.
5. Para darte de alta como administrador, entra una vez en la web (Admin → tu email) y después ejecuta en el SQL Editor:
   ```sql
   insert into public.admins (user_id, nombre)
   select id, 'Tu nombre' from auth.users where email = 'tu@email.com';
   ```
6. Cuando estén dados de alta todos los admins, desactiva **Authentication → Sign In / Providers →
   Allow new users to sign up**.

## Uso

1. **Admin → Jugadores:** da de alta a todos.
2. **Admin → Nueva vuelta:** reparte los jugadores en A, B y C, genera el calendario y guárdalo.
3. **Calendario:** mete resultados o edita partidos (cambiar de semana, sustituir jugadores, aplazar).
   La web avisa si un cambio rompe alguna regla.
4. **Admin → Cerrar vuelta:** congela la vuelta y propone los grupos de la siguiente con los ascensos y descensos.

## Despliegue en GitHub Pages

1. En el repositorio: **Settings → Pages → Source: GitHub Actions**.
2. En **Settings → Secrets and variables → Actions → Variables**, crea `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_PUBLISHABLE_KEY` (son públicas por diseño; los permisos los controla la base de datos).
3. Cada push a `main` pasa los tests, compila y publica en `https://<usuario>.github.io/laligamatilda/`.
