-- Client-side error capture (window.onerror, unhandled rejections, and the
-- top-level React error boundary) writes here so failures are visible
-- somewhere other than a devtools console nobody has open. Anyone can
-- INSERT — an anonymous visitor's browser is exactly who needs to report a
-- crash — but only admins can read or clear the log. Same shape as
-- contact_messages/email_subscribers.
CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  stack TEXT,
  path TEXT,
  user_agent TEXT,
  context TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public report errors" ON public.error_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin read error logs" ON public.error_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete error logs" ON public.error_logs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
