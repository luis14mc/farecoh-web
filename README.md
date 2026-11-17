# [FARECOH](https://farecoh.org)

Sitio institucional y plataforma de reservas, venta y control de boletos culturales.

Presenta los programas de la Fundación Artes Educativas, Coros y Orquestas de Honduras y permite al personal gestionar compradores, boletos e ingreso a eventos.

Estado documentado: **17 de noviembre de 2026**, rama `new-design`. Describe el código actual, no una auditoría del servicio desplegado.

## Demo

Dominio configurado: [farecoh.org](https://farecoh.org). Acceso del personal: `/admin/login`.

Referencia visual: [home en Stitch](https://stitch.withgoogle.com/projects/157857507879595519/screens/80c646910a0d4830bc3a33f885b47d3c).

## Install

Requiere **Node.js 22 o superior** y PostgreSQL para las operaciones administrativas y de boletos. `.nvmrc` y `.node-version` señalan Node 22.

Desde la raíz de una copia del repositorio:

```bash
npm install
```

Estas instrucciones usan npm porque el `pnpm-workspace.yaml` actual provoca `packages field missing or empty` con pnpm en el entorno verificado. El repositorio conserva `pnpm-lock.yaml`; no incluye `package-lock.json`.

## Quickstart

Para explorar la página pública:

```bash
npm run dev
```

Abre [localhost:4321](http://localhost:4321). El servidor escucha en las interfaces de red disponibles. Sin PostgreSQL, el contenido institucional sigue siendo estático y el evento dispone de datos de respaldo; reservar, autenticar personal y operar inventario requiere base de datos.

### Habilitar el sistema de eventos

1. Ejecuta `cp .env.example .env` y configura las variables de la tabla siguiente.
2. Usa una base PostgreSQL propia. Antes de modificar una base existente, realiza un respaldo y revisa `database/schema.sql`: incluye estructura, funciones y datos iniciales.
3. Aplica el esquema cargando explícitamente `.env`:

   ```bash
   node --env-file=.env --experimental-strip-types scripts/init-db.ts
   ```

4. Ejecuta `npm run dev` y entra en `/admin/login`.
5. Ejecuta `pnpm db:init` y crea tu cuenta con `pnpm db:create-admin -- --email admin@ejemplo.org --name "Administrador FARECOH"`. Consulta la [guía de Railway](docs/railway-deploy.md).

Los scripts ejecutados directamente con Node no cargan `.env` automáticamente. Usa `--env-file=.env` o proporciona las variables en el entorno del proceso.

### Variables de entorno

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto HTTP; por defecto, `4321`. |
| `PUBLIC_SITE_URL` | URL pública para enlaces de boletos y funciones que construyen URLs. Debe ser accesible para los asistentes. |
| `DATABASE_URL` | Conexión PostgreSQL para autenticación, inventario y operaciones. |
| `AUTH_SECRET` | Secreto privado para firmar sesiones; genera un valor aleatorio de al menos 32 caracteres. |
| `WHATSAPP_PROVIDER` | Proveedor opcional de alertas al personal: `twilio` o `meta`. |
| `FARECOH_NOTIFY_WHATSAPP_TO` | Destinatario de alertas de nuevas reservas. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` | Credenciales y remitente de Twilio WhatsApp. |
| `META_WHATSAPP_ACCESS_TOKEN`, `META_WHATSAPP_PHONE_NUMBER_ID`, `META_WHATSAPP_FROM` | Configuración alternativa de Meta WhatsApp Cloud API. |

No publiques `.env`, credenciales ni datos personales. Las variables de WhatsApp son privadas y no deben llevar el prefijo `PUBLIC_`. Astro también fija `https://farecoh.org` en `astro.config.mjs`; cambiar de dominio requiere revisar esa configuración.

## Página web institucional

El home adopta el sistema claro del mockup de Stitch: navbar blanca, azul institucional, superficies claras, titulares Plus Jakarta Sans y texto Inter. **El hero conserva su composición, textos, botones y escena 3D**; no se sustituye por el hero fotográfico del mockup.

Orden actual: **hero 3D → cuatro pilares → programas → quiénes somos → impacto → cartelera → invitación a colaborar → footer azul**.

| Ruta | Contenido |
| --- | --- |
| `/` | Inicio institucional rediseñado. |
| `/sobre-nosotros` | Información, misión y visión institucionales. |
| `/nosotros` | Redirección permanente a `/sobre-nosotros`. |
| `/programas` | Coros y Orquestas Infantiles-Juveniles, Coro de Manos Blancas, Estimulación Temprana, Pintura y Formación Visual. |
| `/junta-directiva` | Integrantes y gobierno de la fundación. |
| `/alianzas` | Aliados y cooperación institucional. |
| `/eventos/pink-floyd` | Página del concierto Tributo a Pink Floyd. |
| `/eventos/pink-floyd/boletos` | Formulario público de reserva. |
| `/t/[token]` | Consulta del boleto mediante su token QR. |
| `/sitemap.xml` | Sitemap generado por la aplicación. |

- **Contenido:** información institucional en `src/data/farecoh.ts`; fotos y logotipos en `public/images/`.
- **Escena 3D:** Three.js, modelos locales y piano procedural en el componente de orquesta.
- **Diseño adaptable:** navegación de escritorio, menú móvil y tarjetas y columnas que se reorganizan según el ancho.
- **Elementos compartidos:** navbar y footer institucionales también afectan páginas internas. El home usa los componentes `Stitch*`; las páginas internas conservan sus propias composiciones.
- **Citas institucionales:** misión y visión atribuidas a FARECOH, no testimonios de beneficiarios reales.

## Reservas, venta y operación

El sistema está centrado en el evento `pink-floyd`. Los datos de respaldo indican **29 de agosto de 2026, 8:00 p. m., Escuela Nacional de Música, Tegucigalpa**, boleto de **L 500** e inventario inicial de **500 boletos**, con códigos `PF-000001` a `PF-000500`. La página del evento intenta consultar PostgreSQL; el home usa una instantánea estática desde `src/data/event.ts`.

### Flujo de boletos

1. El comprador envía una reserva mediante `POST /api/tickets/reserve`.
2. La operación reserva inventario en PostgreSQL. El cupo en línea excluye boletos asignados a lotes y al control de banda.
3. El personal revisa la reserva, contacta al comprador y confirma el pago manualmente. **Reservar no equivale a pagar**; este flujo no integra una pasarela de cobro.
4. El personal entrega el boleto digital y el comprador consulta su estado mediante el QR.
5. El operador valida el ingreso. Las funciones transaccionales bloquean el boleto para impedir una segunda validación.

Estados principales: `available → reserved → sold → validated`. También existe `assigned` para distribución por lotes. Cancelar una reserva devuelve el boleto a `available` o `assigned`, según su origen, sin eliminar su identidad ni token.

### Panel administrativo

| Ruta | Función |
| --- | --- |
| `/admin` | Resumen operativo y estadísticas. |
| `/admin/tickets` | Inventario, búsqueda y estado de boletos. |
| `/admin/reservations` | Seguimiento, reserva manual, confirmación de pago y cancelación. |
| `/admin/sales` | Operación de ventas. |
| `/admin/batches` | Lotes de boletos físicos. |
| `/admin/vendors` | Vendedores. |
| `/admin/band-assignments` | Control de boletos de integrantes de banda. |
| `/admin/delivery` | Entrega digital e imágenes individuales. |
| `/admin/checkin` | Lectura y validación de ingreso. |
| `/admin/printing` | Preparación de impresión. |
| `/admin/printing/calibration` | Calibración de impresión. |
| `/admin/reports` | Consulta de reportes. |
| `/admin/users` | Gestión de usuarios, exclusiva del superadministrador. |

Permisos definidos en `src/lib/rbac-policy.ts`:

- **`super_admin`:** acceso completo y gestión de usuarios.
- **`event_manager`:** operación del evento, reportes, vendedores, lotes, impresión y banda; sin gestión de usuarios.
- **`seller`:** boletos, reservas, ventas y entrega digital.
- **`checkin_operator`:** validación de ingreso.

La autenticación usa contraseñas con `crypto.scrypt` y cookies firmadas con HMAC-SHA256. El middleware protege las páginas `/admin`; las APIs aplican sus controles en los respectivos endpoints. Restablecer contraseñas requiere asistencia del superadministrador, no un correo automático de recuperación.

### Entrega, impresión y avisos

- **Entrega móvil:** PNG por boleto, descarga secuencial por comprador y mensaje de WhatsApp. Los adjuntos se agregan manualmente; abrir el chat no envía imágenes automáticamente.
- **Impresión:** generación de PDF, calibración y configuración de layouts físicos y digitales, además de exportación CSV para Canva.
- **QR:** generación de PNG y consulta pública por token; la validación de ingreso corresponde al personal autorizado.
- **Alertas:** integración opcional de WhatsApp para nuevas reservas mediante Twilio o Meta, con registro de notificaciones.
- **Auditoría:** registro de operaciones de reservas, ventas y validaciones en PostgreSQL.

## Estado técnico y límites actuales

Stack actual: **Astro 7**, renderizado en servidor con adaptador **Node standalone**, **React 19**, **TypeScript**, **Tailwind CSS 4**, Radix UI, Lucide y Three.js. La conexión a PostgreSQL usa `pg` directamente; la autenticación y la base de datos actuales no requieren Supabase.

Verificación local del 17 de noviembre de 2026:

| Comprobación | Resultado |
| --- | --- |
| `npm test` | **73 pruebas aprobadas**, 0 fallidas. |
| `npm run build` | Falla al resolver `@radix-ui/react-progress` desde `src/components/ui/progress.tsx` en la instalación local, aunque está declarado en `package.json`. |
| pnpm | Rechaza el workspace por ausencia del campo `packages`. |

Las pruebas no certifican una base de producción, los proveedores externos ni el recorrido completo en navegador. No se verificó una instalación limpia ni un despliegue en esta revisión.

Pendientes y consideraciones:

- Los enlaces de apoyo y donación apuntan a `/donaciones`, pero esa página no existe actualmente.
- «Ver calendario anual» lleva al evento Pink Floyd; no hay un calendario anual independiente.
- La fecha de respaldo del concierto ya pasó respecto de esta revisión. La interfaz aún lo presenta en cartelera; revisa datos y disponibilidad antes de operar nuevas reservas.
- «100% becas gratuitas» y otras afirmaciones del home están escritas en componentes; no son indicadores calculados desde la base de datos.
- El esquema incluye datos y credenciales iniciales: no lo ejecutes sobre producción sin revisión y respaldo.
- El limitador de solicitudes de reserva reside en memoria del proceso; no distribuye el límite entre varias instancias.
- Se conservan componentes de diseños anteriores; su presencia no implica que estén activos en el home.

### Ejecución en producción

Una vez resuelta la instalación y completado el build:

```bash
npm run build
npm start
```

La salida es `dist/` y el servidor inicia con `node ./dist/server/entry.mjs`. `railway.json` configura Nixpacks, build con `pnpm build`, ese comando de inicio y healthcheck en `/`. El bloqueo de pnpm debe resolverse antes de usar esa configuración tal cual.

Aunque existen `vercel.json` y una dependencia del adaptador Vercel, **el adaptador activo es Node standalone**. No se ha verificado un despliegue Vercel con esta configuración.

### Documentación detallada

| Tema | Documento |
| --- | --- |
| Configuración y despliegue | [README_SETUP.md](README_SETUP.md) |
| Capas y modelo de datos | [ARCHITECTURE.md](ARCHITECTURE.md) |
| PostgreSQL e inicialización | [database-setup.md](docs/database-setup.md) |
| Roles y acceso | [rbac-admin.md](docs/rbac-admin.md) |
| Reservas | [reservation-workflow.md](docs/reservation-workflow.md) |
| Consulta y validación QR | [qr-ticket-flow.md](docs/qr-ticket-flow.md) |
| Entrega móvil | [mobile-ticket-delivery.md](docs/mobile-ticket-delivery.md) |
| Entrega digital y WhatsApp | [digital-ticket-whatsapp-flow.md](docs/digital-ticket-whatsapp-flow.md) |
| Alertas al personal | [whatsapp-notifications.md](docs/whatsapp-notifications.md) |
| Impresión | [printing-tickets.md](docs/printing-tickets.md) |
| Motor de impresión | [ticket-print-engine.md](docs/ticket-print-engine.md) |
| Calibración | [ticket-layout-calibration.md](docs/ticket-layout-calibration.md) |
| Exportación Canva | [canva-bulk-create.md](docs/canva-bulk-create.md) |
| Verificación operativa | [testing-checklist.md](docs/testing-checklist.md) y [ticket-delivery-testing.md](docs/ticket-delivery-testing.md) |

Las guías auxiliares pueden conservar instrucciones anteriores, como comandos pnpm o funciones listadas como futuras que ya tienen implementación. Contrasta esos detalles con este estado, `package.json` y el código antes de ejecutar operaciones administrativas. Los scripts de reset o depuración de reservas modifican datos y no forman parte del arranque normal.

## License

El repositorio no incluye un archivo `LICENSE` ni declara una licencia en `package.json`. Este README no concede una licencia de uso o redistribución.
