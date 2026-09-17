-- analytics_summary(), with the two sections that couldn't add up rebuilt
-- on the tables that can: gate_views (one row per gate view) and
-- funnel_events (one row per attempt per step).
--
-- Everything else is carried over from 20260908150000 unchanged.
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

  _days := least(greatest(coalesce(_days, 30), 1), 400);
  since := now() - make_interval(days => _days);

  SELECT jsonb_build_object(
    'days', _days,

    'totals', (
      SELECT coalesce(jsonb_object_agg(event, n), '{}'::jsonb)
      FROM (
        SELECT event, count(*) AS n
        FROM public.analytics_events
        WHERE created_at >= since
        GROUP BY event
      ) t
    ),

    -- Download email gate, reconciled by construction: every view is one
    -- row in exactly one status, so shown = email_given + walked_away +
    -- unresolved is an identity, not a hope. 'unresolved' is reported, not
    -- hidden -- a gate view we never saw the end of is a real thing that
    -- happened and the dashboard says so.
    'gate', (
      SELECT jsonb_build_object(
        'shown',       count(*),
        'email_given', count(*) FILTER (WHERE status = 'email_given'),
        'walked_away', count(*) FILTER (WHERE status = 'walked_away'),
        'unresolved',  count(*) FILTER (WHERE status = 'shown'),
        -- How each resolution reached us, so a beacon that quietly stops
        -- firing shows up as a drift in these two rather than as a mystery
        -- pile of unresolved rows.
        'via_beacon',  count(*) FILTER (WHERE resolved_via = 'beacon'),
        'via_click',   count(*) FILTER (WHERE resolved_via = 'click')
      )
      FROM public.gate_views
      WHERE created_at >= since
    ),

    -- Quiz funnel over attempts. Per attempt we take the furthest step
    -- reached, then count attempts at or beyond each threshold: a count
    -- can then never exceed the one above it, because reaching step N
    -- means having reached every step below it.
    --
    -- Two steps are counted exactly rather than by threshold, because
    -- neither is on the line every attempt walks:
    --
    --   wall_hit  -- an attempt by someone already signed in never sees
    --               the wall, so "attempts at or beyond the wall" would
    --               just be every attempt and the row would be a
    --               relabelled total.
    --   signed_up -- it happens *between* the wall and the first question,
    --               not after the last one. Ranked last and counted by
    --               threshold, an attempt that signed up and then wandered
    --               off would be counted as having started and finished a
    --               quiz it never opened -- the same class of inflation
    --               this rewrite exists to remove. It is instead counted
    --               only among attempts that reached the wall, which is
    --               the comparison the row is actually there to make, and
    --               which cannot exceed the wall count.
    --
    -- The chain attempts >= started >= finished is a threshold count and
    -- monotone by construction; wall_hit >= signed_up likewise.
    'quiz_funnel', (
      SELECT jsonb_build_object(
        'attempts',  count(*),
        'started',   count(*) FILTER (WHERE max_step >= 2),
        'finished',  count(*) FILTER (WHERE max_step >= 3),
        'wall_hit',  count(*) FILTER (WHERE hit_wall),
        'signed_up', count(*) FILTER (WHERE hit_wall AND signed_up)
      )
      FROM (
        SELECT
          attempt_id,
          max(public.funnel_step_rank(step)) FILTER (WHERE step <> 'signed_up') AS max_step,
          bool_or(step = 'wall_hit')  AS hit_wall,
          bool_or(step = 'signed_up') AS signed_up
        FROM public.funnel_events
        WHERE created_at >= since
        GROUP BY attempt_id
      ) a
    ),

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

-- Retention for the two new tables, alongside prune_analytics_events.
CREATE OR REPLACE FUNCTION public.prune_funnel_tables(keep_days INTEGER DEFAULT 400)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed BIGINT;
  total BIGINT := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'only admins may prune funnel tables';
  END IF;
  DELETE FROM public.gate_views WHERE created_at < now() - make_interval(days => keep_days);
  GET DIAGNOSTICS removed = ROW_COUNT;
  total := total + removed;
  DELETE FROM public.funnel_events WHERE created_at < now() - make_interval(days => keep_days);
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN total + removed;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prune_funnel_tables(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prune_funnel_tables(INTEGER) TO authenticated;
