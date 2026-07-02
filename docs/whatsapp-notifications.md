# WhatsApp notifications (reservations)

Staff receive a WhatsApp alert when a public ticket reservation is created successfully.

## Flow

1. Visitor submits the public reservation form.
2. `POST /api/tickets/reserve` runs server-side.
3. `create_ticket_order` RPC reserves tickets (`status = reserved`).
4. On success, `notifyStaffOfNewReservation()` sends WhatsApp to FARECOH staff.
5. Delivery is logged in `public.reservation_notifications`.

If WhatsApp fails or is not configured, **the reservation still succeeds**. Errors are logged server-side only.

## Provider abstraction

Implementation lives in:

- `src/services/notifications/whatsapp.ts` — Twilio / Meta providers
- `src/services/notifications/reservation-notifications.ts` — message body + audit log

Set `WHATSAPP_PROVIDER`:

| Value | Provider |
|-------|----------|
| `twilio` (default) | Twilio WhatsApp API |
| `meta` | Meta WhatsApp Cloud API |

## Environment variables (server-only)

Never expose these in the browser. Do **not** use the `PUBLIC_` prefix.

### Twilio (default)

```bash
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
FARECOH_NOTIFY_WHATSAPP_TO=whatsapp:+504XXXXXXXX
SUPABASE_SERVICE_ROLE_KEY=...
```

### Meta WhatsApp Cloud API

```bash
WHATSAPP_PROVIDER=meta
META_WHATSAPP_ACCESS_TOKEN=
META_WHATSAPP_PHONE_NUMBER_ID=
META_WHATSAPP_FROM=whatsapp:+504XXXXXXXX
FARECOH_NOTIFY_WHATSAPP_TO=whatsapp:+504XXXXXXXX
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` is required to persist notification logs.

## Database

Run manually in Supabase SQL Editor:

```
supabase/migrations/20260630_reservation_notifications.sql
```

Table: `reservation_notifications`

| Column | Description |
|--------|-------------|
| `ticket_codes` | Reserved ticket codes |
| `buyer_name`, `buyer_phone`, `buyer_email` | Buyer snapshot |
| `channel` | `whatsapp` |
| `recipient` | Staff destination address |
| `status` | `sent`, `failed`, or `skipped` |
| `error_message` | Safe error detail when failed/skipped |

RLS: `super_admin` and `event_manager` can `SELECT`.

## Message template

```
Nueva reserva FARECOH
Evento: Tributo a Pink Floyd
Boletos: PF-000001, PF-000002
Cliente: Juan Pérez
Teléfono: +504 9999-9999
Correo: juan@correo.com
Estado: Pendiente de confirmación de pago
Panel: https://www.farecoh.org/admin/reservations
```

## Local testing

1. Configure Twilio sandbox or Meta test number.
2. Set env vars in `.env`.
3. Submit a public reservation.
4. Check Vercel/server logs and `reservation_notifications` rows.

## Security

- Twilio/Meta credentials are read only in server modules and API routes.
- The public form calls `/api/tickets/reserve`; it never sees provider secrets.
- Notification errors are sanitized before logging.
