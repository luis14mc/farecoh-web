# Admin Auth - FARECOH

## Variables requeridas

```bash
PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

## Ejecutar schema

En Supabase SQL Editor:

```sql
supabase/schema-admin-auth.sql
```

Esto crea `staff_profiles` con roles:

- `super_admin`
- `event_manager`
- `seller`
- `checkin_operator`

## Crear usuario en Supabase Auth

1. Ir a Supabase Dashboard > Authentication > Users.
2. Crear usuario, por ejemplo `admin@farecoh.org`.
3. Copiar el `user_id` del usuario creado.

## Asignar rol

Ejecutar, reemplazando `AUTH_USER_UUID`:

```sql
insert into public.staff_profiles (user_id, email, full_name, role, active)
values ('AUTH_USER_UUID', 'admin@farecoh.org', 'FARECOH Admin', 'super_admin', true);
```

TambiÃ©n existe un template en:

```text
supabase/seed-admin-auth.sql
```

## Permisos por rol

`super_admin`:

- `/admin`
- `/admin/ventas`
- `/admin/boletos`
- `/admin/lotes`
- `/admin/reportes`
- `/admin/checkin`
- `/admin/vendedores`

`event_manager`:

- `/admin`
- `/admin/ventas`
- `/admin/boletos`
- `/admin/lotes`
- `/admin/reportes`

`seller`:

- `/admin/ventas`

`checkin_operator`:

- `/admin/checkin`

## Revocar acceso

```sql
update public.staff_profiles
set active = false
where email = 'usuario@farecoh.org';
```

## Cambiar rol

```sql
update public.staff_profiles
set role = 'event_manager'
where email = 'usuario@farecoh.org';
```

## Probar rutas protegidas

1. Abrir `/admin` sin sesiÃ³n.
2. Debe redirigir a `/admin/login`.
3. Iniciar sesiÃ³n con un usuario existente en Supabase Auth.
4. Confirmar que existe en `staff_profiles` y `active = true`.
5. Intentar abrir una ruta no permitida por el rol.
6. Debe redirigir a `/admin/no-autorizado`.

## Importante

El proyecto usa `output: "server"` y adaptador Vercel para que el middleware proteja `/admin` en runtime. Un build puramente estÃ¡tico no puede proteger rutas privadas de forma segura.