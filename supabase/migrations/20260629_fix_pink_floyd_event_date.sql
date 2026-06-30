-- Align Pink Floyd event metadata with the canonical app fallback (2026-08-29).
-- Safe to re-run.

INSERT INTO public.events (
  slug,
  title,
  description,
  event_date,
  event_time,
  location,
  city,
  ticket_price,
  capacity,
  status
) VALUES (
  'pink-floyd',
  'Tributo a Pink Floyd',
  'Concierto tributo sinfónico a Pink Floyd por FARECOH.',
  DATE '2026-08-29',
  '8:00 p. m.',
  'Escuela Nacional de Música, Tegucigalpa',
  'Tegucigalpa',
  500,
  500,
  'active'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  event_date = EXCLUDED.event_date,
  event_time = EXCLUDED.event_time,
  location = EXCLUDED.location,
  city = EXCLUDED.city,
  ticket_price = EXCLUDED.ticket_price,
  capacity = EXCLUDED.capacity,
  status = EXCLUDED.status;

NOTIFY pgrst, 'reload schema';
