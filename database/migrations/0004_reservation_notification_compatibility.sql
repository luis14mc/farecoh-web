ALTER TABLE public.reservation_notifications
  ADD COLUMN IF NOT EXISTS ticket_codes TEXT[],
  ADD COLUMN IF NOT EXISTS buyer_email TEXT,
  ADD COLUMN IF NOT EXISTS recipient TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT;

UPDATE public.reservation_notifications SET ticket_codes = ARRAY[ticket_code]
WHERE ticket_codes IS NULL AND ticket_code IS NOT NULL;

ALTER TABLE public.reservation_notifications ALTER COLUMN ticket_code DROP NOT NULL;
