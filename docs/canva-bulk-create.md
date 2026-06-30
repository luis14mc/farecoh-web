# Canva Bulk Create — Pink Floyd tickets

FARECOH only exports CSV data for Canva. Ticket design and PDF export happen in Canva.

## Generate CSV

From the project root, with Supabase credentials:

```bash
PUBLIC_SITE_URL=https://www.farecoh.org \
PUBLIC_SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
pnpm export:canva-tickets
```

Output: `exports/canva-tickets-pink-floyd.csv`

If `PUBLIC_SITE_URL` is omitted, the script defaults to `https://www.farecoh.org`.

Columns:

| Column       | Description                                      |
|-------------|--------------------------------------------------|
| ticket_code | e.g. `PF-000001`                                 |
| qr_url      | Public ticket page: `/t/{qr_token}`              |
| qr_image    | PNG QR URL: `/api/qr/{qr_token}`                 |
| status      | Current ticket status in Supabase                |

Example row:

```csv
ticket_code,qr_url,qr_image,status
PF-000001,https://www.farecoh.org/t/uuid,https://www.farecoh.org/api/qr/uuid,available
```

Rows are sorted by `ticket_code` ascending (500 tickets for the Pink Floyd event).

The CSV contains no buyer name, phone, email, or payment data.

## QR image API

After deploy, Canva fetches QR PNGs from:

```text
https://www.farecoh.org/api/qr/{qr_token}
```

Each image encodes `https://www.farecoh.org/t/{qr_token}`. Invalid token format returns HTTP 400.

## Canva Bulk Create steps

1. Run `pnpm export:canva-tickets`.
2. Open your ticket design in Canva.
3. Go to **Apps → Bulk Create**.
4. Upload `exports/canva-tickets-pink-floyd.csv`.
5. Connect **ticket_code** to the visible code text on the ticket.
6. Connect **qr_image** to the QR / image frame (Canva loads each PNG from the URL).
7. Generate all rows and spot-check first, middle, and last tickets.
8. **Export → PDF Print** for the print shop.

## Before printing

- Confirm 500 data rows in the CSV.
- Confirm each `ticket_code` and `qr_url` pair is unique.
- Open a few `qr_image` URLs in the browser and scan with a phone.
- Verify the printed code matches the QR on the same row.

See also `docs/qr-ticket-flow.md` for how QR check-in works on event day.
