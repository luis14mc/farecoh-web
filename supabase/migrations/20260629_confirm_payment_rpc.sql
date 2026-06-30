-- Confirm payment / register sale: available | assigned | reserved → sold
-- Safe to re-run.

DROP FUNCTION IF EXISTS public.confirm_ticket_payment(
  TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION public.confirm_ticket_payment(
  p_ticket_code TEXT,
  p_payment_method TEXT,
  p_payment_reference TEXT,
  p_seller_id UUID,
  p_sale_location TEXT,
  p_confirmed_by TEXT,
  p_buyer_name TEXT DEFAULT NULL,
  p_buyer_phone TEXT DEFAULT NULL,
  p_buyer_email TEXT DEFAULT NULL
)
RETURNS public.tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.tickets%ROWTYPE;
  v_seller public.sellers%ROWTYPE;
  v_amount NUMERIC(10, 2);
  v_prev_status TEXT;
  v_final_name TEXT;
  v_final_phone TEXT;
  v_final_email TEXT;
  v_actor TEXT;
  v_action TEXT;
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

  IF v_ticket.status IN ('sold', 'validated', 'cancelled') THEN
    RAISE EXCEPTION 'Boleto no disponible para confirmación de pago';
  END IF;

  IF v_ticket.status NOT IN ('available', 'assigned', 'reserved') THEN
    RAISE EXCEPTION 'Estado de boleto no permitido';
  END IF;

  v_prev_status := v_ticket.status;

  SELECT s.*
  INTO v_seller
  FROM public.sellers s
  WHERE s.id = p_seller_id
    AND s.active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendedor no encontrado';
  END IF;

  v_final_name := nullif(trim(coalesce(p_buyer_name, v_ticket.buyer_name)), '');
  v_final_phone := nullif(trim(coalesce(p_buyer_phone, v_ticket.buyer_phone)), '');
  v_final_email := nullif(lower(trim(coalesce(p_buyer_email, v_ticket.buyer_email, ''))), '');

  IF v_final_name IS NULL OR v_final_phone IS NULL THEN
    RAISE EXCEPTION 'Nombre y teléfono del comprador son obligatorios';
  END IF;

  SELECT e.ticket_price
  INTO v_amount
  FROM public.events e
  WHERE e.id = v_ticket.event_id;

  UPDATE public.tickets t
  SET
    status = 'sold',
    buyer_name = v_final_name,
    buyer_phone = v_final_phone,
    buyer_email = v_final_email,
    seller_id = p_seller_id,
    seller_name = v_seller.name,
    sale_location = trim(p_sale_location),
    payment_method = trim(p_payment_method),
    payment_reference = nullif(trim(p_payment_reference), ''),
    sold_at = now()
  WHERE t.id = v_ticket.id
  RETURNING * INTO v_ticket;

  INSERT INTO public.sales (
    ticket_id, amount, payment_method, seller_id, seller_name, sales_point
  ) VALUES (
    v_ticket.id,
    v_amount,
    trim(p_payment_method),
    p_seller_id,
    v_seller.name,
    trim(p_sale_location)
  );

  v_actor := nullif(trim(p_confirmed_by), '');
  v_action := CASE WHEN v_prev_status = 'reserved' THEN 'ticket.payment_confirmed' ELSE 'ticket.sold' END;

  INSERT INTO public.audit_logs (action, entity, entity_id, performed_by)
  VALUES (v_action, 'tickets', v_ticket.id, coalesce(v_actor, 'system'));

  RETURN v_ticket;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_ticket_payment(
  TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated;

NOTIFY pgrst, 'reload schema';
