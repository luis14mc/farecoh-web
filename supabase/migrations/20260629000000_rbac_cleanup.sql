-- FARECOH RBAC Migration - Clean Users + Roles Schema
-- Replaces: staff_profiles, admins, admin_role enum
-- New: roles, users
-- Created: 2026-06-29

-- ============================================================
-- STEP 1: Create new tables
-- ============================================================

-- Roles catalog
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

-- Users table (replaces staff_profiles + admins)
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
-- STEP 2: Migrate data from staff_profiles
-- ============================================================

DO $$
DECLARE
  sp RECORD;
  role_uuid UUID;
BEGIN
  FOR sp IN SELECT * FROM public.staff_profiles LOOP
    -- Get role UUID
    SELECT id INTO role_uuid FROM public.roles WHERE name = sp.role;
    
    IF role_uuid IS NOT NULL THEN
      INSERT INTO public.users (auth_user_id, email, full_name, role_id, active, created_at)
      VALUES (sp.user_id, sp.email, sp.full_name, role_uuid, sp.active, sp.created_at)
      ON CONFLICT (auth_user_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- STEP 3: Migrate data from admins (legacy)
-- ============================================================

DO $$
DECLARE
  ad RECORD;
  role_uuid UUID;
BEGIN
  FOR ad IN SELECT * FROM public.admins LOOP
    -- Get role UUID
    SELECT id INTO role_uuid FROM public.roles WHERE name = ad.role::TEXT;
    
    IF role_uuid IS NOT NULL THEN
      INSERT INTO public.users (auth_user_id, email, full_name, role_id, active, created_at)
      VALUES (ad.id, ad.email, ad.name, role_uuid, true, ad.created_at)
      ON CONFLICT (auth_user_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- STEP 4: Update RLS policies to use new users table
-- ============================================================

-- Drop old policies
DROP POLICY IF EXISTS "Super admin bypass sellers" ON public.sellers;
DROP POLICY IF EXISTS "Super admin bypass staff_profiles" ON public.staff_profiles;
DROP POLICY IF EXISTS "Super admin bypass ticket_batches" ON public.ticket_batches;
DROP POLICY IF EXISTS "Super admin bypass tickets" ON public.tickets;
DROP POLICY IF EXISTS "Super admin bypass sales" ON public.sales;
DROP POLICY IF EXISTS "Super admin bypass checkins" ON public.checkins;
DROP POLICY IF EXISTS "Super admin bypass audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Super admin bypass events" ON public.events;
DROP POLICY IF EXISTS "Super admin bypass customers" ON public.customers;
DROP POLICY IF EXISTS "Super admin bypass orders" ON public.orders;
DROP POLICY IF EXISTS "Super admin bypass admins" ON public.admins;
DROP POLICY IF EXISTS "Select own staff profile" ON public.staff_profiles;
DROP POLICY IF EXISTS "Event manager manage sellers" ON public.sellers;
DROP POLICY IF EXISTS "Event manager manage batches" ON public.ticket_batches;
DROP POLICY IF EXISTS "Event manager manage tickets" ON public.tickets;
DROP POLICY IF EXISTS "Event manager manage sales" ON public.sales;
DROP POLICY IF EXISTS "Event manager manage checkins" ON public.checkins;
DROP POLICY IF EXISTS "Event manager select staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "Event manager select audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Event manager manage events" ON public.events;
DROP POLICY IF EXISTS "Event manager manage customers" ON public.customers;
DROP POLICY IF EXISTS "Event manager manage orders" ON public.orders;
DROP POLICY IF EXISTS "Seller select sellers" ON public.sellers;
DROP POLICY IF EXISTS "Seller select batches" ON public.ticket_batches;
DROP POLICY IF EXISTS "Seller select tickets" ON public.tickets;
DROP POLICY IF EXISTS "Seller update tickets" ON public.tickets;
DROP POLICY IF EXISTS "Seller manage sales" ON public.sales;
DROP POLICY IF EXISTS "Seller insert audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Checkin operator select sellers" ON public.sellers;
DROP POLICY IF EXISTS "Checkin operator select tickets" ON public.tickets;
DROP POLICY IF EXISTS "Checkin operator update tickets" ON public.tickets;
DROP POLICY IF EXISTS "Checkin operator manage checkins" ON public.checkins;
DROP POLICY IF EXISTS "Checkin operator insert audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can read admins" ON public.admins;
DROP POLICY IF EXISTS "Admins can manage checkins" ON public.checkins;
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;

-- Drop old function
DROP FUNCTION IF EXISTS public.get_auth_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- ============================================================
-- STEP 5: Create new helper functions
-- ============================================================

-- Get current user's role name
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
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

-- Check if current user is admin (any active role)
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

-- ============================================================
-- STEP 6: Create new RLS policies
-- ============================================================

-- Helper: get current user role (used in policies)
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.get_user_role();
END;
$$;

-- Super Admin policies (using role name)
CREATE POLICY "Super admin bypass sellers" ON public.sellers FOR ALL USING (public.get_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass ticket_batches" ON public.ticket_batches FOR ALL USING (public.get_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass tickets" ON public.tickets FOR ALL USING (public.get_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass sales" ON public.sales FOR ALL USING (public.get_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass checkins" ON public.checkins FOR ALL USING (public.get_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass audit_logs" ON public.audit_logs FOR ALL USING (public.get_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass events" ON public.events FOR ALL USING (public.get_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass customers" ON public.customers FOR ALL USING (public.get_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass orders" ON public.orders FOR ALL USING (public.get_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass users" ON public.users FOR ALL USING (public.get_user_role() = 'super_admin');

-- Users can read own profile
CREATE POLICY "Users can read own profile" ON public.users FOR SELECT USING (auth_user_id = auth.uid());

-- Event manager policies
CREATE POLICY "Event manager manage sellers" ON public.sellers FOR ALL USING (public.get_user_role() = 'event_manager');
CREATE POLICY "Event manager manage batches" ON public.ticket_batches FOR ALL USING (public.get_user_role() = 'event_manager');
CREATE POLICY "Event manager manage tickets" ON public.tickets FOR ALL USING (public.get_user_role() = 'event_manager');
CREATE POLICY "Event manager manage sales" ON public.sales FOR ALL USING (public.get_user_role() = 'event_manager');
CREATE POLICY "Event manager manage checkins" ON public.checkins FOR ALL USING (public.get_user_role() = 'event_manager');
CREATE POLICY "Event manager select users" ON public.users FOR SELECT USING (public.get_user_role() = 'event_manager');
CREATE POLICY "Event manager select audit_logs" ON public.audit_logs FOR SELECT USING (public.get_user_role() = 'event_manager');
CREATE POLICY "Event manager manage events" ON public.events FOR ALL USING (public.get_user_role() = 'event_manager');
CREATE POLICY "Event manager manage customers" ON public.customers FOR ALL USING (public.get_user_role() = 'event_manager');
CREATE POLICY "Event manager manage orders" ON public.orders FOR ALL USING (public.get_user_role() = 'event_manager');

-- Seller policies
CREATE POLICY "Seller select sellers" ON public.sellers FOR SELECT USING (public.get_user_role() = 'seller');
CREATE POLICY "Seller select batches" ON public.ticket_batches FOR SELECT USING (public.get_user_role() = 'seller');
CREATE POLICY "Seller select tickets" ON public.tickets FOR SELECT USING (public.get_user_role() = 'seller');
CREATE POLICY "Seller update tickets" ON public.tickets FOR UPDATE USING (public.get_user_role() = 'seller');
CREATE POLICY "Seller manage sales" ON public.sales FOR ALL USING (public.get_user_role() = 'seller');
CREATE POLICY "Seller insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (public.get_user_role() = 'seller');

-- Checkin operator policies
CREATE POLICY "Checkin operator select sellers" ON public.sellers FOR SELECT USING (public.get_user_role() = 'checkin_operator');
CREATE POLICY "Checkin operator select tickets" ON public.tickets FOR SELECT USING (public.get_user_role() = 'checkin_operator');
CREATE POLICY "Checkin operator update tickets" ON public.tickets FOR UPDATE USING (public.get_user_role() = 'checkin_operator');
CREATE POLICY "Checkin operator manage checkins" ON public.checkins FOR ALL USING (public.get_user_role() = 'checkin_operator');
CREATE POLICY "Checkin operator insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (public.get_user_role() = 'checkin_operator');

-- Public policies
CREATE POLICY "Public read active events" ON public.events FOR SELECT USING (status = 'active');
CREATE POLICY "Public read tickets" ON public.tickets FOR SELECT USING (TRUE);

-- Legacy admins table policies (kept for compatibility)
CREATE POLICY "Admins can read admins" ON public.admins FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can manage checkins" ON public.checkins FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can read audit logs" ON public.audit_logs FOR SELECT USING (public.is_admin());

-- ============================================================
-- STEP 7: Add triggers for updated_at
-- ============================================================

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- STEP 8: Enable RLS on new table
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Roles are readable by all authenticated users
CREATE POLICY "Authenticated can read roles" ON public.roles FOR SELECT USING (TRUE);

-- ============================================================
-- NOTE: Do NOT drop staff_profiles or admins yet
-- Keep them for backward compatibility during transition
-- They can be dropped in a future migration after all code is updated
-- ============================================================
