# QR Ticket Flow — FARECOH Ticketing

This document describes how QR codes work for physical and web tickets for **Tributo a Pink Floyd** (2026-08-29).

## How QR works

Each ticket row has a unique `qr_token` (UUID) generated in Supabase. The QR code encodes a **public URL**:

```
PUBLIC_SITE_URL/t/{qr_token}
```

Example:

```
https://www.farecoh.org/t/7b3f4a2e-1c9d-4b8a-9f0e-123456789abc
```

When someone scans the QR (or opens the link), they land on `/t/[token]`, which calls the RPC `get_public_ticket_status` and shows:

- Event name
- Ticket code (e.g. `PF-000001`)
- Status label and a generic message

The public page **does not validate** tickets and **does not show** buyer name, phone, email, seller, or payment data.

## Why no personal data in the QR

QR codes are printed on physical tickets and visible to anyone who scans them. Storing only an opaque token in the URL:

- Avoids leaking PII if a ticket is photographed or shared
- Keeps validation and buyer details in the authenticated admin check-in flow
- Allows status lookup without exposing who bought the ticket

## Export CSV for Canva

From the project root, with Supabase credentials:

```bash
PUBLIC_SITE_URL=https://www.farecoh.org \
PUBLIC_SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
pnpm export:canva-tickets
```

Output: `exports/canva-tickets-pink-floyd.csv`

Columns:

| Column       | Description                          |
|-------------|--------------------------------------|
| ticket_code | e.g. `PF-000001`                     |
| qr_url      | Full public URL for the QR           |
| status      | Current ticket status in Supabase    |

Rows are sorted by `ticket_code` ascending. Canva generates QR images from the `qr_url` column — this script does **not** create PDFs or QR image files.

If `PUBLIC_SITE_URL` is omitted, the script defaults to `https://www.farecoh.org`.

## Canva Bulk Create

1. Run `pnpm export:canva-tickets` after ticket inventory exists in Supabase.
2. In Canva, open your ticket design template.
3. Use **Bulk Create** and upload `exports/canva-tickets-pink-floyd.csv`.
4. Map `ticket_code` to the visible code on the ticket.
5. Map `qr_url` to the QR code data field (Canva will render the QR from the URL).
6. Optionally map `status` for internal proofing (not printed on final tickets if unused in design).

See also `docs/canva-bulk-create.md`.

## Staff check-in on event day

1. Log in as `checkin_operator`, `event_manager`, or `super_admin`.
2. Open `/admin/checkin`.
3. Scan the attendee’s QR or paste:
   - Full URL (`https://www.farecoh.org/t/...` or `https://farecoh.org/t/...`)
   - Raw UUID (`qr_token`)
   - Ticket code (`PF-000001`) — existing manual flow
4. Confirm the ticket shows status **Vendido** (`sold`).
5. Tap **Validar ingreso**.

Validation uses:

- `validate_ticket_by_qr` when the search input was a QR URL or UUID
- `validate_ticket` when the search input was a ticket code

Both RPCs enforce the same rules: only `sold` tickets can be validated.

## Duplicate validation

If a ticket is already `validated`, check-in shows **Boleto ya utilizado** and the RPC returns `ok: false`. A second validation does not create another check-in row.

Invalid statuses at check-in:

| Status              | Result                                      |
|---------------------|---------------------------------------------|
| `reserved`          | Boleto reservado, pago no confirmado         |
| `available`/`assigned` | Boleto no vendido                        |
| `cancelled`         | Boleto anulado                              |
| `validated`         | Boleto ya utilizado                         |

## Database

Apply migration manually in Supabase SQL Editor:

`supabase/migrations/20260629_qr_ticket_flow.sql`

This ensures `qr_token`, `get_public_ticket_status`, and `validate_ticket_by_qr` exist with correct grants.

## Security summary

- Public `/t/[token]`: read-only status, no PII, no validation
- Check-in RPCs: authenticated roles with `can_validate_tickets()`
- No service role key in client code
- CSV export uses service role only in the local script, not in the web app
