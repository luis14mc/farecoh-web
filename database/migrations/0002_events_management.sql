ALTER TABLE public.events
  ADD COLUMN subtitle TEXT,
  ADD COLUMN image_url TEXT,
  ADD COLUMN published BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN sales_open BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.events SET status = 'draft'
WHERE status NOT IN ('draft', 'active', 'finished', 'cancelled');

ALTER TABLE public.events
  ALTER COLUMN status SET DEFAULT 'draft',
  ADD CONSTRAINT events_status_check CHECK (status IN ('draft', 'active', 'finished', 'cancelled'));

CREATE INDEX events_published_event_date_idx ON public.events (published, event_date);
UPDATE public.events SET published = true WHERE slug = 'pink-floyd';

CREATE FUNCTION public.touch_event_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER events_updated_at BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.touch_event_updated_at();
