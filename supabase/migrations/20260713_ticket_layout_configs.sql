-- Independent physical/digital ticket layout calibration (additive only).
-- Does NOT modify tickets.ticket_code or tickets.qr_token.

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
    'migration'
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
    'migration'
  )
ON CONFLICT (layout_type) DO NOTHING;

NOTIFY pgrst, 'reload schema';
