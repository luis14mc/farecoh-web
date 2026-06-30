# Ticket print engine

Generates printable PDFs for Pink Floyd physical tickets by overlaying `ticket_code` and a QR code on the Canva-exported background template.

The engine does **not** recreate ticket artwork in code. It only composites:

1. Background PNG (`public/templates/ticket-pink-floyd.png`)
2. Ticket code text
3. QR encoding `https://www.farecoh.org/t/{qr_token}`

No Canva automation. No changes to reservation, sales, or check-in logic. PDFs never include buyer data.

## Template setup

1. Export the final ticket design from Canva as **PNG** (300 DPI recommended).
2. Save it as:

```text
public/templates/ticket-pink-floyd.png
```

See also `public/templates/README.md`.

## Admin panel (recommended)

1. Sign in as `super_admin` or `event_manager`.
2. Open **Impresión** → `/admin/printing`.
3. Set the ticket range (defaults: `PF-000001` – `PF-000005`).
4. Click **Generar PDF de prueba** for the selected range (defaults to `PF-000001` – `PF-000005`), or **Generar PDF completo** for `PF-000001` – `PF-000500`.

The browser downloads via `GET /api/print/tickets?from=...&to=...`. The server uses your admin session (not the service role key in the browser). Output filename example:

```text
farecoh-pink-floyd-PF-000001-PF-000005.pdf
```

## CLI (optional)

For local or CI runs without the admin UI:

```bash
PUBLIC_SITE_URL=https://www.farecoh.org \
PUBLIC_SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
pnpm generate:print-tickets
```

### 5-ticket test PDF

```bash
pnpm generate:print-tickets --test
```

Output: `exports/print/test-5-tickets.pdf` (PF-000001 – PF-000005)

### Full run (500 tickets)

```bash
pnpm generate:print-tickets
```

Output: `exports/print/farecoh-pink-floyd-PF-000001-PF-000500.pdf`

### Custom range

```bash
pnpm generate:print-tickets --from PF-000001 --to PF-000100
```

## Adjusting code and QR placement

Edit constants in `src/lib/ticket-print-config.ts`:

| Constant | Purpose |
|----------|---------|
| `CODE_X` | Horizontal center of the code box (px, top-left origin) |
| `CODE_Y` | Vertical center of the code box (px, top-left origin) |
| `CODE_FONT_SIZE` | Font size for `PF-000001` |
| `QR_X` | Left edge of QR frame (px) |
| `QR_Y` | Top edge of QR frame (px) |
| `QR_SIZE` | QR square size before white padding |
| `QR_PADDING` | White margin around QR (px) |

Coordinates use the template image’s pixel space (same as the PNG dimensions). PDF page size matches the template automatically.

Workflow to tune placement:

1. Generate a test PDF from `/admin/printing` or `pnpm generate:print-tickets --test`
2. Open the PDF and check alignment with the Canva boxes
3. Adjust constants in `src/lib/ticket-print-config.ts` and repeat

## Print recommendation

- Use **PDF print**, one ticket per page
- Prefer **300 DPI** source PNG from Canva
- Print on card stock or ticket paper compatible with your vendor
- Spot-check PF-000001, a mid-range code, and PF-000500 before full print run
- Scan several QR codes and confirm they open `/t/{qr_token}` without exposing buyer data

## Dependencies

- `pdf-lib` — PDF assembly
- `sharp` — template dimensions and QR padding
- `qrcode` — high-resolution QR PNG generation

## Security

- `/admin/printing` and `/api/print/tickets` require admin login
- Only `super_admin` and `event_manager` roles can access
- Server uses the authenticated Supabase client; service role is CLI-only
- PDF contains only `ticket_code` and QR URL — no buyer PII
