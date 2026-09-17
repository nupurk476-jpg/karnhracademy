-- One course per SUBJECT, with its topics as modules.
--
-- The first cut made a course per (subject, topic), which the real data
-- then judged: 109 courses averaging a single lesson each. That is the
-- notes list with a different coat of paint, and a student who clicks
-- "Strategic Intent" expecting a course and finds one PDF leaves.
--
-- So the grain moves up. "Strategic Management" becomes one course whose
-- modules are its topics and whose lessons are the notes, lectures and
-- MCQs filed under them — around ten substantial courses instead of a
-- hundred thin ones. Nothing about the content changes; only how it is
-- grouped for display.
--
-- Items now carry their own topic_slug, which is what makes a module: it
-- lets the catalog card count modules without reading every item, and lets
-- the course page group lessons without joining back to three tables to
-- ask which topic each one came from.

ALTER TABLE public.course_items ADD COLUMN IF NOT EXISTS topic_slug TEXT;

CREATE INDEX IF NOT EXISTS course_items_course_topic_idx
  ON public.course_items (course_id, topic_slug, position);

-- A subject-level course has no topic of its own, and there must be only
-- one per subject. The existing UNIQUE (category_slug, topic_slug) does
-- not enforce that: Postgres treats NULLs as distinct, so it would happily
-- accept ten "HRM, no topic" rows. A partial index over the NULL case is
-- what actually makes the sync idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS courses_one_per_category_idx
  ON public.courses (category_slug) WHERE topic_slug IS NULL;

-- Module count on the card, so it can read "12 modules · 47 lessons".
CREATE OR REPLACE VIEW public.course_cards WITH (security_invoker = true) AS
SELECT
  c.id, c.slug, c.category_slug, c.topic_slug, c.title, c.summary,
  c.cover_url, c.level, c.is_free, c.price_paise, c.is_published,
  c.display_order, c.created_at,
  cat.label AS category_label,
  cat.display_order AS category_order,
  coalesce(i.total, 0)    AS lesson_count,
  coalesce(i.notes, 0)    AS note_count,
  coalesce(i.quizzes, 0)  AS quiz_count,
  coalesce(i.lectures, 0) AS lecture_count,
  coalesce(i.modules, 0)  AS module_count
FROM public.courses c
JOIN public.course_categories cat ON cat.slug = c.category_slug
LEFT JOIN (
  SELECT course_id,
         count(*)                                 AS total,
         count(*) FILTER (WHERE kind = 'note')     AS notes,
         count(*) FILTER (WHERE kind = 'quiz')     AS quizzes,
         count(*) FILTER (WHERE kind = 'lecture')  AS lectures,
         count(DISTINCT topic_slug)                AS modules
  FROM public.course_items
  GROUP BY course_id
) i ON i.course_id = c.id;

GRANT SELECT ON public.course_cards TO anon, authenticated;

-- Publishing a course in a hidden category did nothing: the card view
-- joins the category, so the row vanished for visitors while the admin
-- screen still showed it Live, with no explanation. A category that has a
-- published course in it is one whose courses are meant to be seen.
CREATE OR REPLACE FUNCTION public.publish_category_of()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_published THEN
    UPDATE public.course_categories
       SET is_published = true
     WHERE slug = NEW.category_slug AND NOT is_published;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS courses_publish_category ON public.courses;
CREATE TRIGGER courses_publish_category
  AFTER INSERT OR UPDATE OF is_published ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.publish_category_of();

-- ── The sync, at subject grain ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_courses_from_content(
  _categories JSONB DEFAULT '{}'::jsonb,  -- { "hrm": {"label": ..., "description": ..., "order": 0}, ... }
  _topics JSONB DEFAULT '{}'::jsonb       -- { "motivation": "Motivation", ... }  (module titles)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cats_added INT := 0;
  courses_added INT := 0;
  items_added INT := 0;
  items_removed INT := 0;
  retired INT := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  INSERT INTO public.course_categories (slug, label, description, display_order)
  SELECT key,
         coalesce(value->>'label', key),
         value->>'description',
         coalesce((value->>'order')::int, 0)
  FROM jsonb_each(_categories)
  WHERE key ~ '^[a-z0-9-]{1,64}$'
  ON CONFLICT (slug) DO NOTHING;
  GET DIAGNOSTICS cats_added = ROW_COUNT;

  -- Every piece of content that carries a topic, with the subject it is
  -- filed under. Legacy notes predate the subject column and are NULL; the
  -- site has always read those as HRM, so they are counted the same way
  -- rather than vanishing from the catalog.
  CREATE TEMP TABLE _content ON COMMIT DROP AS
  SELECT coalesce(subject, 'hrm') AS category_slug, topic_slug, 'note'::text AS kind,
         id AS ref_id, created_at
    FROM public.notes
   WHERE topic_slug IS NOT NULL AND topic_slug <> ''
  UNION ALL
  SELECT coalesce(subject, 'hrm'), topic_slug, 'lecture', id, created_at
    FROM public.lectures
   WHERE topic_slug IS NOT NULL AND topic_slug <> ''
  UNION ALL
  SELECT coalesce(subject, 'hrm'), topic_slug, 'quiz', id, created_at
    FROM public.quizzes
   WHERE topic_slug IS NOT NULL AND topic_slug <> ''
     AND published IS NOT FALSE;

  -- Content under a subject nobody declared would break the FK and abort
  -- the sync. Register it instead, unpublished, so it cannot surface in
  -- the sidebar unreviewed.
  INSERT INTO public.course_categories (slug, label, is_published)
  SELECT DISTINCT c.category_slug, initcap(replace(c.category_slug, '-', ' ')), false
  FROM _content c
  WHERE c.category_slug ~ '^[a-z0-9-]{1,64}$'
  ON CONFLICT (slug) DO NOTHING;

  -- One draft course per subject that has content. The slug is the subject
  -- itself, so a course lives at a readable /courses/hrm.
  INSERT INTO public.courses (slug, category_slug, topic_slug, title, summary)
  SELECT DISTINCT
    c.category_slug,
    c.category_slug,
    NULL,
    coalesce(_categories->c.category_slug->>'label', initcap(replace(c.category_slug, '-', ' '))),
    _categories->c.category_slug->>'description'
  FROM _content c
  WHERE c.category_slug ~ '^[a-z0-9-]{1,64}$'
  ON CONFLICT (slug) DO NOTHING;
  GET DIAGNOSTICS courses_added = ROW_COUNT;

  -- Items: everything in the subject, tagged with the topic that makes it
  -- a module. Ordered by topic, then read → watch → test within it. The
  -- syllabus order of the topics themselves lives in disciplines.ts, which
  -- Postgres has no view of, so the course page does that final ordering.
  INSERT INTO public.course_items (course_id, kind, ref_id, topic_slug, position)
  SELECT co.id, c.kind, c.ref_id, c.topic_slug,
         row_number() OVER (
           PARTITION BY co.id
           ORDER BY c.topic_slug,
                    CASE c.kind WHEN 'note' THEN 1 WHEN 'lecture' THEN 2 ELSE 3 END,
                    c.created_at
         )
  FROM _content c
  JOIN public.courses co
    ON co.category_slug = c.category_slug AND co.topic_slug IS NULL
  ON CONFLICT (course_id, kind, ref_id) DO UPDATE
    -- Keeps the module tag current when a note is re-filed to another
    -- topic without being removed from the course.
    SET topic_slug = excluded.topic_slug
    -- Only when it actually differs. Without this the statement "updates"
    -- every existing row to the value it already holds, and ROW_COUNT then
    -- reports every lesson as added on every sync -- an admin screen
    -- cheerfully claiming 47 new lessons for a no-op run.
    WHERE public.course_items.topic_slug IS DISTINCT FROM excluded.topic_slug;
  GET DIAGNOSTICS items_added = ROW_COUNT;

  DELETE FROM public.course_items ci
  USING public.courses co
  WHERE ci.course_id = co.id
    AND co.topic_slug IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM _content c
      WHERE c.category_slug = co.category_slug
        AND c.kind = ci.kind
        AND c.ref_id = ci.ref_id
    );
  GET DIAGNOSTICS items_removed = ROW_COUNT;

  -- Retire the per-topic courses the first cut generated. Only the
  -- untouched ones: anything given a summary or a cover by hand is
  -- somebody's work, so it is left alone (unpublished, not deleted) for
  -- them to decide about.
  UPDATE public.courses SET is_published = false
   WHERE topic_slug IS NOT NULL AND (summary IS NOT NULL OR cover_url IS NOT NULL);

  DELETE FROM public.courses
   WHERE topic_slug IS NOT NULL
     AND summary IS NULL AND cover_url IS NULL;
  GET DIAGNOSTICS retired = ROW_COUNT;

  RETURN jsonb_build_object(
    'categories_added', cats_added,
    'courses_added', courses_added,
    'items_added', items_added,
    'items_removed', items_removed,
    'topic_courses_retired', retired,
    'courses_total', (SELECT count(*) FROM public.courses),
    'courses_published', (SELECT count(*) FROM public.courses WHERE is_published)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_courses_from_content(JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_courses_from_content(JSONB, JSONB) TO authenticated;

-- Existing installs: publish any category that already has a live course,
-- so the fix lands without anyone having to run it by hand.
UPDATE public.course_categories c
   SET is_published = true
 WHERE NOT c.is_published
   AND EXISTS (SELECT 1 FROM public.courses co
                WHERE co.category_slug = c.slug AND co.is_published);
