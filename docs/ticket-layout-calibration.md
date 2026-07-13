# Calibración visual de boletos

Este documento describe cómo calibrar las posiciones de código y QR para boletos **físicos** y **digitales** de forma independiente.

## Plantillas

| Tipo | Archivo | Dimensiones |
|------|---------|-------------|
| Físico | `public/templates/ticket-pink-floyd.png` | 2000 × 800 px |
| Digital | `public/templates/digital-ticket.png` | 1080 × 1920 px |

Las plantillas son assets gráficos finales. El sistema **solo superpone**:

- `ticket_code` (número visible, p. ej. `PF-000151`)
- Imagen QR generada desde el `qr_token` existente en base de datos

## Regla de producción (QR inmutable)

- **Nunca** regenerar, actualizar ni reemplazar `qr_token`
- **Nunca** modificar `ticket_code` en tickets vendidos
- El contenido del QR siempre es: `https://www.farecoh.org/t/{qr_token}`
- El `qr_token` se lee **solo en el servidor** desde el registro del boleto

## Layouts independientes

Configuración en:

- `src/lib/ticket-layouts/physical-ticket-layout.ts` — valores por defecto físicos
- `src/lib/ticket-layouts/digital-ticket-layout.ts` — valores por defecto digitales

Persistencia en Postgres: tabla `ticket_layout_configs` (`layout_type`: `physical` | `digital`).

### Boleto físico

Dos secciones desprendibles (izquierda y derecha):

- Mismo `ticket_code` en ambas posiciones de código
- Mismo QR (mismo `qr_token`) en ambas posiciones

Controles de calibración:

- Código izquierdo / QR izquierdo
- Código derecho / QR derecho

### Boleto digital

Una sola superposición de código y una de QR.

## Uso de la calibración

Ruta admin: **`/admin/printing/calibration`**

Pestañas:

1. **Boleto físico**
2. **Boleto digital**

Por pestaña:

1. Seleccione el elemento (código o QR)
2. Ajuste X, Y, ancho, alto y tamaño de fuente (código)
3. Use flechas con pasos de 1, 5 o 10 px
4. **Vista previa** — actualiza imagen de prueba (`PF-000001`)
5. **Restaurar valores** — vuelve a defaults (solo `super_admin` / `event_manager`)
6. **Guardar configuración** — persiste en `ticket_layout_configs`
7. **Generar prueba** — abre PNG de prueba en nueva pestaña

Boleto físico: también puede descargar **PDF calibración** con cajas de referencia.

## Permisos

| Rol | Leer layouts | Modificar layouts | Descargar boletos |
|-----|--------------|-------------------|-------------------|
| super_admin | ✓ | ✓ | ✓ |
| event_manager | ✓ | ✓ | ✓ |
| seller | ✓ | ✗ | ✓ |

## Endpoints de imagen

| Tipo | Endpoint |
|------|----------|
| Físico | `GET /api/delivery/physical-ticket/{ticketCode}` |
| Digital | `GET /api/delivery/digital-ticket/{ticketCode}` |

Requieren admin autenticado. Solo boletos `sold` o `validated`.

## Rollback

1. En `/admin/printing/calibration`, use **Restaurar valores** por pestaña
2. O ejecute en SQL Editor:

```sql
DELETE FROM public.ticket_layout_configs WHERE layout_type IN ('physical', 'digital');
-- La migración volverá a insertar defaults en el próximo deploy si usa ON CONFLICT DO NOTHING;
-- para forzar defaults, vuelva a correr el INSERT de supabase/migrations/20260713_ticket_layout_configs.sql
```

Esto **no afecta** `tickets.qr_token` ni `tickets.ticket_code`.

## Verificación

```bash
pnpm verify:ticket-immutability
pnpm test
pnpm build
```

Reporte esperado:

- Sold tickets checked: N
- QR tokens modified: 0
- Ticket codes modified: 0
- Destructive migrations: 0
