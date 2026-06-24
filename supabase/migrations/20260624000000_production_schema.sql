-- FARECOH Ticketing Platform Production Schema Migration
-- Created at: 2026-06-24

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 0. TABLE: sellers
CREATE TABLE IF NOT EXISTS public.sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    type TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT sellers_type_check CHECK (type IN ('vendor', 'physical_point')),
    CONSTRAINT sellers_email_format CHECK (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

CREATE INDEX IF NOT EXISTS sellers_active_idx ON public.sellers(active);
CREATE INDEX IF NOT EXISTS sellers_type_idx ON public.sellers(type);

-- 1. TABLE: staff_profiles
CREATE TABLE IF NOT EXISTS public.staff_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT staff_profiles_role_check CHECK (role IN ('super_admin', 'event_manager', 'seller', 'checkin_operator')),
    CONSTRAINT staff_profiles_email_format CHECK (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

CREATE INDEX IF NOT EXISTS staff_profiles_user_id_idx ON public.staff_profiles(user_id);
CREATE INDEX IF NOT EXISTS staff_profiles_role_idx ON public.staff_profiles(role);
CREATE INDEX IF NOT EXISTS staff_profiles_active_idx ON public.staff_profiles(active);

-- 2. TABLE: ticket_batches
CREATE TABLE IF NOT EXISTS public.ticket_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    start_code TEXT NOT NULL,
    end_code TEXT NOT NULL,
    assigned_to TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT ticket_batches_codes_check CHECK (start_code ~ '^PF-[0-9]{6}$' AND end_code ~ '^PF-[0-9]{6}$')
);

-- 3. TABLE: tickets
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_code TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'available',
    batch_id UUID REFERENCES public.ticket_batches(id) ON DELETE SET NULL,
    buyer_name TEXT,
    buyer_phone TEXT,
    buyer_email TEXT,
    seller_name TEXT,
    sales_point TEXT,
    payment_method TEXT,
    sold_at TIMESTAMP WITH TIME ZONE,
    validated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT tickets_status_check CHECK (status IN ('available', 'assigned', 'sold', 'validated', 'cancelled')),
    CONSTRAINT tickets_code_check CHECK (ticket_code ~ '^PF-[0-9]{6}$'),
    CONSTRAINT tickets_buyer_email_check CHECK (buyer_email IS NULL OR buyer_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
    CONSTRAINT tickets_sold_validation CHECK (
        (status NOT IN ('sold', 'validated') OR (buyer_name IS NOT NULL AND sold_at IS NOT NULL))
    ),
    CONSTRAINT tickets_validated_validation CHECK (
        (status <> 'validated' OR (validated_at IS NOT NULL))
    )
);

CREATE INDEX IF NOT EXISTS tickets_status_idx ON public.tickets(status);
CREATE INDEX IF NOT EXISTS tickets_batch_id_idx ON public.tickets(batch_id);
CREATE INDEX IF NOT EXISTS tickets_ticket_code_idx ON public.tickets(ticket_code);
CREATE INDEX IF NOT EXISTS tickets_sold_at_idx ON public.tickets(sold_at);

-- 4. TABLE: sales
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    payment_method TEXT NOT NULL,
    seller_name TEXT NOT NULL,
    sales_point TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS sales_created_at_idx ON public.sales(created_at);

-- 5. TABLE: checkins
CREATE TABLE IF NOT EXISTS public.checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    validated_by UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE RESTRICT,
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABLE: audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    performed_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at desc);

-- Enable RLS
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create helper function to get current user role
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role 
    FROM public.staff_profiles 
    WHERE user_id = auth.uid() AND active = true;
    RETURN v_role;
END;
$$;

-- RLS Policies
-- Super Admin has full control of everything
CREATE POLICY "Super admin bypass sellers" ON public.sellers FOR ALL USING (public.get_auth_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass staff_profiles" ON public.staff_profiles FOR ALL USING (public.get_auth_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass ticket_batches" ON public.ticket_batches FOR ALL USING (public.get_auth_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass tickets" ON public.tickets FOR ALL USING (public.get_auth_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass sales" ON public.sales FOR ALL USING (public.get_auth_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass checkins" ON public.checkins FOR ALL USING (public.get_auth_user_role() = 'super_admin');
CREATE POLICY "Super admin bypass audit_logs" ON public.audit_logs FOR ALL USING (public.get_auth_user_role() = 'super_admin');

-- Staff profile reading own profile
CREATE POLICY "Select own staff profile" ON public.staff_profiles FOR SELECT USING (auth.uid() = user_id AND active = true);

-- Event manager access policies
CREATE POLICY "Event manager manage sellers" ON public.sellers FOR ALL USING (public.get_auth_user_role() = 'event_manager');
CREATE POLICY "Event manager manage batches" ON public.ticket_batches FOR ALL USING (public.get_auth_user_role() = 'event_manager');
CREATE POLICY "Event manager manage tickets" ON public.tickets FOR ALL USING (public.get_auth_user_role() = 'event_manager');
CREATE POLICY "Event manager manage sales" ON public.sales FOR ALL USING (public.get_auth_user_role() = 'event_manager');
CREATE POLICY "Event manager manage checkins" ON public.checkins FOR ALL USING (public.get_auth_user_role() = 'event_manager');
CREATE POLICY "Event manager select staff" ON public.staff_profiles FOR SELECT USING (public.get_auth_user_role() = 'event_manager');
CREATE POLICY "Event manager select audit_logs" ON public.audit_logs FOR SELECT USING (public.get_auth_user_role() = 'event_manager');

-- Seller access policies
CREATE POLICY "Seller select sellers" ON public.sellers FOR SELECT USING (public.get_auth_user_role() = 'seller');
CREATE POLICY "Seller select batches" ON public.ticket_batches FOR SELECT USING (public.get_auth_user_role() = 'seller');
CREATE POLICY "Seller manage tickets" ON public.tickets FOR SELECT USING (public.get_auth_user_role() = 'seller');
CREATE POLICY "Seller update tickets" ON public.tickets FOR UPDATE USING (public.get_auth_user_role() = 'seller');
CREATE POLICY "Seller manage sales" ON public.sales FOR ALL USING (public.get_auth_user_role() = 'seller');
CREATE POLICY "Seller insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (public.get_auth_user_role() = 'seller');

-- Checkin Operator access policies
CREATE POLICY "Checkin operator select sellers" ON public.sellers FOR SELECT USING (public.get_auth_user_role() = 'checkin_operator');
CREATE POLICY "Checkin operator select tickets" ON public.tickets FOR SELECT USING (public.get_auth_user_role() = 'checkin_operator');
CREATE POLICY "Checkin operator update tickets" ON public.tickets FOR UPDATE USING (public.get_auth_user_role() = 'checkin_operator');
CREATE POLICY "Checkin operator manage checkins" ON public.checkins FOR ALL USING (public.get_auth_user_role() = 'checkin_operator');
CREATE POLICY "Checkin operator insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (public.get_auth_user_role() = 'checkin_operator');

-- Public access policies (anonymous users can search ticket code to reserve on landing page or confirm ticket validity)
CREATE POLICY "Public read tickets" ON public.tickets FOR SELECT USING (true);

-- 7. GENERATE INITIAL PHYSICAL INVENTORY (PF-000001 to PF-000500)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.tickets WHERE ticket_code = 'PF-000001') THEN
        FOR i IN 1..500 LOOP
            INSERT INTO public.tickets (ticket_code, status)
            VALUES ('PF-' || lpad(i::text, 6, '0'), 'available');
        END LOOP;
    END IF;
END $$;

-- 8. GENERATE INITIAL SELLERS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.sellers WHERE name = 'María López') THEN
        INSERT INTO public.sellers (name, phone, email, type, active)
        VALUES ('María López', '+504 9999-0001', 'maria@farecoh.org', 'vendor', true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.sellers WHERE name = 'Escuela Nacional de Música') THEN
        INSERT INTO public.sellers (name, phone, email, type, active)
        VALUES ('Escuela Nacional de Música', '+504 2234-5678', 'ventas@enm.hn', 'physical_point', true);
    END IF;
END $$;
