-- Reset test tickets PF-000001 and PF-000002 (validated during QA).
-- Run in Supabase SQL Editor if they still appear as validated.

BEGIN;

DELETE FROM public.checkins c
USING public.tickets t
WHERE c.ticket_id = t.id
  AND t.ticket_code IN ('PF-000001', 'PF-000002');

DELETE FROM public.sales s
USING public.tickets t
WHERE s.ticket_id = t.id
  AND t.ticket_code IN ('PF-000001', 'PF-000002');

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
WHERE ticket_code IN ('PF-000001', 'PF-000002');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'reserved_at'
  ) THEN
    UPDATE public.tickets SET reserved_at = NULL
    WHERE ticket_code IN ('PF-000001', 'PF-000002');
  END IF;
END $$;

COMMIT;

SELECT ticket_code, status, validated_at, buyer_name
FROM public.tickets
WHERE ticket_code IN ('PF-000001', 'PF-000002')
ORDER BY ticket_code;

SELECT c.validated_at, t.ticket_code, t.status
FROM public.checkins c
JOIN public.tickets t ON t.id = c.ticket_id
WHERE t.ticket_code IN ('PF-000001', 'PF-000002');
