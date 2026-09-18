# FARECOH — Database Setup (PostgreSQL / Railway)

This guide documents how to initialize and configure the PostgreSQL database for the FARECOH platform when running locally or deployed on Railway.

## Architecture Overview

The database is pure PostgreSQL, operated natively via `pg.Pool` with SSL support.

The canonical schema is unified in a single production file:
```
database/schema.sql
```

## Quick Start (Automatic Init)

If you have configured `DATABASE_URL` in your `.env` or in Railway environment variables:

```bash
pnpm db:init
```

This script reads `database/schema.sql` and executes all DDL statements, table schemas, indexes, RPC stored procedures, and initial seed data in a single step.

## Manual Init via psql

You can also apply the schema directly using `psql`:

```bash
psql "$DATABASE_URL" -f database/schema.sql
```

## What is Created

1. **Tables**:
   - `roles`: `super_admin`, `event_manager`, `seller`, `checkin_operator`
   - `users`: Staff user profiles with native `password_hash` (`crypto.scrypt`)
   - `events`: Event catalog (seeded with Pink Floyd tribute)
   - `sellers`: Physical ticket sellers
   - `ticket_batches`: Physical ticket batches assigned to sellers
   - `tickets`: Tickets `PF-000001` … `PF-000500` with unique `qr_token` and status tracking
   - `sales`: Completed sales ledger
   - `checkins`: Admission check-in records with timestamps and scanner operator
   - `reservation_notifications`: WhatsApp notification queue and delivery log
   - `audit_logs`: Central audit trail
   - `band_musicians` & `band_musician_tickets`: Control list for band member tickets
   - `ticket_layout_configs`: Layout coordinates and typography calibration for physical and digital tickets

2. **RPC Functions**:
   - `create_initial_ticket_inventory()`: Generates initial tickets
   - `create_ticket_order(...)`: Atomically reserves tickets for public online buyers, excluding assigned batches and band control
   - `staff_reserve_ticket(...)`: Staff reservation from admin panel
   - `cancel_ticket_reservation(...)`: Cancels reservation and restores ticket to `available` or `assigned`
   - `validate_ticket(...)`: Validates ticket by code with `FOR UPDATE` lock to prevent double entry
   - `validate_ticket_by_qr(...)`: Validates ticket by QR token with `FOR UPDATE` lock
   - `confirm_ticket_payment(...)`: Transitions reserved/available ticket to sold and logs sale
   - `get_public_ticket_status(...)`: Public QR status lookup

3. **Initial Admin User**:
   - **Email**: `admin@farecoh.org`
   - **Password**: `Admin2026!farecoh`
   - **Role**: `super_admin`
