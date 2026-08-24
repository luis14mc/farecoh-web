-- Reset PF-000106 .. PF-000108 after incorrect generation / sale.
-- Run in Supabase SQL Editor (postgres / service role).
-- Does NOT change ticket_code or qr_token.

BEGIN;

DELETE FROM public.checkins c
USING public.tickets t
WHERE c.ticket_id = t.id
  AND t.ticket_code IN ('PF-000106', 'PF-000107', 'PF-000108');

DELETE FROM public.sales s
USING public.tickets t
WHERE s.ticket_id = t.id
  AND t.ticket_code IN ('PF-000106', 'PF-000107', 'PF-000108');

UPDATE public.tickets
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
WHERE ticket_code IN ('PF-000106', 'PF-000107', 'PF-000108');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'reserved_at'
  ) THEN
    UPDATE public.tickets
    SET reserved_at = NULL
    WHERE ticket_code IN ('PF-000106', 'PF-000107', 'PF-000108');
  END IF;
END $$;

COMMIT;

SELECT ticket_code, status, buyer_name, seller_name, sold_at, validated_at
FROM public.tickets
WHERE ticket_code IN ('PF-000106', 'PF-000107', 'PF-000108')
ORDER BY ticket_code;
