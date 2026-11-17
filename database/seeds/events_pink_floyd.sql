INSERT INTO public.events (
  slug, title, description, event_date, event_time, location, city, ticket_price, capacity, status, published
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
  'active', true
)
ON CONFLICT (slug) DO NOTHING;
