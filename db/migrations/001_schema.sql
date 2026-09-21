-- FARECOH Ticketing Core Schema — pure Postgres
-- No Supabase dependencies (no auth.users, no RLS, no SECURITY DEFINER).
-- Authorization is enforced by the application layer using role checks.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. roles
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO roles (name, description) VALUES
  ('super_admin', 'Super administrador con acceso total'),
  ('event_manager', 'Gestor de eventos y contenido'),
  ('seller', 'Vendedor físico de boletos'),
  ('checkin_operator', 'Operador de control de acceso')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 2. users (own auth — password_hash + bcrypt)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role_id UUID NOT NULL REFERENCES roles(id),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_role_id_idx ON users(role_id);
CREATE INDEX IF NOT EXISTS users_active_idx ON users(active);

-- ============================================================
-- 3. sessions (cookie-based auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf_token TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

-- ============================================================
-- 4. events
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
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

INSERT INTO events (
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
-- 5. sellers
-- ============================================================
CREATE TABLE IF NOT EXISTS sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  type TEXT NOT NULL CHECK (type IN ('vendor', 'physical_point')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sellers_active_idx ON sellers(active);
CREATE INDEX IF NOT EXISTS sellers_type_idx ON sellers(type);

-- ============================================================
-- 6. ticket_batches
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  start_code TEXT NOT NULL,
  end_code TEXT NOT NULL,
  total_tickets INTEGER NOT NULL CHECK (total_tickets > 0),
  assigned_seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ticket_batches_status_check CHECK (status IN ('active', 'closed', 'cancelled')),
  CONSTRAINT ticket_batches_codes_check CHECK (
    start_code ~ '^PF-[0-9]{6}$' AND end_code ~ '^PF-[0-9]{6}$'
  )
);

CREATE INDEX IF NOT EXISTS ticket_batches_event_id_idx ON ticket_batches(event_id);
CREATE INDEX IF NOT EXISTS ticket_batches_status_idx ON ticket_batches(status);

-- ============================================================
-- 7. tickets
-- ============================================================
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  batch_id UUID REFERENCES ticket_batches(id) ON DELETE SET NULL,
  ticket_code TEXT NOT NULL UNIQUE,
  qr_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'available',
  buyer_name TEXT,
  buyer_phone TEXT,
  buyer_email TEXT,
  seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
  seller_name TEXT,
  sale_location TEXT,
  payment_method TEXT,
  payment_reference TEXT,
  reserved_at TIMESTAMPTZ,
  sold_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tickets_code_format CHECK (ticket_code ~ '^PF-[0-9]{6}$'),
  CONSTRAINT tickets_status_check CHECK (
    status IN ('available', 'assigned', 'reserved', 'sold', 'validated', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS tickets_event_id_idx ON tickets(event_id);
CREATE INDEX IF NOT EXISTS tickets_batch_id_idx ON tickets(batch_id);
CREATE INDEX IF NOT EXISTS tickets_status_idx ON tickets(status);
CREATE INDEX IF NOT EXISTS tickets_ticket_code_idx ON tickets(ticket_code);
CREATE INDEX IF NOT EXISTS tickets_qr_token_idx ON tickets(qr_token);
CREATE INDEX IF NOT EXISTS tickets_seller_id_idx ON tickets(seller_id);
CREATE INDEX IF NOT EXISTS tickets_sold_at_idx ON tickets(sold_at DESC);

-- ============================================================
-- 8. sales
-- ============================================================
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  payment_method TEXT NOT NULL,
  seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
  seller_name TEXT NOT NULL,
  sales_point TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sales_ticket_id_idx ON sales(ticket_id);
CREATE INDEX IF NOT EXISTS sales_seller_id_idx ON sales(seller_id);
CREATE INDEX IF NOT EXISTS sales_created_at_idx ON sales(created_at DESC);

-- ============================================================
-- 9. checkins
-- ============================================================
CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
  validated_by TEXT NOT NULL,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS checkins_ticket_id_idx ON checkins(ticket_id);
CREATE INDEX IF NOT EXISTS checkins_validated_at_idx ON checkins(validated_at DESC);

-- ============================================================
-- 10. audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  performed_by TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity);

-- ============================================================
-- Helpers — role lookups via user_id (caller passes it explicitly)
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT r.name INTO v_role
  FROM users u
  JOIN roles r ON r.id = u.role_id
  WHERE u.id = p_user_id AND u.active = true;
  RETURN v_role;
END;
$$;

CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND active = true);
$$;

CREATE OR REPLACE FUNCTION can_sell_tickets(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT get_user_role(p_user_id) IN ('super_admin', 'event_manager', 'seller');
$$;

CREATE OR REPLACE FUNCTION can_validate_tickets(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT get_user_role(p_user_id) IN ('super_admin', 'event_manager', 'checkin_operator');
$$;

-- ============================================================
-- Ticket ops
-- ============================================================
CREATE OR REPLACE FUNCTION create_initial_ticket_inventory()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_event_id UUID;
  v_inserted INTEGER := 0;
  v_code TEXT;
  i INTEGER;
BEGIN
  SELECT id INTO v_event_id FROM events WHERE slug = 'pink-floyd' LIMIT 1;
  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Event pink-floyd not found';
  END IF;

  FOR i IN 1..500 LOOP
    v_code := 'PF-' || lpad(i::TEXT, 6, '0');
    INSERT INTO tickets (event_id, ticket_code, status)
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
-- Reservation — called by the public form
-- ============================================================
CREATE OR REPLACE FUNCTION create_ticket_order(
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
AS $$
DECLARE
  v_event events%ROWTYPE;
  v_order_id UUID := gen_random_uuid();
  v_codes TEXT[] := '{}';
  v_ticket RECORD;
  v_reserved INTEGER := 0;
BEGIN
  IF p_quantity < 1 OR p_quantity > 10 THEN
    RAISE EXCEPTION 'La cantidad debe estar entre 1 y 10';
  END IF;

  SELECT e.* INTO v_event
  FROM events e
  WHERE e.slug = p_event_slug AND e.status = 'active'
  FOR UPDATE OF e;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento no encontrado o inactivo';
  END IF;

  FOR v_ticket IN
    SELECT t.id, t.ticket_code
    FROM tickets t
    WHERE t.event_id = v_event.id
      AND t.status = 'available'
      AND (t.batch_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM ticket_batches tb
        WHERE tb.id = t.batch_id AND tb.assigned_seller_id IS NOT NULL
      ))
    ORDER BY t.ticket_code
    FOR UPDATE OF t SKIP LOCKED
    LIMIT p_quantity
  LOOP
    UPDATE tickets t
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

  INSERT INTO audit_logs (action, entity, entity_id, performed_by)
  VALUES ('ticket.reserved', 'reservation', v_order_id, 'public');

  RETURN QUERY
  SELECT v_order_id, v_codes, v_event.ticket_price * p_quantity, 'reserved'::TEXT;
END;
$$;

-- ============================================================
-- Physical sale — requires a staff user_id
-- ============================================================
CREATE OR REPLACE FUNCTION sell_physical_ticket(
  p_user_id UUID,
  p_ticket_code TEXT,
  p_buyer_name TEXT,
  p_buyer_phone TEXT,
  p_buyer_email TEXT,
  p_seller_id UUID,
  p_sale_location TEXT,
  p_payment_method TEXT,
  p_payment_reference TEXT DEFAULT NULL
)
RETURNS tickets
LANGUAGE plpgsql
AS $$
DECLARE
  v_ticket tickets%ROWTYPE;
  v_seller sellers%ROWTYPE;
  v_amount NUMERIC(10, 2);
  v_performed_by TEXT;
BEGIN
  IF NOT can_sell_tickets(p_user_id) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT * INTO v_ticket
  FROM tickets
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

  SELECT * INTO v_seller FROM sellers WHERE id = p_seller_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendedor no encontrado';
  END IF;

  SELECT ticket_price INTO v_amount FROM events WHERE id = v_ticket.event_id;

  UPDATE tickets
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

  INSERT INTO sales (ticket_id, amount, payment_method, seller_id, seller_name, sales_point)
  VALUES (v_ticket.id, v_amount, trim(p_payment_method), p_seller_id, v_seller.name, trim(p_sale_location));

  SELECT email INTO v_performed_by FROM users WHERE id = p_user_id LIMIT 1;

  INSERT INTO audit_logs (action, entity, entity_id, performed_by)
  VALUES ('ticket.sold', 'tickets', v_ticket.id, coalesce(v_performed_by, 'system'));

  RETURN v_ticket;
END;
$$;

-- ============================================================
-- Check-in — requires a staff user_id
-- ============================================================
CREATE OR REPLACE FUNCTION validate_ticket(
  p_user_id UUID,
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
AS $$
DECLARE
  v_ticket tickets%ROWTYPE;
  v_actor TEXT;
BEGIN
  IF NOT can_validate_tickets(p_user_id) THEN
    RETURN QUERY SELECT FALSE, 'No autorizado'::TEXT, NULL::UUID, upper(trim(p_ticket_code)), NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT * INTO v_ticket
  FROM tickets
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

  UPDATE tickets
  SET status = 'validated', validated_at = now()
  WHERE id = v_ticket.id
  RETURNING * INTO v_ticket;

  INSERT INTO checkins (ticket_id, validated_by)
  VALUES (v_ticket.id, coalesce(v_actor, 'system'));

  INSERT INTO audit_logs (action, entity, entity_id, performed_by)
  VALUES ('ticket.validated', 'tickets', v_ticket.id, coalesce(v_actor, 'system'));

  RETURN QUERY SELECT TRUE, 'Ingreso validado'::TEXT, v_ticket.id, v_ticket.ticket_code, v_ticket.status, v_ticket.validated_at;
END;
$$;

-- ============================================================
-- Public QR lookup (no buyer data exposed)
-- ============================================================
CREATE OR REPLACE FUNCTION get_public_ticket_status(p_qr_token TEXT)
RETURNS TABLE (ticket_code TEXT, status TEXT, event_slug TEXT)
LANGUAGE SQL
STABLE
AS $$
  SELECT t.ticket_code, t.status, e.slug
  FROM tickets t
  JOIN events e ON e.id = t.event_id
  WHERE t.qr_token::TEXT = trim(p_qr_token)
  LIMIT 1;
$$;

-- ============================================================
-- Reservation cancel
-- ============================================================
CREATE OR REPLACE FUNCTION cancel_ticket_reservation(
  p_user_id UUID,
  p_ticket_code TEXT,
  p_reason TEXT
)
RETURNS tickets
LANGUAGE plpgsql
AS $$
DECLARE
  v_ticket tickets%ROWTYPE;
  v_performed_by TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF NOT (get_user_role(p_user_id) IN ('super_admin', 'event_manager')) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT * INTO v_ticket
  FROM tickets
  WHERE ticket_code = upper(trim(p_ticket_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Boleto inexistente';
  END IF;

  IF v_ticket.status NOT IN ('reserved', 'assigned') THEN
    RAISE EXCEPTION 'Solo se pueden cancelar reservas activas';
  END IF;

  UPDATE tickets
  SET
    status = 'cancelled',
    buyer_name = NULL,
    buyer_phone = NULL,
    buyer_email = NULL,
    reserved_at = NULL
  WHERE id = v_ticket.id
  RETURNING * INTO v_ticket;

  SELECT email INTO v_performed_by FROM users WHERE id = p_user_id LIMIT 1;

  INSERT INTO audit_logs (action, entity, entity_id, performed_by, metadata)
  VALUES ('ticket.reservation_cancelled', 'tickets', v_ticket.id, coalesce(v_performed_by, 'system'),
          jsonb_build_object('reason', trim(p_reason)));

  RETURN v_ticket;
END;
$$;

-- ============================================================
-- Staff reservation (assigns ticket on behalf of a buyer)
-- ============================================================
CREATE OR REPLACE FUNCTION staff_reserve_ticket(
  p_user_id UUID,
  p_event_slug TEXT,
  p_ticket_code TEXT,
  p_full_name TEXT,
  p_phone TEXT,
  p_email TEXT
)
RETURNS tickets
LANGUAGE plpgsql
AS $$
DECLARE
  v_ticket tickets%ROWTYPE;
  v_event events%ROWTYPE;
  v_performed_by TEXT;
BEGIN
  IF NOT (get_user_role(p_user_id) IN ('super_admin', 'event_manager', 'seller')) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT e.* INTO v_event FROM events e WHERE e.slug = p_event_slug AND e.status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento no encontrado o inactivo';
  END IF;

  SELECT * INTO v_ticket
  FROM tickets
  WHERE ticket_code = upper(trim(p_ticket_code)) AND event_id = v_event.id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Boleto inexistente para este evento';
  END IF;

  IF v_ticket.status NOT IN ('available', 'assigned') THEN
    RAISE EXCEPTION 'Boleto no disponible para reservar';
  END IF;

  UPDATE tickets
  SET
    status = 'reserved',
    buyer_name = trim(p_full_name),
    buyer_phone = trim(p_phone),
    buyer_email = nullif(lower(trim(p_email)), ''),
    reserved_at = now()
  WHERE id = v_ticket.id
  RETURNING * INTO v_ticket;

  SELECT email INTO v_performed_by FROM users WHERE id = p_user_id LIMIT 1;

  INSERT INTO audit_logs (action, entity, entity_id, performed_by)
  VALUES ('ticket.staff_reserved', 'tickets', v_ticket.id, coalesce(v_performed_by, 'system'));

  RETURN v_ticket;
END;
$$;

-- ============================================================
-- Band & musician assignments
-- ============================================================
CREATE TABLE IF NOT EXISTS bands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'support',
  notes TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, slug)
);

CREATE INDEX IF NOT EXISTS bands_event_id_idx ON bands(event_id);

CREATE TABLE IF NOT EXISTS musicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  instrument TEXT,
  email TEXT,
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS musicians_active_idx ON musicians(active);

CREATE TABLE IF NOT EXISTS band_musicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  musician_id UUID NOT NULL REFERENCES musicians(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (band_id, musician_id)
);

CREATE INDEX IF NOT EXISTS band_musicians_band_id_idx ON band_musicians(band_id);
CREATE INDEX IF NOT EXISTS band_musicians_musician_id_idx ON band_musicians(musician_id);

-- ============================================================
-- Ticket layout configs
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_layout_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  layout_key TEXT NOT NULL DEFAULT 'default',
  width_mm NUMERIC(6, 2) NOT NULL,
  height_mm NUMERIC(6, 2) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, layout_key)
);

CREATE INDEX IF NOT EXISTS ticket_layout_configs_event_id_idx ON ticket_layout_configs(event_id);
CREATE INDEX IF NOT EXISTS ticket_layout_configs_active_idx ON ticket_layout_configs(active);

-- ============================================================
-- Reservation notifications audit
-- ============================================================
CREATE TABLE IF NOT EXISTS reservation_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  recipient TEXT NOT NULL,
  channel TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reservation_notifications_ticket_id_idx ON reservation_notifications(ticket_id);
CREATE INDEX IF NOT EXISTS reservation_notifications_created_at_idx ON reservation_notifications(created_at DESC);

-- ============================================================
-- Seed
-- ============================================================
SELECT create_initial_ticket_inventory();

INSERT INTO sellers (name, phone, email, type, active)
SELECT 'María López', '+504 9999-0001', 'maria@farecoh.org', 'vendor', true
WHERE NOT EXISTS (SELECT 1 FROM sellers WHERE name = 'María López');

INSERT INTO sellers (name, phone, email, type, active)
SELECT 'Escuela Nacional de Música', '+504 2234-5678', 'ventas@enm.hn', 'physical_point', true
WHERE NOT EXISTS (SELECT 1 FROM sellers WHERE name = 'Escuela Nacional de Música');
