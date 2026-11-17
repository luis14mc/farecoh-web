# Desplegar FARECOH en Railway

1. En el proyecto de Railway, agrega un servicio PostgreSQL llamado `Postgres`.
2. En el servicio web, conecta el repositorio y selecciona la rama que vas a desplegar. Configura `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `HOST=0.0.0.0`, `PUBLIC_SITE_URL` con el dominio HTTPS y `AUTH_SECRET` con un valor aleatorio de al menos 32 caracteres. Railway asigna `PORT` al servicio.
3. Aplica las variables y ejecuta el primer deploy. `railway.json` instala desde el lockfile, compila, ejecuta `pnpm db:migrate` en la red privada y arranca con `pnpm start`. Revisa que el paso de migración termine correctamente.
4. En un checkout local con Node 22 y pnpm, ejecuta `pnpm install --frozen-lockfile`, `railway login` y `railway link`. Selecciona el mismo proyecto y entorno. `railway run` ejecuta los scripts en tu equipo, así que habilita temporalmente el proxy TCP en PostgreSQL y configura `BOOTSTRAP_DATABASE_URL=${{Postgres.DATABASE_PUBLIC_URL}}` en el servicio web.
5. Ejecuta estos comandos desde el checkout. Sustituye `web` por el nombre del servicio. Si deseas elegir la contraseña, pásala a través de `ADMIN_PASSWORD` en el entorno. Guarda la contraseña generada si el script la imprime.

   ```sh
   railway run --service web sh -c 'DATABASE_URL="$BOOTSTRAP_DATABASE_URL" pnpm db:seed'
   railway run --service web sh -c 'DATABASE_URL="$BOOTSTRAP_DATABASE_URL" pnpm db:create-admin -- --email admin@ejemplo.org --name "Administrador FARECOH"'
   ```

   En PowerShell, si no tienes `sh`:

   ```powershell
   railway run --service web pwsh -NoProfile -Command '$env:DATABASE_URL=$env:BOOTSTRAP_DATABASE_URL; pnpm db:seed'
   railway run --service web pwsh -NoProfile -Command '$env:DATABASE_URL=$env:BOOTSTRAP_DATABASE_URL; pnpm db:create-admin -- --email admin@ejemplo.org --name "Administrador FARECOH"'
   ```

6. Abre `/admin/login`, crea un evento en **Eventos** y actívalo con el interruptor **Publicado**. Verifica la cartelera en `/#eventos`, `/eventos` y la página del evento. Puedes retirar el proxy y la variable temporal después de la inicialización.

`pnpm db:seed` carga roles, Pink Floyd y las plantillas de boletos. Los boletos y las asignaciones de banda de Pink Floyd se cargan únicamente con `pnpm db:seed --operational`. Para crear inventario de un evento nuevo, abre **Generar boletos** desde su fila en el admin.

## Restaurar una base previa

Si tienes datos previos, restaura el volcado en una base destino vacía **antes del primer deploy del servicio web**. Usa una versión de `pg_dump` que pueda leer el servidor de origen.

```sh
pg_dump --no-owner --no-acl --file=farecoh-backup.sql "$SOURCE_DATABASE_URL"
psql --set=ON_ERROR_STOP=1 --single-transaction --file=farecoh-backup.sql "$TARGET_DATABASE_URL"
```

Usa la URL pública del destino si ejecutas estos comandos desde tu equipo. Tras restaurar, despliega el servicio para aplicar las migraciones pendientes y ejecuta el seed base. Si el respaldo incluye un administrador anterior, restablece su clave con `db:create-admin -- --email ... --name ... --reset-password`.

Referencias: [Configuración como código](https://docs.railway.com/config-as-code/reference), [PostgreSQL](https://docs.railway.com/databases/postgresql), [railway run](https://docs.railway.com/cli/run).
