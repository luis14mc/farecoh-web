-- Control list: tickets assigned to band members (independent of sales/check-in status).

CREATE TABLE IF NOT EXISTS public.band_musicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.band_musician_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  musician_id UUID NOT NULL REFERENCES public.band_musicians(id) ON DELETE CASCADE,
  ticket_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT band_musician_tickets_code_format CHECK (ticket_code ~ '^PF-[0-9]{6}$'),
  CONSTRAINT band_musician_tickets_code_unique UNIQUE (ticket_code)
);

CREATE INDEX IF NOT EXISTS band_musician_tickets_musician_id_idx
  ON public.band_musician_tickets (musician_id);

CREATE INDEX IF NOT EXISTS band_musician_tickets_ticket_code_idx
  ON public.band_musician_tickets (ticket_code);

ALTER TABLE public.band_musicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.band_musician_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin manage band_musicians" ON public.band_musicians;
CREATE POLICY "Super admin manage band_musicians"
  ON public.band_musicians FOR ALL
  USING (public.get_auth_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Event manager manage band_musicians" ON public.band_musicians;
CREATE POLICY "Event manager manage band_musicians"
  ON public.band_musicians FOR ALL
  USING (public.get_auth_user_role() = 'event_manager');

DROP POLICY IF EXISTS "Super admin manage band_musician_tickets" ON public.band_musician_tickets;
CREATE POLICY "Super admin manage band_musician_tickets"
  ON public.band_musician_tickets FOR ALL
  USING (public.get_auth_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Event manager manage band_musician_tickets" ON public.band_musician_tickets;
CREATE POLICY "Event manager manage band_musician_tickets"
  ON public.band_musician_tickets FOR ALL
  USING (public.get_auth_user_role() = 'event_manager');

-- Initial musicians and ticket assignments (idempotent).
INSERT INTO public.band_musicians (name) VALUES
  ('Mauricio'),
  ('Iris'),
  ('Miguel'),
  ('Marlon'),
  ('Sergio'),
  ('Jonathan')
ON CONFLICT (name) DO NOTHING;

WITH seed AS (
  SELECT * FROM (VALUES
    ('Mauricio', 'PF-000481'),
    ('Mauricio', 'PF-000297'),
    ('Mauricio', 'PF-000383'),
    ('Mauricio', 'PF-000447'),
    ('Mauricio', 'PF-000319'),
    ('Mauricio', 'PF-000350'),
    ('Mauricio', 'PF-000289'),
    ('Mauricio', 'PF-000425'),
    ('Mauricio', 'PF-000321'),
    ('Mauricio', 'PF-000361'),
    ('Iris', 'PF-000453'),
    ('Iris', 'PF-000261'),
    ('Iris', 'PF-000325'),
    ('Iris', 'PF-000483'),
    ('Iris', 'PF-000356'),
    ('Iris', 'PF-000389'),
    ('Iris', 'PF-000421'),
    ('Iris', 'PF-000485'),
    ('Iris', 'PF-000293'),
    ('Iris', 'PF-000419'),
    ('Miguel', 'PF-000422'),
    ('Miguel', 'PF-000358'),
    ('Miguel', 'PF-000355'),
    ('Miguel', 'PF-000454'),
    ('Miguel', 'PF-000294'),
    ('Miguel', 'PF-000486'),
    ('Miguel', 'PF-000357'),
    ('Marlon', 'PF-000381'),
    ('Marlon', 'PF-000445'),
    ('Marlon', 'PF-000476'),
    ('Marlon', 'PF-000348'),
    ('Marlon', 'PF-000412'),
    ('Marlon', 'PF-000253'),
    ('Marlon', 'PF-000284'),
    ('Marlon', 'PF-000283'),
    ('Marlon', 'PF-000317'),
    ('Sergio', 'PF-000451'),
    ('Sergio', 'PF-000484'),
    ('Sergio', 'PF-000292'),
    ('Sergio', 'PF-000387'),
    ('Sergio', 'PF-000420'),
    ('Sergio', 'PF-000260'),
    ('Sergio', 'PF-000452'),
    ('Sergio', 'PF-000388'),
    ('Sergio', 'PF-000323'),
    ('Sergio', 'PF-000259'),
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
