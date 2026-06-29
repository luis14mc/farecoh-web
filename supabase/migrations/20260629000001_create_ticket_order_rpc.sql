-- FARECOH: Create public.create_ticket_order RPC
-- This function is called by TicketForm.astro client-side via supabase.rpc()
-- Signature: create_ticket_order(p_event_slug, p_full_name, p_email, p_phone, p_quantity)
-- Returns: (order_id, customer_id, ticket_codes, total_amount)

CREATE OR REPLACE FUNCTION public.create_ticket_order(
  p_event_slug TEXT,
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_quantity INTEGER
)
RETURNS TABLE (
  order_id UUID,
  customer_id UUID,
  ticket_codes TEXT[],
  total_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event public.events%ROWTYPE;
  v_customer_id UUID;
  v_order_id UUID;
  v_ticket_id UUID;
  v_codes TEXT[] := '{}';
  v_code TEXT;
  v_existing_count INTEGER;
BEGIN
  IF p_quantity < 1 OR p_quantity > 10 THEN
    RAISE EXCEPTION 'Ticket quantity must be between 1 and 10';
  END IF;

  SELECT * INTO v_event
  FROM public.events
  WHERE slug = p_event_slug AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found or inactive';
  END IF;

  SELECT count(*) INTO v_existing_count
  FROM public.tickets
  WHERE event_id = v_event.id AND status <> 'cancelled';

  IF v_existing_count + p_quantity > v_event.capacity THEN
    RAISE EXCEPTION 'Event capacity exceeded';
  END IF;

  SELECT id INTO v_customer_id
  FROM public.customers
  WHERE nullif(lower(trim(p_email)), '') IS NOT NULL
    AND lower(email) = lower(trim(p_email))
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (full_name, email, phone)
    VALUES (trim(p_full_name), nullif(lower(trim(p_email)), ''), trim(p_phone))
    RETURNING id INTO v_customer_id;
  END IF;

  INSERT INTO public.orders (event_id, customer_id, total_amount, quantity, status)
  VALUES (v_event.id, v_customer_id, v_event.ticket_price * p_quantity, p_quantity, 'pending')
  RETURNING id INTO v_order_id;

  FOR i IN 1..p_quantity LOOP
    INSERT INTO public.tickets (event_id, order_id, customer_id, status, event_slug)
    VALUES (v_event.id, v_order_id, v_customer_id, 'pending', p_event_slug)
    RETURNING id, ticket_code INTO v_ticket_id, v_code;
    v_codes := array_append(v_codes, v_code);
  END LOOP;

  INSERT INTO public.audit_logs (action, entity, entity_id, performed_by)
  VALUES ('sale.reserved', 'orders', v_order_id::TEXT, 'system');

  RETURN QUERY SELECT v_order_id, v_customer_id, v_codes, v_event.ticket_price * p_quantity;
END;
$$;

-- Reload Supabase schema cache
NOTIFY pgrst, 'reload schema';
