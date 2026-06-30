-- Normalize legacy ticket statuses to the canonical model.
-- Safe to re-run.

UPDATE public.tickets SET status = 'sold' WHERE status = 'paid';
UPDATE public.tickets SET status = 'reserved' WHERE status = 'pending';

ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_status_check CHECK (
    status IN ('available', 'assigned', 'reserved', 'sold', 'validated', 'cancelled')
  );

NOTIFY pgrst, 'reload schema';
