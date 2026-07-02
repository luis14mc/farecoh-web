# Reservation workflow

Operational flow for public ticket reservations (`status = reserved`).

## Lifecycle

```
available → reserved → sold → validated
reserved → available   (cancel reservation)
```

Public reservations are created via `POST /api/tickets/reserve` → RPC `create_ticket_order`.

Staff follow-up happens in **`/admin/reservations`**.

## Admin page

**Route:** `/admin/reservations`  
**Menu:** Reservas  
**Roles:** `super_admin`, `event_manager`, `seller`

### Table (only `status = reserved`)

| Column | Source |
|--------|--------|
| Código | `ticket_code` |
| Comprador | `buyer_name` |
| Teléfono | `buyer_phone` |
| Correo | `buyer_email` |
| Reservado | `reserved_at` (fallback `created_at`) |
| Antigüedad | computed from reservation timestamp |
| Referencia | `payment_reference` if present |

### Actions

1. **Confirmar pago** — modal with existing `confirm_ticket_payment` flow (prefilled buyer data).
2. **Contactar** — WhatsApp link `https://wa.me/504{digits}` with follow-up message.
3. **Cancelar reserva** — RPC `cancel_ticket_reservation`.
4. **Ver boleto** — `/t/{qr_token}`.

### Counters

- Total reserved
- Reserved today
- Older than 24 h
- Converted to sold today (`audit_logs.action = ticket.payment_confirmed`)

### Filters

- Search: code, name, phone
- Age: all / today / older than 24 h
- Payment method (if stored on ticket)

## Database

Run in Supabase SQL Editor:

```
supabase/migrations/20260630_reservation_workflow.sql
```

Adds:

- `tickets.reserved_at`
- RPC `cancel_ticket_reservation(p_ticket_code, p_cancelled_by, p_reason)`
- Updates `create_ticket_order` to set `reserved_at = now()`

### Cancel rules

- Only `reserved` tickets
- Sets `status = available`
- Clears buyer fields and `reserved_at`
- Audit: `ticket.reservation_cancelled`
- Does **not** delete ticket or QR token

## Related links

- Reserved ticket action in `/admin/tickets` → `/admin/reservations?code=PF-000001`
- Dashboard card **Reservas pendientes** → `/admin/reservations`
- WhatsApp staff alerts: `docs/whatsapp-notifications.md`

## Code map

| File | Role |
|------|------|
| `src/pages/admin/reservations.astro` | Page + POST handlers |
| `src/components/admin/react/ReservationsPanel.tsx` | UI |
| `src/services/reservation-stats.ts` | Counters, filters, WhatsApp buyer URL |
| `src/services/ticket-reservation.ts` | Cancel RPC client |
| `src/services/ticket-payment.ts` | Confirm payment RPC client |
