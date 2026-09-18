# RBAC Admin - FARECOH

El esquema canónico vive en `database/schema.sql`. Ejecuta ese archivo antes de configurar usuarios admin (ver `docs/database-setup.md`).

## Tablas RBAC

**roles**

- `super_admin`
- `event_manager`
- `seller`
- `checkin_operator`

**users**

```sql
id uuid primary key default gen_random_uuid()
email text unique not null
password_hash text not null
full_name text not null
role_id uuid references roles(id) not null
active boolean default true not null
created_at timestamptz default now()
updated_at timestamptz default now()
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
- Ocultar links no es suficiente: `src/middleware/admin.ts` valida cada ruta antes de renderizar.
- Los roles se consultan desde `public.users` + `public.roles`.
- Las contraseñas se almacenan con hash criptográfico (`crypto.scrypt`).
- Las sesiones se gestionan mediante cookies seguras firmadas con HMAC-SHA256 (`AUTH_SECRET`).
- No se permite editar el propio rol desde frontend.

## Gestión de usuarios

Los usuarios pueden crearse, activarse, desactivarse y modificarse directamente desde la interfaz web en:
`/admin/users` (disponible para `super_admin`).

También pueden gestionarse mediante SQL:

### Revocar acceso

```sql
UPDATE public.users
SET active = false
WHERE email = 'usuario@farecoh.org';
```

## Probar acceso directo

- Iniciar sesión como `seller` e intentar `/admin/users`: debe redirigir a `/admin/sales`.
- Iniciar sesión como `checkin_operator` e intentar `/admin/sales`: debe redirigir a `/admin/checkin`.
- Entrar sin sesión a `/admin`: debe redirigir a `/admin/login`.
