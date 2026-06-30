-- FARECOH Ticketing Core Schema
-- Canonical production model for roles, users, events, tickets, sales, check-ins and RPCs.
-- Safe to re-run on partially migrated databases.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- Legacy cleanup
-- ============================================================
DROP FUNCTION IF EXISTS public.mark_order_paid(UUID, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.validate_physical_ticket(TEXT);
DROP FUNCTION IF EXISTS public.create_ticket_order(TEXT, TEXT, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.sell_physical_ticket(TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.validate_ticket(TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.validate_ticket(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_initial_ticket_inventory();
DROP FUNCTION IF EXISTS public.get_public_ticket_status(TEXT);

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
-- 2. users
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role_id UUID NOT NULL REFERENCES public.roles(id),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_auth_user_id_idx ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS users_role_id_idx ON public.users(role_id);
CREATE INDEX IF NOT EXISTS users_active_idx ON public.users(active);

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
  type TEXT NOT NULL CHECK (type IN ('vendor', 'physical_point')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sellers_active_idx ON public.sellers(active);
CREATE INDEX IF NOT EXISTS sellers_type_idx ON public.sellers(type);

-- ============================================================
-- 5. ticket_batches
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ticket_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  start_code TEXT NOT NULL,
  end_code TEXT NOT NULL,
  total_tickets INTEGER NOT NULL CHECK (total_tickets > 0),
  assigned_seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ticket_batches_status_check CHECK (status IN ('active', 'closed', 'cancelled')),
  CONSTRAINT ticket_batches_codes_check CHECK (
    start_code ~ '^PF-[0-9]{6}$' AND end_code ~ '^PF-[0-9]{6}$'
  )
);

CREATE INDEX IF NOT EXISTS ticket_batches_event_id_idx ON public.ticket_batches(event_id);
CREATE INDEX IF NOT EXISTS ticket_batches_status_idx ON public.ticket_batches(status);

-- ============================================================
-- 6. tickets
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tickets'
  ) THEN
    CREATE TABLE public.tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
      batch_id UUID REFERENCES public.ticket_batches(id) ON DELETE SET NULL,
      ticket_code TEXT NOT NULL UNIQUE,
      qr_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
      status TEXT NOT NULL DEFAULT 'available',
      buyer_name TEXT,
      buyer_phone TEXT,
      buyer_email TEXT,
      seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
      seller_name TEXT,
      sale_location TEXT,
      payment_method TEXT,
      payment_reference TEXT,
      sold_at TIMESTAMPTZ,
      validated_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT tickets_code_format CHECK (ticket_code ~ '^PF-[0-9]{6}$'),
      CONSTRAINT tickets_status_check CHECK (
        status IN ('available', 'assigned', 'reserved', 'sold', 'validated', 'cancelled')
      )
    );
  END IF;
END $$;

-- Normalize legacy statuses before tightening constraints.
UPDATE public.tickets SET status = 'sold' WHERE status = 'paid';
UPDATE public.tickets SET status = 'reserved' WHERE status = 'pending';

ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_status_check CHECK (
    status IN ('available', 'assigned', 'reserved', 'sold', 'validated', 'cancelled')
  );

ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_order_id_fkey;
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_customer_id_fkey;
ALTER TABLE public.tickets DROP COLUMN IF EXISTS order_id;
ALTER TABLE public.tickets DROP COLUMN IF EXISTS customer_id;
ALTER TABLE public.tickets DROP COLUMN IF EXISTS event_slug;
ALTER TABLE public.tickets DROP COLUMN IF EXISTS qr_url;
ALTER TABLE public.tickets DROP COLUMN IF EXISTS payment_amount;
ALTER TABLE public.tickets DROP COLUMN IF EXISTS notes;
ALTER TABLE public.tickets DROP COLUMN IF EXISTS issued_at;
ALTER TABLE public.tickets DROP COLUMN IF EXISTS updated_at;

ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE RESTRICT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.ticket_batches(id) ON DELETE SET NULL;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS qr_token UUID UNIQUE DEFAULT gen_random_uuid();
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS buyer_name TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS buyer_phone TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS buyer_email TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS seller_name TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sale_location TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.tickets t
SET event_id = e.id
FROM public.events e
WHERE t.event_id IS NULL AND e.slug = 'pink-floyd';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tickets WHERE event_id IS NULL) THEN
    ALTER TABLE public.tickets ALTER COLUMN event_id SET NOT NULL;
  END IF;
END $$;

UPDATE public.tickets
SET qr_token = gen_random_uuid()
WHERE qr_token IS NULL;

ALTER TABLE public.tickets ALTER COLUMN qr_token SET DEFAULT gen_random_uuid();
ALTER TABLE public.tickets ALTER COLUMN qr_token SET NOT NULL;

CREATE INDEX IF NOT EXISTS tickets_event_id_idx ON public.tickets(event_id);
CREATE INDEX IF NOT EXISTS tickets_batch_id_idx ON public.tickets(batch_id);
CREATE INDEX IF NOT EXISTS tickets_status_idx ON public.tickets(status);
CREATE INDEX IF NOT EXISTS tickets_ticket_code_idx ON public.tickets(ticket_code);
CREATE INDEX IF NOT EXISTS tickets_qr_token_idx ON public.tickets(qr_token);
CREATE INDEX IF NOT EXISTS tickets_seller_id_idx ON public.tickets(seller_id);
CREATE INDEX IF NOT EXISTS tickets_sold_at_idx ON public.tickets(sold_at DESC);

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

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL;

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

ALTER TABLE public.checkins DROP CONSTRAINT IF EXISTS checkins_validated_by_fkey;
ALTER TABLE public.checkins ALTER COLUMN validated_by TYPE TEXT USING validated_by::TEXT;

CREATE INDEX IF NOT EXISTS checkins_ticket_id_idx ON public.checkins(ticket_id);
CREATE INDEX IF NOT EXISTS checkins_validated_at_idx ON public.checkins(validated_at DESC);

-- ============================================================
-- 9. audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  performed_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ALTER COLUMN entity_id DROP NOT NULL;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audit_logs'
      AND column_name = 'entity_id'
      AND udt_name IN ('text', 'varchar', 'bpchar')
  ) THEN
    ALTER TABLE public.audit_logs
      ALTER COLUMN entity_id TYPE UUID
      USING CASE
        WHEN entity_id IS NULL OR btrim(entity_id::TEXT) = '' THEN NULL
        WHEN entity_id::TEXT ~* '^[0-9a-f-]{36}$' THEN entity_id::TEXT::UUID
        ELSE NULL
      END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at DESC);

-- Drop legacy order/customer tables (canonical model uses tickets only).
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;

DROP TYPE IF EXISTS public.order_status;

-- ============================================================
-- RBAC helpers
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT r.name INTO v_role
  FROM public.users u
  JOIN public.roles r ON r.id = u.role_id
  WHERE u.auth_user_id = auth.uid() AND u.active = true;
  RETURN v_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.get_user_role();
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = auth.uid() AND active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.can_sell_tickets()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_auth_user_role() IN ('super_admin', 'event_manager', 'seller');
$$;

CREATE OR REPLACE FUNCTION public.can_validate_tickets()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_auth_user_role() IN ('super_admin', 'event_manager', 'checkin_operator');
$$;

-- ============================================================
-- RPC: create_initial_ticket_inventory()
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_initial_ticket_inventory()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- ============================================================
-- RPC: create_ticket_order(...)
-- ============================================================
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
  status TEXT
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

  SELECT * INTO v_event
  FROM public.events
  WHERE slug = p_event_slug AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento no encontrado o inactivo';
  END IF;

  FOR v_ticket IN
    SELECT id, ticket_code
    FROM public.tickets
    WHERE event_id = v_event.id
      AND status = 'available'
    ORDER BY ticket_code
    FOR UPDATE SKIP LOCKED
    LIMIT p_quantity
  LOOP
    UPDATE public.tickets
    SET
      status = 'reserved',
      buyer_name = trim(p_full_name),
      buyer_phone = trim(p_phone),
      buyer_email = nullif(lower(trim(p_email)), '')
    WHERE id = v_ticket.id;

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

-- ============================================================
-- RPC: sell_physical_ticket(...)
-- ============================================================
CREATE OR REPLACE FUNCTION public.sell_physical_ticket(
  p_ticket_code TEXT,
  p_buyer_name TEXT,
  p_buyer_phone TEXT,
  p_buyer_email TEXT,
  p_seller_id UUID,
  p_sale_location TEXT,
  p_payment_method TEXT,
  p_payment_reference TEXT DEFAULT NULL
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
  v_performed_by TEXT;
BEGIN
  IF NOT public.can_sell_tickets() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT * INTO v_ticket
  FROM public.tickets
  WHERE ticket_code = upper(trim(p_ticket_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Boleto inexistente';
  END IF;

  IF v_ticket.status IN ('sold', 'validated', 'cancelled') THEN
    RAISE EXCEPTION 'Boleto no disponible para venta';
  END IF;

  IF v_ticket.status NOT IN ('available', 'assigned', 'reserved') THEN
    RAISE EXCEPTION 'Estado de boleto no permitido para venta';
  END IF;

  SELECT * INTO v_seller FROM public.sellers WHERE id = p_seller_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendedor no encontrado';
  END IF;

  SELECT ticket_price INTO v_amount FROM public.events WHERE id = v_ticket.event_id;

  UPDATE public.tickets
  SET
    status = 'sold',
    buyer_name = trim(p_buyer_name),
    buyer_phone = trim(p_buyer_phone),
    buyer_email = nullif(lower(trim(p_buyer_email)), ''),
    seller_id = p_seller_id,
    seller_name = v_seller.name,
    sale_location = trim(p_sale_location),
    payment_method = trim(p_payment_method),
    payment_reference = nullif(trim(p_payment_reference), ''),
    sold_at = now()
  WHERE id = v_ticket.id
  RETURNING * INTO v_ticket;

  INSERT INTO public.sales (
    ticket_id, amount, payment_method, seller_id, seller_name, sales_point
  ) VALUES (
    v_ticket.id, v_amount, trim(p_payment_method), p_seller_id, v_seller.name, trim(p_sale_location)
  );

  SELECT coalesce(u.email, auth.uid()::TEXT, 'system') INTO v_performed_by
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1;

  INSERT INTO public.audit_logs (action, entity, entity_id, performed_by)
  VALUES ('ticket.sold', 'tickets', v_ticket.id, coalesce(v_performed_by, 'system'));

  RETURN v_ticket;
END;
$$;

-- ============================================================
-- RPC: validate_ticket(...)
-- ============================================================
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
    RETURN QUERY SELECT FALSE, 'No autorizado'::TEXT, NULL::UUID, upper(trim(p_ticket_code)), NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT * INTO v_ticket
  FROM public.tickets
  WHERE ticket_code = upper(trim(p_ticket_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Boleto inexistente'::TEXT, NULL::UUID, upper(trim(p_ticket_code)), NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_ticket.status = 'validated' THEN
    RETURN QUERY SELECT FALSE, 'Boleto ya validado'::TEXT, v_ticket.id, v_ticket.ticket_code, v_ticket.status, v_ticket.validated_at;
    RETURN;
  END IF;

  IF v_ticket.status = 'cancelled' THEN
    RETURN QUERY SELECT FALSE, 'Boleto anulado'::TEXT, v_ticket.id, v_ticket.ticket_code, v_ticket.status, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_ticket.status <> 'sold' THEN
    RETURN QUERY SELECT FALSE, 'Boleto no vendido'::TEXT, v_ticket.id, v_ticket.ticket_code, v_ticket.status, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  v_actor := nullif(trim(p_validated_by), '');

  UPDATE public.tickets
  SET status = 'validated', validated_at = now()
  WHERE id = v_ticket.id
  RETURNING * INTO v_ticket;

  INSERT INTO public.checkins (ticket_id, validated_by)
  VALUES (v_ticket.id, coalesce(v_actor, 'system'));

  INSERT INTO public.audit_logs (action, entity, entity_id, performed_by)
  VALUES ('ticket.validated', 'tickets', v_ticket.id, coalesce(v_actor, 'system'));

  RETURN QUERY SELECT TRUE, 'Ingreso validado'::TEXT, v_ticket.id, v_ticket.ticket_code, v_ticket.status, v_ticket.validated_at;
END;
$$;

-- Public QR lookup (no buyer data exposed).
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

-- ============================================================
-- Grants
-- ============================================================
GRANT EXECUTE ON FUNCTION public.create_ticket_order(TEXT, TEXT, TEXT, TEXT, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_ticket_status(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_initial_ticket_inventory() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sell_physical_ticket(TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_ticket(TEXT, TEXT) TO authenticated;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin bypass sellers" ON public.sellers;
DROP POLICY IF EXISTS "Super admin bypass ticket_batches" ON public.ticket_batches;
DROP POLICY IF EXISTS "Super admin bypass tickets" ON public.tickets;
DROP POLICY IF EXISTS "Super admin bypass sales" ON public.sales;
DROP POLICY IF EXISTS "Super admin bypass checkins" ON public.checkins;
DROP POLICY IF EXISTS "Super admin bypass audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Super admin bypass events" ON public.events;
DROP POLICY IF EXISTS "Super admin bypass users" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Authenticated can read roles" ON public.roles;
DROP POLICY IF EXISTS "Event manager manage sellers" ON public.sellers;
DROP POLICY IF EXISTS "Event manager manage batches" ON public.ticket_batches;
DROP POLICY IF EXISTS "Event manager manage tickets" ON public.tickets;
DROP POLICY IF EXISTS "Event manager manage sales" ON public.sales;
DROP POLICY IF EXISTS "Event manager manage checkins" ON public.checkins;
DROP POLICY IF EXISTS "Event manager select users" ON public.users;
DROP POLICY IF EXISTS "Event manager select audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Event manager manage events" ON public.events;
DROP POLICY IF EXISTS "Seller select sellers" ON public.sellers;
DROP POLICY IF EXISTS "Seller select batches" ON public.ticket_batches;
DROP POLICY IF EXISTS "Seller select tickets" ON public.tickets;
DROP POLICY IF EXISTS "Seller manage sales" ON public.sales;
DROP POLICY IF EXISTS "Seller insert audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Checkin operator select sellers" ON public.sellers;
DROP POLICY IF EXISTS "Checkin operator select tickets" ON public.tickets;
DROP POLICY IF EXISTS "Checkin operator manage checkins" ON public.checkins;
DROP POLICY IF EXISTS "Checkin operator insert audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Public read active events" ON public.events;
DROP POLICY IF EXISTS "Public read tickets" ON public.tickets;

CREATE POLICY "Super admin bypass sellers" ON public.sellers FOR ALL USING (public.get_auth_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass ticket_batches" ON public.ticket_batches FOR ALL USING (public.get_auth_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass tickets" ON public.tickets FOR ALL USING (public.get_auth_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass sales" ON public.sales FOR ALL USING (public.get_auth_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass checkins" ON public.checkins FOR ALL USING (public.get_auth_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass audit_logs" ON public.audit_logs FOR ALL USING (public.get_auth_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass events" ON public.events FOR ALL USING (public.get_auth_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass users" ON public.users FOR ALL USING (public.get_auth_user_role() = 'super_admin');

CREATE POLICY "Users can read own profile" ON public.users FOR SELECT USING (auth_user_id = auth.uid());
CREATE POLICY "Authenticated can read roles" ON public.roles FOR SELECT USING (true);

CREATE POLICY "Event manager manage sellers" ON public.sellers FOR ALL USING (public.get_auth_user_role() = 'event_manager');
CREATE POLICY "Event manager manage batches" ON public.ticket_batches FOR ALL USING (public.get_auth_user_role() = 'event_manager');
CREATE POLICY "Event manager manage tickets" ON public.tickets FOR ALL USING (public.get_auth_user_role() = 'event_manager');
CREATE POLICY "Event manager manage sales" ON public.sales FOR ALL USING (public.get_auth_user_role() = 'event_manager');
CREATE POLICY "Event manager manage checkins" ON public.checkins FOR ALL USING (public.get_auth_user_role() = 'event_manager');
CREATE POLICY "Event manager select users" ON public.users FOR SELECT USING (public.get_auth_user_role() = 'event_manager');
CREATE POLICY "Event manager select audit_logs" ON public.audit_logs FOR SELECT USING (public.get_auth_user_role() = 'event_manager');
CREATE POLICY "Event manager manage events" ON public.events FOR ALL USING (public.get_auth_user_role() = 'event_manager');

CREATE POLICY "Seller select sellers" ON public.sellers FOR SELECT USING (public.get_auth_user_role() = 'seller');
CREATE POLICY "Seller select batches" ON public.ticket_batches FOR SELECT USING (public.get_auth_user_role() = 'seller');
CREATE POLICY "Seller select tickets" ON public.tickets FOR SELECT USING (public.get_auth_user_role() = 'seller');
CREATE POLICY "Seller manage sales" ON public.sales FOR ALL USING (public.get_auth_user_role() = 'seller');
CREATE POLICY "Seller insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (public.get_auth_user_role() = 'seller');

CREATE POLICY "Checkin operator select sellers" ON public.sellers FOR SELECT USING (public.get_auth_user_role() = 'checkin_operator');
CREATE POLICY "Checkin operator select tickets" ON public.tickets FOR SELECT USING (public.get_auth_user_role() = 'checkin_operator');
CREATE POLICY "Checkin operator manage checkins" ON public.checkins FOR ALL USING (public.get_auth_user_role() = 'checkin_operator');
CREATE POLICY "Checkin operator insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (public.get_auth_user_role() = 'checkin_operator');

CREATE POLICY "Public read active events" ON public.events FOR SELECT USING (status = 'active');
CREATE POLICY "Public read tickets" ON public.tickets FOR SELECT USING (true);

-- ============================================================
-- Seed inventory + sellers
-- ============================================================
SELECT public.create_initial_ticket_inventory();

INSERT INTO public.sellers (name, phone, email, type, active)
SELECT 'María López', '+504 9999-0001', 'maria@farecoh.org', 'vendor', true
WHERE NOT EXISTS (SELECT 1 FROM public.sellers WHERE name = 'María López');

INSERT INTO public.sellers (name, phone, email, type, active)
SELECT 'Escuela Nacional de Música', '+504 2234-5678', 'ventas@enm.hn', 'physical_point', true
WHERE NOT EXISTS (SELECT 1 FROM public.sellers WHERE name = 'Escuela Nacional de Música');

NOTIFY pgrst, 'reload schema';
