-- ============================================================
-- FARECOH Web - Unified PostgreSQL Production Schema
-- Designed for Railway PostgreSQL Deployment
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. roles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.roles (name, description) VALUES
  ('super_admin', 'Super administrador con acceso total'),
  ('event_manager', 'Gestor de eventos y contenido'),
  ('seller', 'Vendedor físico de boletos'),
  ('checkin_operator', 'Operador de control de acceso')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 2. users (Native PostgreSQL Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role_id UUID NOT NULL REFERENCES public.roles(id),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);
CREATE INDEX IF NOT EXISTS users_role_id_idx ON public.users(role_id);
CREATE INDEX IF NOT EXISTS users_active_idx ON public.users(active);

-- Default Super Admin User (password: Admin2026!farecoh)
-- Generated with Node.js crypto.scryptSync
INSERT INTO public.users (email, password_hash, full_name, role_id, active)
SELECT
  'admin@farecoh.org',
  '79c0a6bbf0ae2da3df1f2c27b0b2e8a7:42f8c5cf05df082729938e55e0fef4d896ee84c3ee25eb578a58a98444a7f7663aa9b380dbcbdf51800fbc51a1d13f9f4625ae15df68b64e0374e2aee2ec46fb',
  'Administrador FARECOH',
  r.id,
  true
FROM public.roles r
WHERE r.name = 'super_admin'
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 3. events
-- ============================================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TEXT NOT NULL,
  location TEXT NOT NULL,
  city TEXT,
  ticket_price NUMERIC(10, 2) NOT NULL CHECK (ticket_price >= 0),
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_slug_idx ON public.events(slug);

INSERT INTO public.events (
  slug, title, description, event_date, event_time, location, city, ticket_price, capacity, status
) VALUES (
  'pink-floyd',
  'Tributo a Pink Floyd',
  'Concierto tributo sinfónico a Pink Floyd por FARECOH.',
  DATE '2026-08-29',
  '8:00 p. m.',
  'Escuela Nacional de Música, Tegucigalpa',
  'Tegucigalpa',
  500,
  500,
  'active'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  event_date = EXCLUDED.event_date,
  event_time = EXCLUDED.event_time,
  location = EXCLUDED.location,
  city = EXCLUDED.city,
  ticket_price = EXCLUDED.ticket_price,
  capacity = EXCLUDED.capacity,
  status = EXCLUDED.status;

-- ============================================================
-- 4. sellers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'seller',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. ticket_batches
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ticket_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  from_code TEXT NOT NULL,
  to_code TEXT NOT NULL,
  count INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS ticket_batches_seller_id_idx ON public.ticket_batches(seller_id);

-- ============================================================
-- 6. tickets
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
  ticket_code TEXT NOT NULL UNIQUE,
  qr_token UUID UNIQUE DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'available',
  buyer_name TEXT,
  buyer_phone TEXT,
  buyer_email TEXT,
  seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
  seller_name TEXT,
  sale_location TEXT,
  payment_method TEXT,
  payment_reference TEXT,
  batch_id UUID REFERENCES public.ticket_batches(id) ON DELETE SET NULL,
  reserved_at TIMESTAMPTZ,
  sold_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tickets_event_id_idx ON public.tickets(event_id);
CREATE INDEX IF NOT EXISTS tickets_ticket_code_idx ON public.tickets(ticket_code);
CREATE INDEX IF NOT EXISTS tickets_qr_token_idx ON public.tickets(qr_token);
CREATE INDEX IF NOT EXISTS tickets_status_idx ON public.tickets(status);
CREATE INDEX IF NOT EXISTS tickets_batch_id_idx ON public.tickets(batch_id);
CREATE INDEX IF NOT EXISTS tickets_seller_id_idx ON public.tickets(seller_id);
CREATE INDEX IF NOT EXISTS tickets_sold_at_idx ON public.tickets(sold_at DESC);
CREATE INDEX IF NOT EXISTS tickets_reserved_at_idx ON public.tickets(reserved_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS tickets_online_reservable_idx
  ON public.tickets (event_id, ticket_code)
  WHERE status = 'available' AND batch_id IS NULL;

-- ============================================================
-- 7. sales
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE RESTRICT,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  payment_method TEXT NOT NULL,
  seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
  seller_name TEXT NOT NULL,
  sales_point TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sales_ticket_id_idx ON public.sales(ticket_id);
CREATE INDEX IF NOT EXISTS sales_seller_id_idx ON public.sales(seller_id);
CREATE INDEX IF NOT EXISTS sales_created_at_idx ON public.sales(created_at DESC);

-- ============================================================
-- 8. checkins
-- ============================================================
CREATE TABLE IF NOT EXISTS public.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE RESTRICT,
  validated_by TEXT NOT NULL,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS checkins_ticket_id_idx ON public.checkins(ticket_id);
CREATE INDEX IF NOT EXISTS checkins_validated_at_idx ON public.checkins(validated_at DESC);

-- ============================================================
-- 9. reservation_notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reservation_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS res_notif_status_idx ON public.reservation_notifications(status);
CREATE INDEX IF NOT EXISTS res_notif_code_idx ON public.reservation_notifications(ticket_code);

-- ============================================================
-- 10. audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  performed_by TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at DESC);

-- ============================================================
-- 11. band_musicians & band_musician_tickets
-- ============================================================
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

-- Seed default musicians and reservations
INSERT INTO public.band_musicians (name) VALUES
  ('Mauricio'),
  ('Iris'),
  ('Miguel'),
  ('Marlon'),
  ('Sergio'),
  ('Jonathan'),
  ('Gustavo')
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
    ('Jonathan', 'PF-000385'),
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

-- ============================================================
-- 12. ticket_layout_configs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ticket_layout_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_type TEXT NOT NULL UNIQUE CHECK (layout_type IN ('physical', 'digital')),
  template_path TEXT NOT NULL,
  config JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS ticket_layout_configs_layout_type_idx
  ON public.ticket_layout_configs (layout_type);

INSERT INTO public.ticket_layout_configs (layout_type, template_path, config, updated_by)
VALUES
  (
    'physical',
    '/templates/ticket-pink-floyd.png',
    '{
      "templateWidth": 2000,
      "templateHeight": 800,
      "codeFontSize": 36,
      "codeBoxes": [
        { "x": 190, "y": 366, "width": 200, "height": 40 },
        { "x": 1610, "y": 366, "width": 200, "height": 40 }
      ],
      "qrBoxes": [
        { "x": 167, "y": 468, "width": 230, "height": 230 },
        { "x": 1603, "y": 468, "width": 230, "height": 230 }
      ]
    }'::jsonb,
    'init'
  ),
  (
    'digital',
    '/templates/digital-ticket.png',
    '{
      "templateWidth": 1080,
      "templateHeight": 1920,
      "codeFontSize": 34,
      "codeBoxes": [
        { "x": 340, "y": 1400, "width": 400, "height": 80 }
      ],
      "qrBoxes": [
        { "x": 360, "y": 910, "width": 360, "height": 360 }
      ]
    }'::jsonb,
    'init'
  )
ON CONFLICT (layout_type) DO NOTHING;

-- ============================================================
-- 13. RPC Functions & Logic
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_sell_tickets()
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT TRUE;
$$;

CREATE OR REPLACE FUNCTION public.can_validate_tickets()
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT TRUE;
$$;

-- Initial 500 tickets generator
CREATE OR REPLACE FUNCTION public.create_initial_ticket_inventory()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_event_id UUID;
  v_inserted INTEGER := 0;
  v_code TEXT;
  i INTEGER;
BEGIN
  SELECT id INTO v_event_id FROM public.events WHERE slug = 'pink-floyd' LIMIT 1;
  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Event pink-floyd not found';
  END IF;

  FOR i IN 1..500 LOOP
    v_code := 'PF-' || lpad(i::TEXT, 6, '0');
    INSERT INTO public.tickets (event_id, ticket_code, status)
    VALUES (v_event_id, v_code, 'available')
    ON CONFLICT (ticket_code) DO NOTHING;
    IF FOUND THEN
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  RETURN v_inserted;
END;
$$;

-- Online Reservation RPC
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

-- Staff Reserve Ticket RPC
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

-- Cancel Reservation RPC
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

-- Validate Ticket by Code RPC
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

-- Validate Ticket by QR Token RPC
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

-- Confirm Ticket Payment RPC
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

-- Public ticket lookup by QR
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
