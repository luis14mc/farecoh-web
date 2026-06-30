# RBAC Admin - FARECOH

El esquema canónico vive en `supabase/migrations/001_ticketing_core.sql`. Ejecuta ese archivo antes de configurar usuarios admin (ver `docs/database-setup.md`).

## Tablas RBAC

**roles**

- `super_admin`
- `event_manager`
- `seller`
- `checkin_operator`

**users**

```sql
id uuid primary key
auth_user_id uuid references auth.users(id)
email text unique
full_name text
role_id uuid references roles(id)
active boolean default true
created_at timestamptz default now()
```

## Mapa de permisos

| Ruta | Roles permitidos |
| --- | --- |
| `/admin` | `super_admin`, `event_manager` |
| `/admin/users` | `super_admin` |
| `/admin/tickets` | `super_admin`, `event_manager`, `seller` |
| `/admin/batches` | `super_admin`, `event_manager` |
| `/admin/sales` | `super_admin`, `event_manager`, `seller` |
| `/admin/checkin` | `super_admin`, `event_manager`, `checkin_operator` |
| `/admin/reports` | `super_admin`, `event_manager` |
| `/admin/vendors` | `super_admin`, `event_manager` |

## Reglas

- El módulo `/admin/users` solo lo ve y accede `super_admin`.
- Ocultar links no es suficiente: `src/middleware.ts` valida cada ruta antes de renderizar.
- Los roles se consultan desde `public.users` + `public.roles`.
- No se guardan roles en `localStorage`.
- No se permite editar el propio rol desde frontend.

## Crear super_admin

1. Crear el usuario en Supabase Auth.
2. Copiar `auth.users.id`.
3. Ejecutar:

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

## Crear seller

```sql
INSERT INTO public.users (auth_user_id, email, full_name, role_id, active)
SELECT
  'AUTH_USER_UUID',
  'seller@farecoh.org',
  'Nombre Vendedor',
  r.id,
  true
FROM public.roles r
WHERE r.name = 'seller';
```

## Crear checkin_operator

```sql
INSERT INTO public.users (auth_user_id, email, full_name, role_id, active)
SELECT
  'AUTH_USER_UUID',
  'checkin@farecoh.org',
  'Operador Check-in',
  r.id,
  true
FROM public.roles r
WHERE r.name = 'checkin_operator';
```

## Revocar acceso

```sql
UPDATE public.users
SET active = false
WHERE email = 'usuario@farecoh.org';
```

## Probar acceso directo

- Iniciar sesión como `seller` e intentar `/admin/users`: debe redirigir a `/admin/sales`.
- Iniciar sesión como `checkin_operator` e intentar `/admin/sales`: debe redirigir a `/admin/checkin`.
- Entrar sin sesión a `/admin`: debe redirigir a `/admin/login`.
