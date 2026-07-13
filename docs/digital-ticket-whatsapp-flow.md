# Digital Ticket Delivery and Manual WhatsApp Flow

This document details the architecture, manual WhatsApp delivery flow, and safety constraints for generating digital ticket images for the FARECOH Ticketing Platform.

## Overview

The delivery flow is currently manual. Administrators (`super_admin`, `event_manager`, and `seller`) generate digital ticket images from the administration portal, copy a prefilled transaction message, and open a WhatsApp chat to manually attach the ticket images.

---

## Safety Constraints

### ⚠️ Critical Immutability Rule
To protect existing ticket sales and validation entries already in production, **no operation in this flow modifies or recreates ticket codes or QR tokens**.
- The system must **never** regenerate `qr_token` values.
- The system must **never** modify the `ticket_code` of existing tickets.
- The system must **never** reseed or re-generate inventory identifiers.
- Each generated ticket image relies strictly on the existing database records:
  - `ticket_code` (e.g. `PF-000151`)
  - `qr_token` (e.g. `c1b0d2e3-...`)
  - Verification URL: `https://www.farecoh.org/t/{existing_qr_token}`

---

## Digital Ticket Template

The digital ticket uses a vertical template:
- **Location**: `public/templates/ticket-digital-pink-floyd.png`
- **Recommended Size**: `1080 x 1920` px
- **Visuals Included**: Event branding, event title, date, time, venue, ticket category ("Entrada General"), FARECOH logo, and warnings.
- **Dynamic Overlays**:
  1. High-resolution QR Code generated dynamically from the existing `qr_token`. Placed inside the orange frame (`top: 910, left: 360`, size `360 x 360` px).
  2. Bold `ticket_code` overlay inside the dark bottom box (`top: 1400, left: 340`, size `400 x 80` px).

---

## Security & API Endpoints

Both API endpoints require an active administrator session matching the `super_admin`, `event_manager`, or `seller` role.

### 1. Batch PNG / ZIP Endpoint
- **Path**: `POST /api/delivery/ticket-images`
- **Input**:
  ```json
  {
    "ticketCodes": ["PF-000151", "PF-000152"]
  }
  ```
- **Constraints**:
  - Enforces database status check: only permits tickets in state `sold` or `validated`.
  - Max 10 tickets per request.
- **Output**:
  - If 1 ticket requested: Returns `image/png` directly.
  - If multiple tickets requested: Returns `application/zip` containing the ticket PNGs.

### 2. Individual View/Download Endpoint
- **Path**: `GET /api/delivery/ticket-image/[code]` (e.g. `/api/delivery/ticket-image/PF-000151`)
- **Query Params**:
  - `download=true`: Returns `content-disposition: attachment; filename="farecoh-[code].png"`.
  - Otherwise: Returns `content-disposition: inline; filename="farecoh-[code].png"` (for viewing in a new tab).
- **Constraints**: Enforces status is `sold` or `validated`.

---

## Step-by-Step Delivery Flow

1. Navigate to `/admin/delivery` in the panel (accessible from the sidebar).
2. Filter or search for the buyer by name, phone, or specific ticket code.
3. Click **"Descargar ZIP"** (or **"Descargar PNG"** if they bought a single ticket).
   - *Under the hood*: This calls `/api/delivery/ticket-images` with the codes to download the ZIP file.
4. Extract the PNG files locally.
5. Click **"Copiar mensaje"** to copy the prefilled transaction details and security warnings to your clipboard.
6. Click **"Abrir WhatsApp"**.
   - *Under the hood*: This opens a chat with the buyer's phone number and the prefilled message:
     `https://wa.me/{phone}?text={encodedMessage}`
7. Once the WhatsApp window opens, paste the clipboard message.
8. Click the attachment button in WhatsApp and manually select the extracted PNG ticket images.
9. Send.

---

## Testing & Verification

1. Run unit tests to confirm the generator works properly:
   ```bash
   node --experimental-strip-types --test tests/ticket-delivery.test.ts
   ```
2. Run a full production build to ensure compilation passes:
   ```bash
   pnpm run build
   ```
3. In dev mode, access `/admin/delivery`, search for a sold ticket, click `Ver boleto` to verify the QR scans to:
   `https://www.farecoh.org/t/{existing_qr_token}`
