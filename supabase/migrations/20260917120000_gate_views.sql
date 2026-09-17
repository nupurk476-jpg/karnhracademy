-- One row per download-gate view, resolved in place.
--
-- Replaces the three independent counters (gate_shown / gate_submitted /
-- gate_dismissed) that could never reconcile: "shown" was written on open,
-- "dismissed" only on an explicit close, so every tab-close, backgrounding
-- and swipe-back silently vanished from the arithmetic and shown was
-- always larger than the two outcomes combined with no way to say why.
--
-- Here a view is a row. It starts 'shown' and is resolved exactly once, to
-- 'email_given' or 'walked_away'. Anything still 'shown' is a genuinely
-- unresolved session, which the dashboard shows as its own tile rather
-- than burying in a total that doesn't add up.
CREATE TABLE public.gate_views (
  -- Client-generated so the browser can resolve the row it opened without
  -- a round trip first -- a sendBeacon fired during pagehide has no way to
  -- read back an id the server chose.
  id UUID NOT NULL PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'shown',
  path TEXT,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  -- How the resolution reached us: 'click' (Cancel/X/Esc), 'beacon'
  -- (visibilitychange/pagehide) or 'submit'. Kept because it is the only
  -- way to tell later whether the beacon path is actually working.
  resolved_via TEXT,

  CONSTRAINT gate_views_status_chk CHECK (status IN ('shown', 'email_given', 'walked_away')),
  CONSTRAINT gate_views_resolved_chk CHECK (
    (status = 'shown' AND resolved_at IS NULL) OR (status <> 'shown' AND resolved_at IS NOT NULL)
  )
);

CREATE INDEX gate_views_created_idx ON public.gate_views (created_at DESC);
CREATE INDEX gate_views_status_created_idx ON public.gate_views (status, created_at DESC);

ALTER TABLE public.gate_views ENABLE ROW LEVEL SECURITY;

-- Same shape as analytics_events: the anonymous visitor's browser is
-- exactly who needs to write here; only admins read.
CREATE POLICY "Public open gate view" ON public.gate_views
  FOR INSERT WITH CHECK (status = 'shown' AND resolved_at IS NULL);
CREATE POLICY "Admin read gate views" ON public.gate_views
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete gate views" ON public.gate_views
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Deliberately NO update policy: resolution goes through the RPC below, so
-- an anonymous caller can only ever move a row from 'shown' to one of the
-- two outcomes, once, and can never rewrite a resolved row or a count.
CREATE OR REPLACE FUNCTION public.resolve_gate_view(
  _id UUID,
  _status TEXT,
  _via TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _status NOT IN ('email_given', 'walked_away') THEN
    RAISE EXCEPTION 'invalid gate resolution %', _status;
  END IF;
  -- The status = 'shown' predicate is the idempotency guard: a beacon that
  -- races the submit handler, or fires twice, is a no-op rather than a
  -- conversion overwritten by an abandon.
  UPDATE public.gate_views
     SET status = _status,
         resolved_at = now(),
         resolved_via = left(coalesce(_via, 'unknown'), 16)
   WHERE id = _id AND status = 'shown';
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_gate_view(UUID, TEXT, TEXT) TO anon, authenticated;
