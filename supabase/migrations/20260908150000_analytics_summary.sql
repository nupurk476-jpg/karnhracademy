-- Everything the admin analytics screen shows, in one round trip.
--
-- Aggregating here rather than in the browser is the whole point: the
-- funnel needs counts, not rows, and a client that downloads every event
-- to count them stops working the moment the table gets interesting.
-- Follows the homepage_counts() precedent of returning one jsonb blob.
--
-- SECURITY DEFINER with an explicit admin check, matching
-- prune_analytics_events. RLS alone would return an empty result to a
-- non-admin, which reads as "no traffic yet" rather than "not allowed" --
-- a silent wrong answer is worse than an error.
CREATE OR REPLACE FUNCTION public.analytics_summary(_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since TIMESTAMPTZ;
  result JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  -- Clamped so a stray parameter cannot ask for an unbounded scan.
  _days := least(greatest(coalesce(_days, 30), 1), 400);
  since := now() - make_interval(days => _days);

  SELECT jsonb_build_object(
    'days', _days,

    -- Every funnel rate on the page is derived from these counts, so the
    -- page never has to ask a second time.
    'totals', (
      SELECT coalesce(jsonb_object_agg(event, n), '{}'::jsonb)
      FROM (
        SELECT event, count(*) AS n
        FROM public.analytics_events
        WHERE created_at >= since
        GROUP BY event
      ) t
    ),

    -- The content backlog, written by students: what they looked for and
    -- did not find. Ordered by how many people asked.
    'zero_result_searches', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('q', q, 'n', n) ORDER BY n DESC), '[]'::jsonb)
      FROM (
        SELECT props->>'q' AS q, count(*) AS n
        FROM public.analytics_events
        WHERE event = 'search'
          AND created_at >= since
          AND (props->>'results') ~ '^[0-9]+$'
          AND (props->>'results')::int = 0
          AND coalesce(props->>'q', '') <> ''
        GROUP BY props->>'q'
        ORDER BY n DESC
        LIMIT 25
      ) t
    ),

    'top_searches', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('q', q, 'n', n) ORDER BY n DESC), '[]'::jsonb)
      FROM (
        SELECT props->>'q' AS q, count(*) AS n
        FROM public.analytics_events
        WHERE event = 'search' AND created_at >= since AND coalesce(props->>'q', '') <> ''
        GROUP BY props->>'q'
        ORDER BY n DESC
        LIMIT 25
      ) t
    ),

    -- Which sections people actually open material from.
    'top_content', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('path', path, 'n', n) ORDER BY n DESC), '[]'::jsonb)
      FROM (
        SELECT path, count(*) AS n
        FROM public.analytics_events
        WHERE event = 'content_open' AND created_at >= since AND path IS NOT NULL
        GROUP BY path
        ORDER BY n DESC
        LIMIT 25
      ) t
    ),

    -- Which gate sent each new account to /auth: this is what says whether
    -- the quiz sign-in wall earns its cost.
    'signup_sources', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('from', src, 'n', n) ORDER BY n DESC), '[]'::jsonb)
      FROM (
        SELECT coalesce(props->>'from', '/') AS src, count(*) AS n
        FROM public.analytics_events
        WHERE event = 'auth_signup' AND created_at >= since
        GROUP BY coalesce(props->>'from', '/')
        ORDER BY n DESC
        LIMIT 25
      ) t
    ),

    -- Per-programme registration funnel, so a single popular programme
    -- cannot hide a different one that nobody completes.
    'programme_funnel', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'slug', slug, 'views', views, 'details', details,
        'payment', payment, 'submitted', submitted
      ) ORDER BY views DESC), '[]'::jsonb)
      FROM (
        SELECT
          props->>'slug' AS slug,
          count(*) FILTER (WHERE event = 'programme_view') AS views,
          count(*) FILTER (WHERE event = 'reg_details')    AS details,
          count(*) FILTER (WHERE event = 'reg_payment')    AS payment,
          count(*) FILTER (WHERE event = 'reg_submitted')  AS submitted
        FROM public.analytics_events
        WHERE created_at >= since
          AND event IN ('programme_view', 'reg_details', 'reg_payment', 'reg_submitted')
          AND coalesce(props->>'slug', '') <> ''
        GROUP BY props->>'slug'
      ) t
    ),

    -- Distinct people, not events -- the denominator that makes the rates
    -- above mean something.
    'visitors', (
      SELECT count(DISTINCT visitor_id)
      FROM public.analytics_events
      WHERE created_at >= since
    ),

    'daily', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('day', day, 'n', n) ORDER BY day), '[]'::jsonb)
      FROM (
        SELECT date_trunc('day', created_at)::date AS day, count(*) AS n
        FROM public.analytics_events
        WHERE created_at >= since
        GROUP BY 1
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.analytics_summary(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_summary(INTEGER) TO authenticated;
