-- Ensure ticket_layout_configs exists (additive, idempotent).
-- Does NOT modify tickets, qr_token, ticket_code, sales, or reservations.

CREATE TABLE IF NOT EXISTS public.ticket_layout_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_type TEXT NOT NULL UNIQUE
    CHECK (layout_type IN ('physical', 'digital')),
  template_path TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

ALTER TABLE public.ticket_layout_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin manage ticket_layout_configs" ON public.ticket_layout_configs;
DROP POLICY IF EXISTS "Event manager manage ticket_layout_configs" ON public.ticket_layout_configs;
DROP POLICY IF EXISTS "Staff read ticket_layout_configs" ON public.ticket_layout_configs;

CREATE POLICY "Super admin manage ticket_layout_configs"
  ON public.ticket_layout_configs
  FOR ALL
  USING (public.get_auth_user_role() = 'super_admin');

CREATE POLICY "Event manager manage ticket_layout_configs"
  ON public.ticket_layout_configs
  FOR ALL
  USING (public.get_auth_user_role() = 'event_manager');

CREATE POLICY "Staff read ticket_layout_configs"
  ON public.ticket_layout_configs
  FOR SELECT
  USING (public.get_auth_user_role() IN ('super_admin', 'event_manager', 'seller', 'checkin_operator'));

NOTIFY pgrst, 'reload schema';
