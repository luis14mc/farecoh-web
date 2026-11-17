ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'vendor';
ALTER TABLE public.ticket_batches ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id);
ALTER TABLE public.ticket_batches ADD COLUMN IF NOT EXISTS location TEXT;

UPDATE public.ticket_batches AS batch
SET event_id = (SELECT t.event_id FROM public.tickets t WHERE t.batch_id = batch.id LIMIT 1)
WHERE batch.event_id IS NULL;

CREATE INDEX IF NOT EXISTS ticket_batches_event_id_idx ON public.ticket_batches(event_id);
CREATE OR REPLACE FUNCTION public.create_ticket_order(
  p_event_slug TEXT,
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_quantity INTEGER
)
RETURNS TABLE (
  order_id UUID,
  ticket_codes TEXT[],
  total_amount NUMERIC,
  reservation_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event public.events%ROWTYPE;
  v_order_id UUID := gen_random_uuid();
  v_codes TEXT[] := '{}';
  v_ticket RECORD;
  v_reserved INTEGER := 0;
BEGIN
  IF p_quantity < 1 OR p_quantity > 10 THEN
    RAISE EXCEPTION 'La cantidad debe estar entre 1 y 10';
  END IF;

  SELECT e.*
  INTO v_event
  FROM public.events e
  WHERE e.slug = p_event_slug
    AND e.status = 'active'
    AND e.published
    AND e.sales_open
  FOR UPDATE OF e;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento no encontrado o inactivo';
  END IF;

  FOR v_ticket IN
    SELECT t.id, t.ticket_code
    FROM public.tickets t
    WHERE t.event_id = v_event.id
      AND t.status = 'available'
      AND t.batch_id IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.band_musician_tickets bmt
        WHERE bmt.ticket_code = t.ticket_code
      )
    ORDER BY t.ticket_code
    FOR UPDATE OF t SKIP LOCKED
    LIMIT p_quantity
  LOOP
    UPDATE public.tickets t
    SET
      status = 'reserved',
      buyer_name = trim(p_full_name),
      buyer_phone = trim(p_phone),
      buyer_email = nullif(lower(trim(p_email)), ''),
      reserved_at = now()
    WHERE t.id = v_ticket.id;

    v_codes := array_append(v_codes, v_ticket.ticket_code);
    v_reserved := v_reserved + 1;
  END LOOP;

  IF v_reserved < p_quantity THEN
    RAISE EXCEPTION 'No hay suficientes boletos disponibles';
  END IF;

  INSERT INTO public.audit_logs (action, entity, entity_id, performed_by)
  VALUES ('ticket.reserved', 'reservation', v_order_id, 'public');

  RETURN QUERY
  SELECT v_order_id, v_codes, v_event.ticket_price * p_quantity, 'reserved'::TEXT;
END;
$$;
