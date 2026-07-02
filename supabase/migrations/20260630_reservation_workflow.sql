-- Reservation workflow: reserved_at tracking, cancel RPC, create_ticket_order update.

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.cancel_ticket_reservation(
  p_ticket_code TEXT,
  p_cancelled_by TEXT,
  p_reason TEXT
)
RETURNS public.tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.tickets%ROWTYPE;
  v_actor TEXT;
BEGIN
  IF NOT public.can_sell_tickets() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT t.*
  INTO v_ticket
  FROM public.tickets t
  WHERE t.ticket_code = upper(trim(p_ticket_code))
  FOR UPDATE OF t;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Boleto inexistente';
  END IF;

  IF v_ticket.status <> 'reserved' THEN
    RAISE EXCEPTION 'Solo se pueden cancelar boletos en estado reservado';
  END IF;

  UPDATE public.tickets t
  SET
    status = 'available',
    buyer_name = NULL,
    buyer_phone = NULL,
    buyer_email = NULL,
    reserved_at = NULL
  WHERE t.id = v_ticket.id
  RETURNING * INTO v_ticket;

  v_actor := nullif(trim(p_cancelled_by), '');

  INSERT INTO public.audit_logs (action, entity, entity_id, performed_by)
  VALUES (
    'ticket.reservation_cancelled',
    'tickets',
    v_ticket.id,
    coalesce(v_actor, 'system')
  );

  RETURN v_ticket;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_ticket_reservation(TEXT, TEXT, TEXT) TO authenticated;

DROP FUNCTION IF EXISTS public.create_ticket_order(TEXT, TEXT, TEXT, TEXT, INTEGER);

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
  FOR UPDATE OF e;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento no encontrado o inactivo';
  END IF;

  FOR v_ticket IN
    SELECT t.id, t.ticket_code
    FROM public.tickets t
    WHERE t.event_id = v_event.id
      AND t.status = 'available'
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

GRANT EXECUTE ON FUNCTION public.create_ticket_order(TEXT, TEXT, TEXT, TEXT, INTEGER) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
