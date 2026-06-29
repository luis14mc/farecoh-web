-- FARECOH Ticketing Platform - Unified Production Schema
-- Consolidated from schema.sql + schema-ticketing.sql + migration 20260624
-- Last updated: 2026-06-29

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE event_status AS ENUM ('draft', 'active', 'sold_out', 'completed', 'cancelled');
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'cancelled', 'refunded');
CREATE TYPE ticket_status AS ENUM ('pending', 'paid', 'validated', 'cancelled');

-- ============================================================
-- TABLE: events (online ticketing events)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Tegucigalpa',
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  ticket_price NUMERIC(10, 2) NOT NULL CHECK (ticket_price >= 0),
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  status event_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT events_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

-- ============================================================
-- TABLE: customers (online ticketing customers)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT customers_name_not_blank CHECK (length(trim(full_name)) >= 3),
  CONSTRAINT customers_phone_not_blank CHECK (length(trim(phone)) >= 8),
  CONSTRAINT customers_email_format CHECK (email IS NULL OR email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS customers_email_unique_idx ON public.customers (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS customers_phone_idx ON public.customers (phone);

-- ============================================================
-- TABLE: orders (online ticketing orders)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 10),
  payment_reference TEXT,
  payment_method TEXT,
  status order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_event_id_idx ON public.orders (event_id);
CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON public.orders (customer_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at DESC);

-- ============================================================
-- SEQUENCE: ticket_number_seq (for online tickets)
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS public.ticket_number_seq START 1;

CREATE OR REPLACE FUNCTION public.next_ticket_code()
RETURNS TEXT
LANGUAGE SQL
AS $$
  SELECT 'PF-' || lpad(nextval('public.ticket_number_seq')::TEXT, 6, '0');
$$;

-- ============================================================
-- TABLE: tickets (unified - supports both online and physical)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Online ticket fields
  event_id UUID REFERENCES public.events(id) ON DELETE RESTRICT,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT,
  -- Physical ticket fields
  batch_id UUID REFERENCES public.ticket_batches(id) ON DELETE SET NULL,
  event_slug TEXT NOT NULL DEFAULT 'pink-floyd',
  -- Core fields (shared)
  ticket_code TEXT UNIQUE NOT NULL DEFAULT public.next_ticket_code(),
  status TEXT NOT NULL DEFAULT 'available',
  qr_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  qr_url TEXT UNIQUE,
  -- Buyer info (physical tickets)
  buyer_name TEXT,
  buyer_phone TEXT,
  buyer_email TEXT,
  -- Seller info (physical tickets)
  seller_id UUID REFERENCES public.sellers(id),
  seller_name TEXT,
  sale_location TEXT,
  -- Payment info
  payment_method TEXT,
  payment_reference TEXT,
  payment_amount NUMERIC(10, 2),
  -- Dates
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sold_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  -- Notes
  notes TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Constraints
  CONSTRAINT tickets_code_format CHECK (ticket_code ~ '^PF-[0-9]{6}$'),
  CONSTRAINT tickets_status_check CHECK (status IN ('available', 'assigned', 'reserved', 'paid', 'sold', 'validated', 'cancelled', 'pending')),
  CONSTRAINT tickets_buyer_email_check CHECK (buyer_email IS NULL OR buyer_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  CONSTRAINT tickets_validated_has_time CHECK ((status = 'validated') = (validated_at IS NOT NULL)),
  CONSTRAINT tickets_paid_has_sale_data CHECK (
    status NOT IN ('paid', 'sold', 'validated') 
    OR (buyer_name IS NOT NULL AND buyer_phone IS NOT NULL AND sold_at IS NOT NULL AND seller_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS tickets_event_id_idx ON public.tickets (event_id);
CREATE INDEX IF NOT EXISTS tickets_order_id_idx ON public.tickets (order_id);
CREATE INDEX IF NOT EXISTS tickets_customer_id_idx ON public.tickets (customer_id);
CREATE INDEX IF NOT EXISTS tickets_status_idx ON public.tickets (status);
CREATE INDEX IF NOT EXISTS tickets_qr_token_idx ON public.tickets (qr_token);
CREATE INDEX IF NOT EXISTS tickets_ticket_code_idx ON public.tickets (ticket_code);
CREATE INDEX IF NOT EXISTS tickets_batch_id_idx ON public.tickets (batch_id);
CREATE INDEX IF NOT EXISTS tickets_event_slug_idx ON public.tickets (event_slug);
CREATE INDEX IF NOT EXISTS tickets_seller_id_idx ON public.tickets (seller_id);
CREATE INDEX IF NOT EXISTS tickets_seller_name_idx ON public.tickets (seller_name);
CREATE INDEX IF NOT EXISTS tickets_sale_location_idx ON public.tickets (sale_location);
CREATE INDEX IF NOT EXISTS tickets_sold_at_idx ON public.tickets (sold_at DESC);

-- ============================================================
-- TABLE: sellers (physical ticket sellers)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  type TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT sellers_type_check CHECK (type IN ('vendor', 'physical_point')),
  CONSTRAINT sellers_email_format CHECK (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

CREATE INDEX IF NOT EXISTS sellers_active_idx ON public.sellers(active);
CREATE INDEX IF NOT EXISTS sellers_type_idx ON public.sellers(type);

-- ============================================================
-- TABLE: ticket_batches (physical ticket batches)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ticket_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_code TEXT NOT NULL,
  end_code TEXT NOT NULL,
  total_tickets INTEGER NOT NULL,
  assigned_seller_id UUID NULL REFERENCES public.sellers(id),
  location TEXT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT ticket_batches_status_check CHECK (status IN ('active', 'closed', 'cancelled')),
  CONSTRAINT ticket_batches_codes_check CHECK (start_code ~ '^PF-[0-9]{6}$' AND end_code ~ '^PF-[0-9]{6}$'),
  CONSTRAINT ticket_batches_total_check CHECK (total_tickets > 0)
);

CREATE INDEX IF NOT EXISTS ticket_batches_status_idx ON public.ticket_batches(status);

-- ============================================================
-- TABLE: sales (financial records)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  payment_method TEXT NOT NULL,
  seller_name TEXT NOT NULL,
  sales_point TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS sales_created_at_idx ON public.sales(created_at);

-- ============================================================
-- TABLE: roles (RBAC role catalog)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default roles
INSERT INTO public.roles (name, description) VALUES
  ('super_admin', 'Super administrador con acceso total'),
  ('event_manager', 'Gestor de eventos y contenido'),
  ('seller', 'Vendedor físico de boletos'),
  ('checkin_operator', 'Operador de control de acceso')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- TABLE: users (RBAC users - replaces staff_profiles + admins)
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
-- TABLE: checkins
-- ============================================================
CREATE TABLE IF NOT EXISTS public.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  validated_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  validated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS checkins_ticket_id_idx ON public.checkins(ticket_id);

-- ============================================================
-- TABLE: audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at DESC);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Helper: get current user role
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Helper: check if current user is admin
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

-- RPC: Create online ticket order
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

-- RPC: Mark order as paid
CREATE OR REPLACE FUNCTION public.mark_order_paid(
  p_order_id UUID,
  p_payment_reference TEXT,
  p_payment_method TEXT,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.orders
  SET status = 'paid', payment_reference = p_payment_reference, payment_method = p_payment_method
  WHERE id = p_order_id;

  UPDATE public.tickets SET status = 'paid' WHERE order_id = p_order_id AND status = 'pending';

  INSERT INTO public.audit_logs (action, entity, entity_id, performed_by)
  VALUES ('sale.paid', 'orders', p_order_id::TEXT, COALESCE(p_user_id::TEXT, 'system'));
END;
$$;

-- RPC: Validate online ticket
CREATE OR REPLACE FUNCTION public.validate_ticket(
  p_ticket_code TEXT,
  p_checked_by UUID DEFAULT auth.uid(),
  p_device_info TEXT DEFAULT NULL
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
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_ticket
  FROM public.tickets
  WHERE ticket_code = upper(trim(p_ticket_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Boleto no encontrado', NULL::UUID, upper(trim(p_ticket_code)), NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_ticket.status = 'cancelled' THEN
    RETURN QUERY SELECT FALSE, 'Boleto cancelado', v_ticket.id, v_ticket.ticket_code, v_ticket.status, v_ticket.validated_at;
    RETURN;
  END IF;

  IF v_ticket.status = 'pending' THEN
    RETURN QUERY SELECT FALSE, 'Boleto pendiente de pago', v_ticket.id, v_ticket.ticket_code, v_ticket.status, v_ticket.validated_at;
    RETURN;
  END IF;

  IF v_ticket.status = 'validated' THEN
    RETURN QUERY SELECT FALSE, 'Boleto ya validado', v_ticket.id, v_ticket.ticket_code, v_ticket.status, v_ticket.validated_at;
    RETURN;
  END IF;

  UPDATE public.tickets
  SET status = 'validated', validated_at = now()
  WHERE id = v_ticket.id
  RETURNING * INTO v_ticket;

  INSERT INTO public.checkins (ticket_id, validated_by, validated_at)
  VALUES (v_ticket.id, p_checked_by, v_ticket.validated_at);

  INSERT INTO public.audit_logs (action, entity, entity_id, performed_by)
  VALUES ('ticket.validated', 'tickets', v_ticket.id::TEXT, COALESCE(p_checked_by::TEXT, 'system'));

  RETURN QUERY SELECT TRUE, 'Ingreso validado', v_ticket.id, v_ticket.ticket_code, v_ticket.status, v_ticket.validated_at;
END;
$$;

-- RPC: Assign ticket range to seller
CREATE OR REPLACE FUNCTION public.assign_ticket_range(
  p_start_code TEXT,
  p_end_code TEXT,
  p_seller_id UUID,
  p_location TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start INTEGER;
  v_end INTEGER;
  v_count INTEGER;
  v_seller public.sellers%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_seller FROM public.sellers WHERE id = p_seller_id AND active = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendedor no registrado o inactivo';
  END IF;

  v_start := substring(upper(trim(p_start_code)) FROM 4)::INTEGER;
  v_end := substring(upper(trim(p_end_code)) FROM 4)::INTEGER;

  IF v_start > v_end THEN
    RAISE EXCEPTION 'Invalid range';
  END IF;

  UPDATE public.tickets
  SET status = CASE WHEN status = 'available' THEN 'assigned' ELSE status END,
      seller_id = v_seller.id,
      seller_name = v_seller.name,
      sale_location = trim(p_location)
  WHERE substring(ticket_code FROM 4)::INTEGER BETWEEN v_start AND v_end
    AND status IN ('available', 'assigned');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- RPC: Sell physical ticket
CREATE OR REPLACE FUNCTION public.sell_physical_ticket(
  p_code TEXT,
  p_buyer_name TEXT,
  p_buyer_phone TEXT,
  p_buyer_email TEXT,
  p_seller_id UUID,
  p_sale_location TEXT,
  p_payment_method TEXT,
  p_payment_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS public.tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.tickets%ROWTYPE;
  v_seller public.sellers%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_seller FROM public.sellers WHERE id = p_seller_id AND active = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendedor no registrado o inactivo';
  END IF;

  SELECT * INTO v_ticket FROM public.tickets WHERE ticket_code = upper(trim(p_code)) FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Boleto inexistente';
  END IF;

  IF v_ticket.status IN ('cancelled', 'validated') THEN
    RAISE EXCEPTION 'Este boleto no puede venderse';
  END IF;

  IF v_ticket.status IN ('paid', 'sold') THEN
    RAISE EXCEPTION 'Este boleto ya esta vendido/pagado';
  END IF;

  UPDATE public.tickets
  SET status = 'paid',
      buyer_name = trim(p_buyer_name),
      buyer_phone = trim(p_buyer_phone),
      buyer_email = nullif(lower(trim(p_buyer_email)), ''),
      seller_id = v_seller.id,
      seller_name = v_seller.name,
      sale_location = trim(p_sale_location),
      payment_method = trim(p_payment_method),
      payment_reference = nullif(trim(p_payment_reference), ''),
      notes = nullif(trim(p_notes), ''),
      sold_at = now()
  WHERE id = v_ticket.id
  RETURNING * INTO v_ticket;

  RETURN v_ticket;
END;
$$;

-- RPC: Validate physical ticket
CREATE OR REPLACE FUNCTION public.validate_physical_ticket(p_code TEXT)
RETURNS public.tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.tickets%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_ticket FROM public.tickets WHERE ticket_code = upper(trim(p_code)) FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Boleto inexistente';
  END IF;

  IF v_ticket.status = 'validated' THEN
    RAISE EXCEPTION 'Boleto ya utilizado';
  END IF;

  IF v_ticket.status = 'cancelled' THEN
    RAISE EXCEPTION 'Boleto anulado';
  END IF;

  IF v_ticket.status NOT IN ('paid', 'sold') THEN
    RAISE EXCEPTION 'Boleto no pagado';
  END IF;

  UPDATE public.tickets
  SET status = 'validated', validated_at = now()
  WHERE id = v_ticket.id
  RETURNING * INTO v_ticket;

  RETURN v_ticket;
END;
$$;

-- RPC: Get public ticket status (for QR verification)
CREATE OR REPLACE FUNCTION public.get_public_ticket_status(p_qr_token TEXT)
RETURNS TABLE (
  ticket_code TEXT,
  status TEXT,
  event_slug TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.ticket_code, t.status, t.event_slug
  FROM public.tickets t
  WHERE t.qr_token = p_qr_token
  LIMIT 1;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Super Admin has full control
CREATE POLICY "Super admin bypass sellers" ON public.sellers FOR ALL USING (public.get_auth_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass ticket_batches" ON public.ticket_batches FOR ALL USING (public.get_auth_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass tickets" ON public.tickets FOR ALL USING (public.get_auth_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass sales" ON public.sales FOR ALL USING (public.get_auth_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass checkins" ON public.checkins FOR ALL USING (public.get_auth_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass audit_logs" ON public.audit_logs FOR ALL USING (public.get_auth_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass events" ON public.events FOR ALL USING (public.get_auth_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass customers" ON public.customers FOR ALL USING (public.get_auth_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass orders" ON public.orders FOR ALL USING (public.get_auth_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass users" ON public.users FOR ALL USING (public.get_auth_user_role() = 'super_admin');

-- Users can read own profile
CREATE POLICY "Users can read own profile" ON public.users FOR SELECT USING (auth_user_id = auth.uid());

-- Roles are readable by all authenticated users
CREATE POLICY "Authenticated can read roles" ON public.roles FOR SELECT USING (TRUE);

-- Event manager access
CREATE POLICY "Event manager manage sellers" ON public.sellers FOR ALL USING (public.get_auth_user_role() = 'event_manager');
CREATE POLICY "Event manager manage batches" ON public.ticket_batches FOR ALL USING (public.get_auth_user_role() = 'event_manager');
CREATE POLICY "Event manager manage tickets" ON public.tickets FOR ALL USING (public.get_auth_user_role() = 'event_manager');
CREATE POLICY "Event manager manage sales" ON public.sales FOR ALL USING (public.get_auth_user_role() = 'event_manager');
CREATE POLICY "Event manager manage checkins" ON public.checkins FOR ALL USING (public.get_auth_user_role() = 'event_manager');
CREATE POLICY "Event manager select users" ON public.users FOR SELECT USING (public.get_auth_user_role() = 'event_manager');
CREATE POLICY "Event manager select audit_logs" ON public.audit_logs FOR SELECT USING (public.get_auth_user_role() = 'event_manager');
CREATE POLICY "Event manager manage events" ON public.events FOR ALL USING (public.get_auth_user_role() = 'event_manager');
CREATE POLICY "Event manager manage customers" ON public.customers FOR ALL USING (public.get_auth_user_role() = 'event_manager');
CREATE POLICY "Event manager manage orders" ON public.orders FOR ALL USING (public.get_auth_user_role() = 'event_manager');

-- Seller access
CREATE POLICY "Seller select sellers" ON public.sellers FOR SELECT USING (public.get_auth_user_role() = 'seller');
CREATE POLICY "Seller select batches" ON public.ticket_batches FOR SELECT USING (public.get_auth_user_role() = 'seller');
CREATE POLICY "Seller select tickets" ON public.tickets FOR SELECT USING (public.get_auth_user_role() = 'seller');
CREATE POLICY "Seller update tickets" ON public.tickets FOR UPDATE USING (public.get_auth_user_role() = 'seller');
CREATE POLICY "Seller manage sales" ON public.sales FOR ALL USING (public.get_auth_user_role() = 'seller');
CREATE POLICY "Seller insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (public.get_auth_user_role() = 'seller');

-- Checkin operator access
CREATE POLICY "Checkin operator select sellers" ON public.sellers FOR SELECT USING (public.get_auth_user_role() = 'checkin_operator');
CREATE POLICY "Checkin operator select tickets" ON public.tickets FOR SELECT USING (public.get_auth_user_role() = 'checkin_operator');
CREATE POLICY "Checkin operator update tickets" ON public.tickets FOR UPDATE USING (public.get_auth_user_role() = 'checkin_operator');
CREATE POLICY "Checkin operator manage checkins" ON public.checkins FOR ALL USING (public.get_auth_user_role() = 'checkin_operator');
CREATE POLICY "Checkin operator insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (public.get_auth_user_role() = 'checkin_operator');

-- Public access (anonymous users)
CREATE POLICY "Public read active events" ON public.events FOR SELECT USING (status = 'active');
CREATE POLICY "Public read tickets" ON public.tickets FOR SELECT USING (TRUE);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER events_set_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tickets_set_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- SEED DATA
-- ============================================================

-- Generate initial physical inventory (PF-000001 to PF-000500)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.tickets WHERE ticket_code = 'PF-000001') THEN
        FOR i IN 1..500 LOOP
            INSERT INTO public.tickets (ticket_code, status)
            VALUES ('PF-' || lpad(i::TEXT, 6, '0'), 'available');
        END LOOP;
    END IF;
END $$;

-- Generate initial sellers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.sellers WHERE name = 'María López') THEN
        INSERT INTO public.sellers (name, phone, email, type, active)
        VALUES ('María López', '+504 9999-0001', 'maria@farecoh.org', 'vendor', TRUE);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.sellers WHERE name = 'Escuela Nacional de Música') THEN
        INSERT INTO public.sellers (name, phone, email, type, active)
        VALUES ('Escuela Nacional de Música', '+504 2234-5678', 'ventas@enm.hn', 'physical_point', TRUE);
    END IF;
END $$;
