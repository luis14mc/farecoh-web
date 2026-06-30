# FARECOH Event Platform - Setup MVP

## Stack

- Astro
- Tailwind CSS 4
- DaisyUI
- TypeScript
- Supabase
- PostgreSQL
- Zod

## Variables de entorno

Crea `.env` desde `.env.example` si existe, o agrega:

```bash
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=server-only-service-role-key
SUPABASE_STORAGE_BUCKET=farecoh-private
```

`SUPABASE_SERVICE_ROLE_KEY` debe usarse solo en endpoints server-side.

## Base de datos

1. Abre Supabase SQL Editor.
2. Ejecuta `supabase/migrations/001_ticketing_core.sql`.
3. Sigue la guía completa en `docs/database-setup.md`.
4. Crea usuarios admin en Supabase Auth.
5. Inserta el perfil en `public.users` con el rol correspondiente.

Ejemplo:

```sql
INSERT INTO public.users (auth_user_id, email, full_name, role_id, active)
SELECT
  'AUTH_USER_UUID',
  'admin@farecoh.org',
  'FARECOH Admin',
  r.id,
  true
FROM public.roles r
WHERE r.name = 'super_admin';
```

## Evento inicial

- Slug: `pink-floyd`
- Nombre: Tributo a Pink Floyd 2026
- Fecha: 08 Agosto 2026
- Hora: 8:00 PM
- Lugar: Escuela Nacional de Música, Tegucigalpa
- Donativo: L.500

## Rutas objetivo del MVP

Públicas:

- `/`
- `/eventos/pink-floyd`
- `/eventos/pink-floyd/boletos`

Administración:

- `/admin`
- `/admin/ventas`
- `/admin/boletos`
- `/admin/checkin`
- `/admin/reportes`

## Comandos

```bash
pnpm install
pnpm run dev
pnpm run build
```

Si pnpm bloquea scripts nativos:

```bash
pnpm approve-builds
```

Aprueba `esbuild` y `sharp`.

## Pruebas propuestas

Las pruebas críticas viven en `tests/ticketing.test.ts` y cubren:

- generación `PF-000001`
- normalización y parsing de códigos
- rechazo de secuencias inválidas
- métricas de ventas/check-in/capacidad
- sanitización
- rate limiting básico

Para ejecutarlas en una fase posterior se recomienda añadir `tsx` o `vitest` como dependencia de desarrollo.
