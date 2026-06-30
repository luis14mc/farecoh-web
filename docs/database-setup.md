# FARECOH — Database Setup (Supabase)

This guide applies the canonical ticketing schema used by the public reservation form, admin sales, and check-in modules.

## Important: manual migrations

**Vercel deploys do not run Supabase migrations automatically.**

Every SQL file under `supabase/migrations/` must be executed manually in the **Supabase Dashboard → SQL Editor** after deploy (or whenever schema/data changes).

Recommended order:

1. `supabase/migrations/001_ticketing_core.sql`
2. `supabase/migrations/20260629_fix_pink_floyd_event_date.sql` (if the event row already exists with an older date)
3. `supabase/migrations/20260629000002_fix_create_ticket_order_status_ambiguity.sql` (fixes RPC error `42702 column reference "status" is ambiguous`)
4. `supabase/migrations/20260629_status_cleanup.sql`
5. `supabase/migrations/20260629_confirm_payment_rpc.sql`
6. `supabase/migrations/20260629_validate_ticket_rpc.sql`

## Prerequisites

- A Supabase project with Auth enabled
- SQL Editor access (Dashboard → SQL → New query)
- Environment variables in the app:
  - `PUBLIC_SUPABASE_URL`
  - `PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server/admin only — never expose in the browser)

## 1. Run the core migration

1. Open **Supabase Dashboard → SQL → New query**
2. Copy the full contents of:

```
supabase/migrations/001_ticketing_core.sql
```

3. Click **Run**

Expected result:

- Tables created/aligned: `roles`, `users`, `events`, `sellers`, `ticket_batches`, `tickets`, `sales`, `checkins`, `audit_logs`
- Legacy tables removed if present: `orders`, `customers`
- Ticket statuses normalized to: `available`, `assigned`, `reserved`, `sold`, `validated`, `cancelled`
- RPC functions created:
  - `create_initial_ticket_inventory()`
  - `create_ticket_order(...)`
  - `confirm_ticket_payment(...)`
  - `sell_physical_ticket(...)` (legacy; prefer `confirm_ticket_payment`)
  - `validate_ticket(...)`
  - `get_public_ticket_status(...)`
- Pink Floyd event seeded (`slug = pink-floyd`, date `2026-08-29`)
- Inventory seeded: `PF-000001` … `PF-000500`
- PostgREST schema cache reload via `NOTIFY pgrst, 'reload schema';`

## 1b. Fix Pink Floyd event date (existing projects)

If `public.events` already contains `pink-floyd` with an older date, run:

```
supabase/migrations/20260629_fix_pink_floyd_event_date.sql
```

This upserts:

- `event_date`: `2026-08-29`
- `event_time`: `8:00 p. m.`
- `location`: `Escuela Nacional de Música, Tegucigalpa`
- `ticket_price`: `500`
- `capacity`: `500`

## 1c. Fix create_ticket_order status ambiguity

If public reservations fail with:

```
column reference "status" is ambiguous
code: 42702
```

Run in **Supabase Dashboard → SQL Editor**:

```
supabase/migrations/20260629000002_fix_create_ticket_order_status_ambiguity.sql
```

This replaces `create_ticket_order` with table-qualified `status` references and renames the RPC output column to `reservation_status` (value `reserved` for public reservations).

Verify:

```sql
SELECT *
FROM public.create_ticket_order(
  'pink-floyd',
  'Test Usuario',
  'test@example.com',
  '+50499998888',
  1
);
```

Expected: one row with `reservation_status = reserved` and a ticket code array.

## 1d. Operational RPC migrations

After the core schema is in place, run these in order:

```
supabase/migrations/20260629_status_cleanup.sql
supabase/migrations/20260629_confirm_payment_rpc.sql
supabase/migrations/20260629_validate_ticket_rpc.sql
```

- **status_cleanup** — maps legacy `paid → sold`, `pending → reserved`, enforces canonical status constraint
- **confirm_payment_rpc** — `confirm_ticket_payment(...)` for reserved/assigned/available → sold
- **validate_ticket_rpc** — refined check-in messages and status guards

Each file ends with `NOTIFY pgrst, 'reload schema';` — required for PostgREST to expose new/changed RPCs.

Verify confirm payment:

```sql
SELECT public.confirm_ticket_payment(
  'PF-000002',
  'Transferencia',
  'REF-123',
  (SELECT id FROM public.sellers LIMIT 1),
  'Escuela Nacional de Música',
  'admin-test',
  'María López',
  '+50499997777',
  'maria@example.com'
);
```

## 2. Verify RPCs exist

Run:

```sql
SELECT proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN (
    'create_initial_ticket_inventory',
    'create_ticket_order',
    'confirm_ticket_payment',
    'sell_physical_ticket',
    'validate_ticket',
    'get_public_ticket_status'
  )
ORDER BY proname;
```

You should see all six functions.

## 3. Verify event + inventory

```sql
SELECT slug, title, event_date, event_time, ticket_price, capacity, status
FROM public.events
WHERE slug = 'pink-floyd';

SELECT status, count(*)
FROM public.tickets
GROUP BY status
ORDER BY status;

SELECT min(ticket_code), max(ticket_code), count(*)
FROM public.tickets
WHERE event_id = (SELECT id FROM public.events WHERE slug = 'pink-floyd');
```

Expected inventory count: **500** tickets (`PF-000001` … `PF-000500`), initially all `available`.

## 4. Smoke-test public reservation

```sql
SELECT *
FROM public.create_ticket_order(
  'pink-floyd',
  'Juan Pérez',
  'juan@example.com',
  '+50499998888',
  2
);
```

Expected:

- `status = reserved`
- `ticket_codes` with 2 codes
- `total_amount = 1000` (2 × L500)

Confirm tickets moved to `reserved`:

```sql
SELECT ticket_code, status, buyer_name
FROM public.tickets
WHERE buyer_name = 'Juan Pérez';
```

## 5. Create admin users (RBAC)

1. Create the auth user in **Authentication → Users**
2. Insert a profile in `public.users` linked to a role:

```sql
INSERT INTO public.users (auth_user_id, email, full_name, role_id, active)
SELECT
  '<AUTH_USER_UUID>',
  'admin@farecoh.org',
  'Administrador FARECOH',
  r.id,
  true
FROM public.roles r
WHERE r.name = 'super_admin'
ON CONFLICT (auth_user_id) DO NOTHING;
```

Available roles:

- `super_admin`
- `event_manager`
- `seller`
- `checkin_operator`

## 6. Smoke-test admin RPCs (authenticated)

Run these while logged in as an admin user (via the app or Supabase SQL with a JWT), not as anonymous:

**Sell physical ticket**

```sql
SELECT public.sell_physical_ticket(
  'PF-000001',
  'María López',
  '+50499997777',
  'maria@example.com',
  (SELECT id FROM public.sellers LIMIT 1),
  'Escuela Nacional de Música',
  'Efectivo',
  NULL
);
```

**Validate ticket**

```sql
SELECT *
FROM public.validate_ticket('PF-000001', 'checkin-operator');
```

## 7. Security model

| Action | Who can execute |
|--------|-----------------|
| `create_ticket_order` | Public (`anon` + `authenticated`) — reserves tickets only |
| `get_public_ticket_status` | Public — status lookup by QR token |
| `confirm_ticket_payment` | Authenticated staff with role `super_admin`, `event_manager`, or `seller` |
| `sell_physical_ticket` | Same as above (legacy alias behavior) |
| `validate_ticket` | Authenticated staff with role `super_admin`, `event_manager`, or `checkin_operator` |
| Direct table writes | Blocked for public; admin access via RLS + staff session |

Never put `SUPABASE_SERVICE_ROLE_KEY` in frontend code or public env vars.

## 8. Re-run inventory safely

If inventory is missing or partially created:

```sql
SELECT public.create_initial_ticket_inventory();
```

This function is **idempotent** — existing codes are skipped.

## 9. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `function create_ticket_order does not exist` | Re-run `001_ticketing_core.sql` and confirm `NOTIFY pgrst, 'reload schema';` |
| Public form fails with permission error | Ensure `GRANT EXECUTE` on `create_ticket_order` to `anon` |
| Admin sale fails with `No autorizado` | Confirm user exists in `public.users` with an active role |
| Check-in rejects valid ticket | Ticket must be in status `sold` (not `reserved`) |
| Old statuses (`paid`, `pending`) | Re-run migration; it maps `paid → sold`, `pending → reserved` |

## Canonical ticket lifecycle

```
available → reserved   (public form via create_ticket_order)
available / assigned / reserved → sold   (admin via confirm_ticket_payment)
sold → validated   (check-in via validate_ticket)
any → cancelled   (manual admin action)
```

Manual QA steps: see `docs/testing-checklist.md`.
