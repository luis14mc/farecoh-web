# Configuración de PostgreSQL

En local, define `DATABASE_URL` y `AUTH_SECRET` en el entorno, ejecuta `pnpm db:init` y crea tu cuenta con:

```sh
pnpm db:create-admin -- --email admin@ejemplo.org --name "Administrador FARECOH"
```

Entra en `/admin/login` con la contraseña suministrada o con la que genera el comando. Para producción, consulta la [guía de despliegue en Railway](railway-deploy.md).
