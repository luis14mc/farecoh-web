-- Add Gustavo and his band ticket assignments (idempotent).
-- Run in Supabase SQL Editor if the main migration was already applied.

INSERT INTO public.band_musicians (name) VALUES ('Gustavo')
ON CONFLICT (name) DO NOTHING;

WITH seed AS (
  SELECT * FROM (VALUES
    ('Gustavo', 'PF-000256'),
    ('Gustavo', 'PF-000384'),
    ('Gustavo', 'PF-000442'),
    ('Gustavo', 'PF-000479'),
    ('Gustavo', 'PF-000320'),
    ('Gustavo', 'PF-000448'),
    ('Gustavo', 'PF-000351'),
    ('Gustavo', 'PF-000415'),
    ('Gustavo', 'PF-000378'),
    ('Gustavo', 'PF-000282')
  ) AS t(musician_name, ticket_code)
)
INSERT INTO public.band_musician_tickets (musician_id, ticket_code)
SELECT bm.id, seed.ticket_code
FROM seed
JOIN public.band_musicians bm ON bm.name = seed.musician_name
ON CONFLICT (ticket_code) DO NOTHING;
