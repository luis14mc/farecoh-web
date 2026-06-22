# RBAC Admin - FARECOH

## Tabla staff_profiles

```sql
id uuid primary key
user_id uuid references auth.users(id)
email text unique
full_name text
role text
active boolean default true
created_at timestamp default now()
```

Roles validos:

- `super_admin`
- `event_manager`
- `seller`
- `checkin_operator`

## Mapa de permisos

| Ruta | Roles permitidos |
| --- | --- |
| `/admin` | `super_admin`, `event_manager` |
| `/admin/usuarios` | `super_admin` |
| `/admin/boletos` | `super_admin`, `event_manager`, `seller` |
| `/admin/lotes` | `super_admin`, `event_manager` |
| `/admin/ventas` | `super_admin`, `event_manager`, `seller` |
| `/admin/checkin` | `super_admin`, `event_manager`, `checkin_operator` |
| `/admin/reportes` | `super_admin`, `event_manager` |
| `/admin/vendedores` | `super_admin`, `event_manager` |

## Reglas

- El modulo `/admin/usuarios` solo lo ve y accede `super_admin`.
- Ocultar links no es suficiente: `src/middleware.ts` valida cada ruta antes de renderizar.
- Los roles se consultan desde Supabase en `staff_profiles`.
- No se guardan roles en `localStorage`.
- No se permite editar el propio rol desde frontend.

## Crear super_admin

1. Crear el usuario en Supabase Auth.
2. Copiar `auth.users.id`.
3. Ejecutar:

```sql
insert into public.staff_profiles (user_id, email, full_name, role, active)
values ('AUTH_USER_UUID', 'admin@farecoh.org', 'FARECOH Admin', 'super_admin', true);
```

## Crear seller

```sql
insert into public.staff_profiles (user_id, email, full_name, role, active)
values ('AUTH_USER_UUID', 'seller@farecoh.org', 'Nombre Vendedor', 'seller', true);
```

## Crear checkin_operator

```sql
insert into public.staff_profiles (user_id, email, full_name, role, active)
values ('AUTH_USER_UUID', 'checkin@farecoh.org', 'Operador Check-in', 'checkin_operator', true);
```

## Revocar acceso

```sql
update public.staff_profiles
set active = false
where email = 'usuario@farecoh.org';
```

## Probar acceso directo

- Iniciar sesion como `seller` e intentar `/admin/usuarios`: debe redirigir a `/admin/ventas`.
- Iniciar sesion como `checkin_operator` e intentar `/admin/ventas`: debe redirigir a `/admin/checkin`.
- Entrar sin sesion a `/admin`: debe redirigir a `/admin/login`.