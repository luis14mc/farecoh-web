# FARECOH Event Platform - Setup & Deployment Guide

## Stack

- **Framework**: Astro 7 (Node.js Standalone SSR)
- **UI & Components**: React 19, Tailwind CSS 4, Radix UI, Lucide Icons
- **Database**: PostgreSQL (Railway) via `pg`
- **Authentication**: Native session auth with `crypto.scrypt` password hashing + HMAC-SHA256 session cookies
- **Validation**: Zod & TypeScript
- **Deployment**: Railway (Nixpacks / Node.js)

## Variables de Entorno

Configura en tu archivo `.env` local o en las variables de servicio de Railway:

```bash
# Servidor & Dominio
PORT=4321
PUBLIC_SITE_URL=https://farecoh.org

# Base de Datos PostgreSQL (Railway)
DATABASE_URL=postgresql://postgres:password@roundhouse.proxy.rlwy.net:5432/railway

# Clave secreta para sesiones administrativas (32+ caracteres)
AUTH_SECRET=genera-una-cadena-secreta-larga-para-produccion

# Alertas WhatsApp para el staff (Opcional - Twilio)
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
FARECOH_NOTIFY_WHATSAPP_TO=whatsapp:+504XXXXXXXX
```

## Base de Datos (PostgreSQL en Railway)

1. En Railway, crea un servicio **PostgreSQL**.
2. Conéctate a la base de datos o copia la variable `DATABASE_URL`.
3. Inicializa el esquema ejecutando:
   ```bash
   pnpm db:init
   ```
   o aplica directamente `database/schema.sql` usando `psql`:
   ```bash
   psql "$DATABASE_URL" -f database/schema.sql
   ```
4. El esquema creará las tablas, índices, funciones RPC (`create_ticket_order`, `validate_ticket`, `staff_reserve_ticket`, etc.) y el usuario inicial:
   - **Correo**: `admin@farecoh.org`
   - **Contraseña inicial**: `Admin2026!farecoh`
   *(Cambia esta contraseña desde el panel de usuarios tras iniciar sesión)*.

## Comandos

```bash
# Instalar dependencias
pnpm install

# Inicializar base de datos
pnpm db:init

# Servidor de desarrollo
pnpm dev

# Ejecutar suite de pruebas (73 tests)
pnpm test

# Compilación para producción
pnpm build

# Iniciar servidor compilado (producción)
pnpm start
```

## Despliegue en Railway

El proyecto incluye `railway.json` preconfigurado:
- **Build command**: `pnpm build`
- **Start command**: `node ./dist/server/entry.mjs`
- **Healthcheck**: `/`
- Añade las variables `DATABASE_URL` y `AUTH_SECRET` en Railway Dashboard.

## Rutas Principales

### Públicas:
- `/` - Página principal rediseñada con animación y estética cultural.
- `/eventos/pink-floyd` - Landing page del evento Tributo a Pink Floyd.
- `/eventos/pink-floyd/boletos` - Flujo de reserva pública de boletos con validación y confirmación.

### Administración (`/admin`):
- `/admin` - Dashboard con métricas de ventas, ingresos, capacidad y accesos rápidos.
- `/admin/ventas` - Registro de ventas directas.
- `/admin/boletos` - Visualización, búsqueda y gestión del inventario de boletos.
- `/admin/reservas` - Monitoreo y confirmación de pagos de reservas en línea.
- `/admin/checkin` - Control de acceso con escáner QR en vivo y validación por código.
- `/admin/lotes` - Asignación de lotes de boletos físicos a vendedores.
- `/admin/reportes` - Reportes de ventas, exportación CSV e indicadores clave.
- `/admin/usuarios` - Gestión de administradores, operadores y vendedores.
