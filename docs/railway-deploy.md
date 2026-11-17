# Desplegar FARECOH en Railway

1. En el proyecto de Railway, agrega un servicio PostgreSQL llamado `Postgres`.
2. En el servicio web, conecta el repositorio y selecciona la rama que vas a desplegar. Configura `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `HOST=0.0.0.0`, `PUBLIC_SITE_URL` con el dominio HTTPS y `AUTH_SECRET` con un valor aleatorio de al menos 32 caracteres. Railway asigna `PORT` al servicio.
3. En el servicio web agrega también el admin inicial: `ADMIN_EMAIL`, `ADMIN_PASSWORD` (mínimo 10 caracteres) y, si quieres, `ADMIN_NAME`.
4. Ejecuta el primer deploy. `railway.json` instala desde el lockfile, compila y, antes de arrancar, ejecuta `pnpm db:deploy` (migraciones + seed) en la red privada. El seed carga roles, el evento Pink Floyd, las plantillas de boletos y crea el admin inicial **solo si no existe**: nunca cambia la contraseña de un usuario existente, así que es seguro en cada deploy.
5. Después del primer login puedes borrar `ADMIN_PASSWORD` de las variables de Railway. Para cambiar una contraseña más adelante usa `pnpm db:create-admin -- --email ... --name ... --reset-password` con `railway run` (requiere habilitar temporalmente el proxy TCP de PostgreSQL y usar `${{Postgres.DATABASE_PUBLIC_URL}}`).
6. Abre `/admin/login`, crea un evento en **Eventos** y actívalo con el interruptor **Publicado**. Verifica la cartelera en `/#eventos`, `/eventos` y la página del evento. Puedes retirar el proxy y la variable temporal después de la inicialización.

`pnpm db:seed` carga roles, Pink Floyd y las plantillas de boletos. Los boletos y las asignaciones de banda de Pink Floyd se cargan únicamente con `pnpm db:seed --operational`. Para crear inventario de un evento nuevo, abre **Generar boletos** desde su fila en el admin.

## Importar los datos reales desde Supabase

Hazlo una sola vez, después del primer deploy (cuando las migraciones y el seed ya corrieron).

1. En Supabase: **Project Settings › Database › Connection string › Session pooler** (puerto 5432). Copia la URL con la contraseña de la base.
2. En Railway habilita temporalmente el proxy TCP de PostgreSQL y copia `DATABASE_PUBLIC_URL`.
3. Desde tu checkout local (`pnpm install --frozen-lockfile`):

   ```sh
   export SOURCE_DATABASE_URL="postgresql://postgres.<ref>:<clave>@aws-0-<region>.pooler.supabase.com:5432/postgres"
   export DATABASE_URL="<DATABASE_PUBLIC_URL de Railway>"
   pnpm db:import-supabase              # simulación: muestra la tabla de resultados y no guarda nada
   pnpm db:import-supabase -- --execute # aplica la importación
   ```

El script copia eventos, vendedores, lotes, boletos, ventas, ingresos, notificaciones, auditoría, músicos y plantillas de impresión conservando los UUID y los códigos QR. Empareja Pink Floyd por slug con el evento del seed, todo va en una sola transacción y al final verifica que todos los boletos de Supabase existan en Railway; si algo falla, no se guarda nada. Se puede repetir sin duplicar datos. Los usuarios del staff **no** se importan (sus contraseñas vivían en Supabase Auth): créalos de nuevo desde **Admin › Usuarios**.

## Restaurar una base previa

Si tienes datos previos, restaura el volcado en una base destino vacía **antes del primer deploy del servicio web**. Usa una versión de `pg_dump` que pueda leer el servidor de origen.

```sh
pg_dump --no-owner --no-acl --file=farecoh-backup.sql "$SOURCE_DATABASE_URL"
psql --set=ON_ERROR_STOP=1 --single-transaction --file=farecoh-backup.sql "$TARGET_DATABASE_URL"
```

Usa la URL pública del destino si ejecutas estos comandos desde tu equipo. Tras restaurar, despliega el servicio para aplicar las migraciones pendientes y ejecuta el seed base. Si el respaldo incluye un administrador anterior, restablece su clave con `db:create-admin -- --email ... --name ... --reset-password`.

Referencias: [Configuración como código](https://docs.railway.com/config-as-code/reference), [PostgreSQL](https://docs.railway.com/databases/postgresql), [railway run](https://docs.railway.com/cli/run).
