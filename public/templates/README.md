# Ticket print templates

Place the Canva-exported ticket background here:

```text
public/templates/ticket-pink-floyd.png
```

Export from Canva as **PNG** at print resolution (300 DPI recommended). The PNG must include all static design elements; the print engine only overlays:

1. `ticket_code` (e.g. `PF-000001`)
2. QR code linking to `https://www.farecoh.org/t/{qr_token}`

After adding the file, generate a test PDF from `/admin/printing` or run:

```bash
pnpm generate:print-tickets --test
```

See `docs/ticket-print-engine.md` for positioning and full export commands.
