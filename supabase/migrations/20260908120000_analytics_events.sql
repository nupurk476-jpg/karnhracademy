-- Product analytics: the funnel events that inform revenue decisions.
--
-- Deliberately NOT a pageview log. Raw pageviews live in Vercel Web
-- Analytics (cookieless, off-database); this table holds only *meaningful*
-- events, so it stays small enough to query and cheap enough to keep. Its
-- reason for existing is the join: it sits in the same database as
-- quiz_attempts, programme_registrations and email_subscribers, so it can
-- answer questions no third-party tool can ("do quiz-takers register?").
--
-- Same access shape as error_logs: an anonymous visitor's browser is
-- exactly who needs to write here, so INSERT is public, while only admins
-- can read. Nothing here may contain PII — emails stay in
-- email_subscribers; see the stripPII guard in src/lib/analytics.ts.
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event TEXT NOT NULL,
  path TEXT,
  -- Durable per-browser id (localStorage): lets us see a visitor who reads
  -- notes on Monday and registers on Friday as one person.
  visitor_id TEXT NOT NULL,
  -- Per-visit id (sessionStorage): the unit for drop-off analysis, where
  -- "did they abandon within this sitting?" is the question.
  session_id TEXT NOT NULL,
  -- Set only once signed in, so funnels can be split by logged-in state.
  -- ON DELETE SET NULL: deleting an account must not delete the history.
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  props JSONB NOT NULL DEFAULT '{}'::jsonb,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Cheap server-side sanity bounds. The client caps its own volume, but
  -- the client is not the thing standing between a script and this table.
  CONSTRAINT analytics_events_event_len CHECK (char_length(event) BETWEEN 1 AND 64),
  CONSTRAINT analytics_events_props_len CHECK (pg_column_size(props) <= 4096)
);

-- Dashboard reads are "this event, recently" and "this funnel, recently".
CREATE INDEX analytics_events_event_created_idx
  ON public.analytics_events (event, created_at DESC);
CREATE INDEX analytics_events_created_idx
  ON public.analytics_events (created_at DESC);
-- Funnel reconstruction: all events for one visit, in order.
CREATE INDEX analytics_events_session_idx
  ON public.analytics_events (session_id, created_at);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public write analytics events" ON public.analytics_events
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin read analytics events" ON public.analytics_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete analytics events" ON public.analytics_events
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Retention, decided now rather than after the table is 10M rows. Call it
-- from a schedule (pg_cron) or by hand from the admin dashboard; the
-- default keeps a full exam cycle, which is the period worth comparing
-- against. SECURITY DEFINER so it can delete past RLS, but admin-gated so
-- an anonymous caller cannot wipe the log.
CREATE OR REPLACE FUNCTION public.prune_analytics_events(keep_days INTEGER DEFAULT 400)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed BIGINT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'only admins may prune analytics events';
  END IF;
  DELETE FROM public.analytics_events
    WHERE created_at < now() - make_interval(days => keep_days);
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;

-- Belt and braces: the function admin-checks internally, but an anonymous
-- caller has no business reaching it at all.
REVOKE EXECUTE ON FUNCTION public.prune_analytics_events(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prune_analytics_events(INTEGER) TO authenticated;
