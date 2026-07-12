# Ticket delivery test plan

Branch: `feature/ticket-delivery-package`

## Production safety rule

This implementation is read-only for ticket identity fields. It never updates:

- `tickets.ticket_code`
- `tickets.qr_token`
- ticket inventory sequences
- existing sold ticket records

Every public ticket link is built from the existing `qr_token` already stored in Supabase.

## Test route

Deploy the branch as a Vercel Preview and open:

`/admin/delivery`

Allowed roles:

- `super_admin`
- `event_manager`
- `seller`

## Current test scope

The first version provides:

1. Sold-ticket grouping by buyer phone, email, or fallback buyer/date key.
2. One WhatsApp message containing all ticket codes and existing public ticket links.
3. A button to open WhatsApp with the prepared message.
4. A button to copy the full message.
5. A text summary download.
6. Individual public-ticket links for visual and QR verification.
7. A visible counter confirming that this flow modifies zero QR values.

## Regression checks

For the first sold tickets:

1. Open each ticket from `/admin/delivery`.
2. Confirm the URL keeps the existing `/t/{qr_token}` format.
3. Scan the QR and verify it resolves to the same ticket code.
4. Confirm duplicate check-in protection still works.
5. Confirm no migration or write request runs when opening the delivery page.

## Not included yet

The branch does not yet generate PNG attachments or automatically send WhatsApp messages. Those steps should be added only after the grouped-delivery preview is approved.
