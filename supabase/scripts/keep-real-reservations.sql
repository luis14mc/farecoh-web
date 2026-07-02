-- One-time cleanup: keep only real web reservations (Jun 2025 intake).
-- Run manually in Supabase SQL Editor (service role / postgres).
--
-- Preserved tickets: PF-000003, PF-000004, PF-000005 (status must be reserved).
-- All other tickets reset to available with buyer/sale/check-in data cleared.

BEGIN;

CREATE TEMP TABLE _keep_reservations (ticket_code TEXT PRIMARY KEY);
INSERT INTO _keep_reservations (ticket_code) VALUES
  ('PF-000003'),
  ('PF-000004'),
  ('PF-000005');

DO $$
DECLARE
  v_missing INTEGER;
  v_not_reserved INTEGER;
BEGIN
  SELECT count(*) INTO v_missing
  FROM _keep_reservations k
  LEFT JOIN public.tickets t ON t.ticket_code = k.ticket_code
  WHERE t.id IS NULL;

  IF v_missing > 0 THEN
    RAISE EXCEPTION 'Missing ticket(s) in keep list (%)', v_missing;
  END IF;

  SELECT count(*) INTO v_not_reserved
  FROM public.tickets t
  JOIN _keep_reservations k ON k.ticket_code = t.ticket_code
  WHERE t.status <> 'reserved';

  IF v_not_reserved > 0 THEN
    RAISE NOTICE 'Warning: % keep-list ticket(s) are not reserved; they will not be modified.', v_not_reserved;
  END IF;
END $$;

-- Remove all check-ins and sales (real intake is reserved only, not validated/sold).
DELETE FROM public.checkins;
DELETE FROM public.sales;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'reservation_notifications'
  ) THEN
    DELETE FROM public.reservation_notifications rn
    WHERE NOT (
      rn.ticket_codes && (SELECT array_agg(ticket_code) FROM _keep_reservations)
    );
  END IF;
END $$;

UPDATE public.tickets t
SET
  status = 'available',
  buyer_name = NULL,
  buyer_phone = NULL,
  buyer_email = NULL,
  seller_id = NULL,
  seller_name = NULL,
  sale_location = NULL,
  payment_method = NULL,
  payment_reference = NULL,
  sold_at = NULL,
  validated_at = NULL,
  batch_id = NULL
WHERE t.ticket_code NOT IN (SELECT ticket_code FROM _keep_reservations);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tickets'
      AND column_name = 'reserved_at'
  ) THEN
    UPDATE public.tickets t
    SET reserved_at = NULL
    WHERE t.ticket_code NOT IN (SELECT ticket_code FROM _keep_reservations);
  END IF;
END $$;

DELETE FROM public.audit_logs;

COMMIT;

-- Verify
SELECT ticket_code, status, buyer_name, buyer_phone, buyer_email, created_at
FROM public.tickets
WHERE ticket_code IN ('PF-000003', 'PF-000004', 'PF-000005')
ORDER BY ticket_code;

SELECT status, count(*) AS total
FROM public.tickets
GROUP BY status
ORDER BY status;

SELECT ticket_code, status, validated_at
FROM public.tickets
WHERE status = 'validated'
ORDER BY ticket_code;
