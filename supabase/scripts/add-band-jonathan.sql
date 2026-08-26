-- Add Jonathan and his band ticket assignments (idempotent).
-- Run in Supabase SQL Editor if the main migration was already applied.

INSERT INTO public.band_musicians (name) VALUES ('Jonathan')
ON CONFLICT (name) DO NOTHING;

WITH seed AS (
  SELECT * FROM (VALUES
    ('Jonathan', 'PF-000352'),
    ('Jonathan', 'PF-000449'),
    ('Jonathan', 'PF-000416'),
    ('Jonathan', 'PF-000288'),
    ('Jonathan', 'PF-000480'),
    ('Jonathan', 'PF-000324'),
    ('Jonathan', 'PF-000257'),
    ('Jonathan', 'PF-000287'),
    ('Jonathan', 'PF-000250'),
    ('Jonathan', 'PF-000385')
  ) AS t(musician_name, ticket_code)
)
INSERT INTO public.band_musician_tickets (musician_id, ticket_code)
SELECT bm.id, seed.ticket_code
FROM seed
JOIN public.band_musicians bm ON bm.name = seed.musician_name
ON CONFLICT (ticket_code) DO NOTHING;
