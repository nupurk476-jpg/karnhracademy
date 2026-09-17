-- The quiz funnel, keyed by attempt instead of by pageview.
--
-- The old funnel was four independent COUNT()s over analytics_events, so a
-- reload of /quizzes/:id, a retake, or a second sign-up attempt each added
-- another row to a *downstream* step with nothing tying it back to the
-- step above. That is how the dashboard ended up showing "signed up" at
-- 120% of "finished" -- a shape a funnel cannot actually have.
--
-- One attempt = one attempt_id, minted when a visitor first tries to take
-- a quiz and carried across the sign-in round trip. The unique constraint
-- is the real fix: a retry or reload re-logs the same (attempt_id, step)
-- and the second write is discarded by the database, not by the browser.
CREATE TABLE public.funnel_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Client-generated, one per quiz attempt (NOT per pageview).
  attempt_id UUID NOT NULL,
  step TEXT NOT NULL,
  quiz_id UUID,
  visitor_id TEXT,
  session_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT funnel_events_step_chk
    CHECK (step IN ('wall_hit', 'started', 'finished', 'signed_up')),
  -- The whole point of the table.
  CONSTRAINT funnel_events_attempt_step_uniq UNIQUE (attempt_id, step)
);

CREATE INDEX funnel_events_created_idx ON public.funnel_events (created_at DESC);
CREATE INDEX funnel_events_attempt_idx ON public.funnel_events (attempt_id);

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public write funnel events" ON public.funnel_events
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin read funnel events" ON public.funnel_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete funnel events" ON public.funnel_events
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Rank the steps once, here, so the query below and any later reader agree
-- on what "further along" means.
CREATE OR REPLACE FUNCTION public.funnel_step_rank(_step TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _step
    WHEN 'wall_hit'  THEN 1
    WHEN 'started'   THEN 2
    WHEN 'finished'  THEN 3
    WHEN 'signed_up' THEN 4
    ELSE 0
  END;
$$;

-- Backfill: the existing analytics_events rows are worth keeping -- they
-- are the only history there is -- but they have no attempt id, so one is
-- synthesised deterministically from (session_id, quiz). Two attempts at
-- the same quiz in one browser session collapse into one attempt, which
-- undercounts rather than inflating; that is the right direction for a
-- funnel whose whole problem was inflation. Everything from here on is
-- logged with a real per-attempt id.
INSERT INTO public.funnel_events (attempt_id, step, quiz_id, visitor_id, session_id, user_id, created_at)
SELECT
  md5(session_id || ':' || quiz_key)::uuid AS attempt_id,
  step,
  CASE WHEN quiz_key ~ '^[0-9a-f-]{36}$' THEN quiz_key::uuid END,
  visitor_id,
  session_id,
  user_id,
  min(created_at)
FROM (
  SELECT
    session_id,
    visitor_id,
    user_id,
    created_at,
    CASE event
      WHEN 'quiz_signin_required' THEN 'wall_hit'
      WHEN 'quiz_start'           THEN 'started'
      WHEN 'quiz_complete'        THEN 'finished'
      WHEN 'auth_signup'          THEN 'signed_up'
    END AS step,
    CASE
      WHEN event = 'auth_signup'
        -- Only signups the quiz wall actually drove; a header sign-up was
        -- never part of this funnel and is what made the old "signed up"
        -- row larger than the step above it.
        THEN substring(coalesce(props->>'from', '') FROM '^/quizzes/([^/?#]+)')
      ELSE props->>'quiz'
    END AS quiz_key
  FROM public.analytics_events
  WHERE event IN ('quiz_signin_required', 'quiz_start', 'quiz_complete', 'auth_signup')
) src
WHERE step IS NOT NULL AND coalesce(quiz_key, '') <> ''
GROUP BY session_id, quiz_key, step, visitor_id, user_id
ON CONFLICT (attempt_id, step) DO NOTHING;
