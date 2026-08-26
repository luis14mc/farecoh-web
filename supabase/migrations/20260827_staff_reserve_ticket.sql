-- Staff can reserve batch-assigned tickets from admin (assigned|available → reserved).
-- Cancelling a batch ticket reservation restores assigned instead of available.

CREATE OR REPLACE FUNCTION public.staff_reserve_ticket(
  p_ticket_code TEXT,
  p_full_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_reserved_by TEXT
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

  IF coalesce(trim(p_full_name), '') = '' OR coalesce(trim(p_phone), '') = '' THEN
    RAISE EXCEPTION 'Indique nombre y teléfono del comprador';
  END IF;

  SELECT t.*
  INTO v_ticket
  FROM public.tickets t
  WHERE t.ticket_code = upper(trim(p_ticket_code))
  FOR UPDATE OF t;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Boleto inexistente';
  END IF;

  IF v_ticket.status NOT IN ('available', 'assigned') THEN
    RAISE EXCEPTION 'Solo se pueden reservar boletos disponibles o asignados a lote';
  END IF;

  UPDATE public.tickets t
  SET
    status = 'reserved',
    buyer_name = trim(p_full_name),
    buyer_phone = trim(p_phone),
    buyer_email = nullif(lower(trim(p_email)), ''),
    reserved_at = now()
  WHERE t.id = v_ticket.id
  RETURNING * INTO v_ticket;

  v_actor := nullif(trim(p_reserved_by), '');

  INSERT INTO public.audit_logs (action, entity, entity_id, performed_by)
  VALUES (
    'ticket.reserved_staff',
    'tickets',
    v_ticket.id,
    coalesce(v_actor, 'staff')
  );

  RETURN v_ticket;
END;
$$;

GRANT EXECUTE ON FUNCTION public.staff_reserve_ticket(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

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
  v_restore_status TEXT;
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

  v_restore_status := CASE WHEN v_ticket.batch_id IS NOT NULL THEN 'assigned' ELSE 'available' END;

  UPDATE public.tickets t
  SET
    status = v_restore_status,
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

NOTIFY pgrst, 'reload schema';
