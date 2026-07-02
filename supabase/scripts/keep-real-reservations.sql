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
  v_bad_status INTEGER;
BEGIN
  SELECT count(*) INTO v_missing
  FROM _keep_reservations k
  LEFT JOIN public.tickets t ON t.ticket_code = k.ticket_code
  WHERE t.id IS NULL;

  IF v_missing > 0 THEN
    RAISE EXCEPTION 'Missing ticket(s) in keep list (%)', v_missing;
  END IF;

  SELECT count(*) INTO v_bad_status
  FROM public.tickets t
  JOIN _keep_reservations k ON k.ticket_code = t.ticket_code
  WHERE t.status <> 'reserved';

  IF v_bad_status > 0 THEN
    RAISE EXCEPTION 'Keep-list tickets must be reserved; found % with another status', v_bad_status;
  END IF;
END $$;

DELETE FROM public.checkins c
USING public.tickets t
WHERE c.ticket_id = t.id
  AND t.ticket_code NOT IN (SELECT ticket_code FROM _keep_reservations);

DELETE FROM public.sales s
USING public.tickets t
WHERE s.ticket_id = t.id
  AND t.ticket_code NOT IN (SELECT ticket_code FROM _keep_reservations);

DELETE FROM public.reservation_notifications rn
WHERE NOT (
  rn.ticket_codes && (SELECT array_agg(ticket_code) FROM _keep_reservations)
);

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
  reserved_at = NULL,
  batch_id = NULL
WHERE t.ticket_code NOT IN (SELECT ticket_code FROM _keep_reservations);

DELETE FROM public.audit_logs;

COMMIT;

-- Verify
SELECT ticket_code, status, buyer_name, buyer_phone, buyer_email, reserved_at
FROM public.tickets
WHERE ticket_code IN ('PF-000003', 'PF-000004', 'PF-000005')
ORDER BY ticket_code;

SELECT status, count(*) AS total
FROM public.tickets
GROUP BY status
ORDER BY status;
