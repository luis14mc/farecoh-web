-- Outbound reservation notifications (WhatsApp, etc.) — server-side logging only.

CREATE TABLE IF NOT EXISTS public.reservation_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_codes TEXT[] NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT,
  buyer_email TEXT,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  recipient TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reservation_notifications_created_at_idx
  ON public.reservation_notifications (created_at DESC);

CREATE INDEX IF NOT EXISTS reservation_notifications_status_idx
  ON public.reservation_notifications (status);

ALTER TABLE public.reservation_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin select reservation_notifications" ON public.reservation_notifications;
DROP POLICY IF EXISTS "Event manager select reservation_notifications" ON public.reservation_notifications;

CREATE POLICY "Super admin select reservation_notifications"
  ON public.reservation_notifications
  FOR SELECT
  USING (public.get_auth_user_role() = 'super_admin');

CREATE POLICY "Event manager select reservation_notifications"
  ON public.reservation_notifications
  FOR SELECT
  USING (public.get_auth_user_role() = 'event_manager');

NOTIFY pgrst, 'reload schema';
