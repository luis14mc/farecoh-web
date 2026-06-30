-- Verify validate_ticket RPC with qualified status references.
-- Safe to re-run.

DROP FUNCTION IF EXISTS public.validate_ticket(TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.validate_ticket(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.validate_ticket(
  p_ticket_code TEXT,
  p_validated_by TEXT
)
RETURNS TABLE (
  ok BOOLEAN,
  message TEXT,
  ticket_id UUID,
  ticket_code TEXT,
  status TEXT,
  validated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.tickets%ROWTYPE;
  v_actor TEXT;
BEGIN
  IF NOT public.can_validate_tickets() THEN
    RETURN QUERY
    SELECT FALSE, 'No autorizado'::TEXT, NULL::UUID, upper(trim(p_ticket_code)), NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT t.*
  INTO v_ticket
  FROM public.tickets t
  WHERE t.ticket_code = upper(trim(p_ticket_code))
  FOR UPDATE OF t;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT FALSE, 'Boleto inexistente'::TEXT, NULL::UUID, upper(trim(p_ticket_code)), NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_ticket.status = 'validated' THEN
    RETURN QUERY
    SELECT FALSE, 'Boleto ya utilizado'::TEXT, v_ticket.id, v_ticket.ticket_code, v_ticket.status, v_ticket.validated_at;
    RETURN;
  END IF;

  IF v_ticket.status = 'cancelled' THEN
    RETURN QUERY
    SELECT FALSE, 'Boleto anulado'::TEXT, v_ticket.id, v_ticket.ticket_code, v_ticket.status, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_ticket.status = 'reserved' THEN
    RETURN QUERY
    SELECT FALSE, 'Boleto reservado, pago no confirmado'::TEXT, v_ticket.id, v_ticket.ticket_code, v_ticket.status, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_ticket.status IN ('available', 'assigned') THEN
    RETURN QUERY
    SELECT FALSE, 'Boleto no vendido'::TEXT, v_ticket.id, v_ticket.ticket_code, v_ticket.status, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_ticket.status <> 'sold' THEN
    RETURN QUERY
    SELECT FALSE, 'Boleto no vendido'::TEXT, v_ticket.id, v_ticket.ticket_code, v_ticket.status, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  v_actor := nullif(trim(p_validated_by), '');

  UPDATE public.tickets t
  SET status = 'validated', validated_at = now()
  WHERE t.id = v_ticket.id
  RETURNING * INTO v_ticket;

  INSERT INTO public.checkins (ticket_id, validated_by)
  VALUES (v_ticket.id, coalesce(v_actor, 'system'));

  INSERT INTO public.audit_logs (action, entity, entity_id, performed_by)
  VALUES ('ticket.validated', 'tickets', v_ticket.id, coalesce(v_actor, 'system'));

  RETURN QUERY
  SELECT TRUE, 'Ingreso validado'::TEXT, v_ticket.id, v_ticket.ticket_code, v_ticket.status, v_ticket.validated_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_ticket(TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
