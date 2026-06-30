# FARECOH Ticketing — Manual Test Checklist

Use this checklist after applying Supabase migrations and deploying the app.

## 1. Public reservation

- [ ] Open `/eventos/pink-floyd` and submit the reservation form for **1 ticket**
- [ ] Form succeeds without alert popups
- [ ] Ticket status becomes **`reserved`** in Supabase
- [ ] Buyer name, phone, and email are saved on the ticket row

## 2. Confirm payment (reserved → sold)

- [ ] Log in as `super_admin`, `event_manager`, or `seller`
- [ ] Open `/admin/sales` and enter the reserved ticket code
- [ ] Preview shows status **Reservado** and prefilled buyer data
- [ ] Submit with **Confirmar pago**
- [ ] Ticket status becomes **`sold`**
- [ ] A row is created in **`sales`**
- [ ] `sold_at`, payment method, seller, and sale location are saved

## 3. Physical sale (available/assigned → sold)

- [ ] Pick an **`available`** or **`assigned`** ticket
- [ ] Open `/admin/sales`, enter code, fill buyer + payment fields
- [ ] Button reads **Registrar venta**
- [ ] Submit succeeds; ticket becomes **`sold`**

## 4. Check-in (sold → validated)

- [ ] Log in as `checkin_operator`, `event_manager`, or `super_admin`
- [ ] Open `/admin/checkin` and search a **`sold`** ticket
- [ ] UI shows **Validar ingreso**
- [ ] Validate succeeds; ticket becomes **`validated`**
- [ ] Row created in **`checkins`**

## 5. Duplicate check-in

- [ ] Search the same validated ticket again
- [ ] System shows **Boleto ya utilizado** and rejects validation

## 6. Invalid statuses at check-in

- [ ] **`reserved`**: yellow/warning — *Boleto reservado, pago no confirmado*
- [ ] **`available` / `assigned`**: *Boleto no vendido*
- [ ] **`cancelled`**: *Boleto anulado*

## 7. RBAC

- [ ] **`seller`** can access `/admin/sales` but **not** `/admin/users`
- [ ] **`checkin_operator`** can access `/admin/checkin` but **not** `/admin/sales`
- [ ] Unauthenticated users are redirected to `/admin/login`

## 8. Admin dashboard & exports

- [ ] `/admin` KPIs reflect real Supabase counts (capacity 500, reserved, sold, etc.)
- [ ] Revenue equals **sum of `sales.amount`**
- [ ] CSV downloads work: tickets, sales, check-ins

## 9. Canva export script

```bash
PUBLIC_SITE_URL=https://farecoh.org \
PUBLIC_SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
pnpm export:canva-tickets
```

- [ ] Output file: `exports/canva-tickets-pink-floyd.csv`
- [ ] Columns: `code`, `qr_url`, `status`
- [ ] `qr_url` = `PUBLIC_SITE_URL/t/{qr_token}`

## 10. Regression — do not break public flow

- [ ] Public reservation still works after admin changes
- [ ] `pnpm build` passes
- [ ] `pnpm test` passes
