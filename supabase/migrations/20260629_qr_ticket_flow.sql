-- QR ticket flow: ensure qr_token, public lookup, and QR check-in RPC.
-- Safe to re-run.

ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS qr_token UUID UNIQUE DEFAULT gen_random_uuid();

UPDATE public.tickets
SET qr_token = gen_random_uuid()
WHERE qr_token IS NULL;

ALTER TABLE public.tickets
ALTER COLUMN qr_token SET NOT NULL;

CREATE OR REPLACE FUNCTION public.get_public_ticket_status(p_qr_token TEXT)
RETURNS TABLE (ticket_code TEXT, status TEXT, event_slug TEXT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.ticket_code, t.status, e.slug
  FROM public.tickets t
  JOIN public.events e ON e.id = t.event_id
  WHERE t.qr_token::TEXT = trim(p_qr_token)
  LIMIT 1;
$$;

DROP FUNCTION IF EXISTS public.validate_ticket_by_qr(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.validate_ticket_by_qr(
  p_qr_token TEXT,
  p_validated_by TEXT
)
RETURNS TABLE (
  ok BOOLEAN,
  message TEXT,
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
    SELECT FALSE, 'No autorizado'::TEXT, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT t.*
  INTO v_ticket
  FROM public.tickets t
  WHERE t.qr_token::TEXT = trim(p_qr_token)
  FOR UPDATE OF t;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT FALSE, 'Boleto inexistente'::TEXT, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_ticket.status = 'validated' THEN
    RETURN QUERY
    SELECT FALSE, 'Boleto ya utilizado'::TEXT, v_ticket.ticket_code, v_ticket.status, v_ticket.validated_at;
    RETURN;
  END IF;

  IF v_ticket.status = 'cancelled' THEN
    RETURN QUERY
    SELECT FALSE, 'Boleto anulado'::TEXT, v_ticket.ticket_code, v_ticket.status, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_ticket.status = 'reserved' THEN
    RETURN QUERY
    SELECT FALSE, 'Boleto reservado, pago no confirmado'::TEXT, v_ticket.ticket_code, v_ticket.status, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_ticket.status IN ('available', 'assigned') THEN
    RETURN QUERY
    SELECT FALSE, 'Boleto no vendido'::TEXT, v_ticket.ticket_code, v_ticket.status, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_ticket.status <> 'sold' THEN
    RETURN QUERY
    SELECT FALSE, 'Boleto no vendido'::TEXT, v_ticket.ticket_code, v_ticket.status, NULL::TIMESTAMPTZ;
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
  SELECT TRUE, 'Ingreso validado'::TEXT, v_ticket.ticket_code, v_ticket.status, v_ticket.validated_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_ticket_status(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_ticket_by_qr(TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
