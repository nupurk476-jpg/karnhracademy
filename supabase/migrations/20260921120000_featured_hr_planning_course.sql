-- A hand-made course — "HR Planning" — and a place for it on the home page.
--
-- Three things happen here, and they are one feature:
--
--  1. COURSES CAN BE FEATURED. is_featured marks the handful of courses the
--     home page leads with. A boolean on the row rather than a list in the
--     code, so promoting a course later is a toggle in the admin screen and
--     not a deploy — the same reasoning that put the category list in
--     Postgres in the first place (see 20260917150000_courses.sql).
--
--  2. THE SYNC STOPS RETIRING TOPIC-LEVEL COURSES. The move to one course
--     per subject (20260917160000) left the sync clearing out every course
--     that carries a topic_slug, which was right for the hundred thin
--     generated ones it was cleaning up and wrong for a course somebody
--     builds on purpose. That cleanup is a one-time job, so it runs once
--     here, in the migration, and the function no longer repeats it.
--     In exchange the sync now RECONCILES topic-level courses too: a course
--     on "HR Planning" collects everything filed under that topic, the same
--     way a subject-level course collects everything in its subject.
--
--  3. NEW UPLOADS LAND IN THE COURSE BY THEMSELVES. Until now a note only
--     became a lesson when someone remembered to press "Sync from content".
--     For a course whose whole purpose is to be filled with notes and slide
--     decks that is a trap: you upload, the course stays empty, and nothing
--     says why. A trigger on notes / lectures / quizzes keeps the pointers
--     current on insert, update and delete; the sync stays as the repair
--     tool for anything written before this, or around it.

-- ── 1. Featured flag ─────────────────────────────────────────────────────
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS courses_featured_idx
  ON public.courses (display_order) WHERE is_featured;

-- The home page reads the same card view the catalog does, so the flag has
-- to reach it. Appended last: CREATE OR REPLACE VIEW can add columns at the
-- end and nothing else, so the existing list is reproduced verbatim.
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
  coalesce(i.modules, 0)  AS module_count,
  coalesce(i.topics, 0)   AS topic_count,
  c.is_featured
FROM public.courses c
JOIN public.course_categories cat ON cat.slug = c.category_slug
LEFT JOIN (
  SELECT course_id,
         count(*)                                  AS total,
         count(*) FILTER (WHERE kind = 'note')      AS notes,
         count(*) FILTER (WHERE kind = 'quiz')      AS quizzes,
         count(*) FILTER (WHERE kind = 'lecture')   AS lectures,
         count(DISTINCT public.course_module_key(topic_slug)) AS modules,
         count(DISTINCT topic_slug)                 AS topics
  FROM public.course_items
  GROUP BY course_id
) i ON i.course_id = c.id;

GRANT SELECT ON public.course_cards TO anon, authenticated;

-- ── 2. The one-time retirement the sync used to repeat ───────────────────
-- What sync_courses_from_content did on every run, done once. Hand work (a
-- summary, a cover) is unpublished rather than removed, because it is
-- somebody's writing and theirs to decide about; the untouched generated
-- rows go.
--
-- Narrowed to the rows the first cut actually generated — the ones still
-- carrying its "<subject>-<topic>" slug — where the sync swept up every
-- topic-level course there was. That is the difference between a cleanup
-- and a trap: run this file twice, or add a topic course of your own
-- tomorrow, and neither is touched.
UPDATE public.courses SET is_published = false
 WHERE topic_slug IS NOT NULL
   AND slug = category_slug || '-' || topic_slug
   AND (summary IS NOT NULL OR cover_url IS NOT NULL);

DELETE FROM public.courses
 WHERE topic_slug IS NOT NULL
   AND slug = category_slug || '-' || topic_slug
   AND summary IS NULL AND cover_url IS NULL;

-- ── 3. The sync, reconciling topic-level courses too ─────────────────────
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
  -- itself, so a course lives at a readable /courses/hrm. Topic-level
  -- courses are never generated — they are made by hand, and the sync only
  -- keeps their lessons current.
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

  -- Items: everything the course covers, tagged with the topic that makes
  -- it a module. A subject-level course (topic_slug IS NULL) takes the
  -- whole subject; a topic-level one takes its own topic only. Ordered by
  -- topic, then read → watch → test within it. The syllabus order of the
  -- topics themselves lives in disciplines.ts, which Postgres has no view
  -- of, so the course page does that final ordering.
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
    ON co.category_slug = c.category_slug
   AND (co.topic_slug IS NULL OR co.topic_slug = c.topic_slug)
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

  -- Pointers whose target was removed, unpublished, or re-filed out of this
  -- course. Without this a card keeps advertising lessons that 404.
  DELETE FROM public.course_items ci
  USING public.courses co
  WHERE ci.course_id = co.id
    AND NOT EXISTS (
      SELECT 1 FROM _content c
      WHERE c.category_slug = co.category_slug
        AND (co.topic_slug IS NULL OR c.topic_slug = co.topic_slug)
        AND c.kind = ci.kind
        AND c.ref_id = ci.ref_id
    );
  GET DIAGNOSTICS items_removed = ROW_COUNT;

  RETURN jsonb_build_object(
    'categories_added', cats_added,
    'courses_added', courses_added,
    'items_added', items_added,
    'items_removed', items_removed,
    'courses_total', (SELECT count(*) FROM public.courses),
    'courses_published', (SELECT count(*) FROM public.courses WHERE is_published)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_courses_from_content(JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_courses_from_content(JSONB, JSONB) TO authenticated;

-- ── 4. Uploads attach themselves ─────────────────────────────────────────
-- Reads NEW through to_jsonb so ONE function serves all three content
-- tables: notes have no `published` column, lectures none of the quiz
-- fields, and a direct NEW.published would fail at runtime on the tables
-- that lack it.
CREATE OR REPLACE FUNCTION public.attach_content_to_courses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_json JSONB := to_jsonb(NEW);
  _kind TEXT := TG_ARGV[0];
  _subject TEXT := coalesce(row_json->>'subject', 'hrm');
  _topic TEXT := nullif(row_json->>'topic_slug', '');
  -- An unpublished MCQ set is not a lesson yet. Notes and lectures have no
  -- such column, and `->>` on a missing key is NULL, which reads as "no
  -- publishing gate" — exactly right for those two.
  _eligible BOOLEAN := _topic IS NOT NULL
                   AND (row_json->>'published') IS DISTINCT FROM 'false';
BEGIN
  -- Pointers that no longer apply: the row lost its topic, was unpublished,
  -- or was re-filed into another subject or another module.
  DELETE FROM public.course_items ci
  USING public.courses co
  WHERE ci.course_id = co.id
    AND ci.kind = _kind
    AND ci.ref_id = NEW.id
    AND (NOT _eligible
         OR co.category_slug IS DISTINCT FROM _subject
         OR (co.topic_slug IS NOT NULL AND co.topic_slug IS DISTINCT FROM _topic));

  IF _eligible THEN
    -- Appended at the end of the course rather than slotted into the
    -- read → watch → test order a full sync builds: the course page groups
    -- by module first, so a new note lands at the bottom of its own module,
    -- which is where the newest material belongs anyway.
    INSERT INTO public.course_items (course_id, kind, ref_id, topic_slug, position)
    SELECT co.id, _kind, NEW.id, _topic,
           coalesce((SELECT max(x.position) FROM public.course_items x WHERE x.course_id = co.id), 0) + 1
    FROM public.courses co
    WHERE co.category_slug = _subject
      AND (co.topic_slug IS NULL OR co.topic_slug = _topic)
    ON CONFLICT (course_id, kind, ref_id) DO UPDATE
      SET topic_slug = excluded.topic_slug
      WHERE public.course_items.topic_slug IS DISTINCT FROM excluded.topic_slug;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- The catalog is a derived view of the content, so it must never be the
  -- reason an upload fails. "Sync from content" repairs whatever this
  -- missed; a note that never saved cannot be repaired at all.
  RAISE WARNING 'attach_content_to_courses(%): %', _kind, SQLERRM;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.detach_content_from_courses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.course_items WHERE kind = TG_ARGV[0] AND ref_id = OLD.id;
  RETURN OLD;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'detach_content_from_courses(%): %', TG_ARGV[0], SQLERRM;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS notes_attach_to_courses ON public.notes;
CREATE TRIGGER notes_attach_to_courses
  AFTER INSERT OR UPDATE OF subject, topic_slug ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.attach_content_to_courses('note');

DROP TRIGGER IF EXISTS notes_detach_from_courses ON public.notes;
CREATE TRIGGER notes_detach_from_courses
  AFTER DELETE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.detach_content_from_courses('note');

DROP TRIGGER IF EXISTS lectures_attach_to_courses ON public.lectures;
CREATE TRIGGER lectures_attach_to_courses
  AFTER INSERT OR UPDATE OF subject, topic_slug ON public.lectures
  FOR EACH ROW EXECUTE FUNCTION public.attach_content_to_courses('lecture');

DROP TRIGGER IF EXISTS lectures_detach_from_courses ON public.lectures;
CREATE TRIGGER lectures_detach_from_courses
  AFTER DELETE ON public.lectures
  FOR EACH ROW EXECUTE FUNCTION public.detach_content_from_courses('lecture');

DROP TRIGGER IF EXISTS quizzes_attach_to_courses ON public.quizzes;
CREATE TRIGGER quizzes_attach_to_courses
  AFTER INSERT OR UPDATE OF subject, topic_slug, published ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.attach_content_to_courses('quiz');

DROP TRIGGER IF EXISTS quizzes_detach_from_courses ON public.quizzes;
CREATE TRIGGER quizzes_detach_from_courses
  AFTER DELETE ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.detach_content_from_courses('quiz');

-- ── 5. The course itself ─────────────────────────────────────────────────
-- HRM must exist as a category before a course can reference it. On a fresh
-- database the first sync has not run yet, so this cannot assume it.
INSERT INTO public.course_categories (slug, label, description, display_order, is_published)
VALUES ('hrm', 'Human Resource Management',
        'Recruitment, compensation, SHRM, HR analytics, labour law', 0, true)
ON CONFLICT (slug) DO NOTHING;

-- Published and featured from the start: it is the course the home page
-- points at, and an empty course reads "the lessons are still being added"
-- rather than breaking — which is the truth on the day it ships.
INSERT INTO public.courses
  (slug, category_slug, topic_slug, title, summary, level, is_free, is_published, is_featured, display_order)
VALUES
  ('hr-planning', 'hrm', 'human-resource-planning', 'HR Planning',
   'Human resource planning end to end — forecasting demand and supply, job analysis, succession and career planning, and the HR plan itself. Notes, slide decks, lectures and MCQ practice, all free.',
   'beginner', true, true, true, 0)
ON CONFLICT (category_slug, topic_slug) DO UPDATE
  SET slug = excluded.slug,
      title = excluded.title,
      -- A summary written by hand outranks the seeded one, here as
      -- everywhere else in this catalog.
      summary = coalesce(public.courses.summary, excluded.summary),
      is_published = true,
      is_featured = true;

-- Whatever is already filed under the topic becomes its first lessons, so
-- the course is not empty on arrival if the material predates it.
INSERT INTO public.course_items (course_id, kind, ref_id, topic_slug, position)
SELECT co.id, c.kind, c.ref_id, c.topic_slug,
       row_number() OVER (
         ORDER BY CASE c.kind WHEN 'note' THEN 1 WHEN 'lecture' THEN 2 ELSE 3 END, c.created_at
       )
FROM (
  SELECT coalesce(subject, 'hrm') AS category_slug, topic_slug, 'note'::text AS kind, id AS ref_id, created_at
    FROM public.notes WHERE topic_slug = 'human-resource-planning'
  UNION ALL
  SELECT coalesce(subject, 'hrm'), topic_slug, 'lecture', id, created_at
    FROM public.lectures WHERE topic_slug = 'human-resource-planning'
  UNION ALL
  SELECT coalesce(subject, 'hrm'), topic_slug, 'quiz', id, created_at
    FROM public.quizzes WHERE topic_slug = 'human-resource-planning' AND published IS NOT FALSE
) c
JOIN public.courses co
  ON co.category_slug = c.category_slug AND co.topic_slug = c.topic_slug
ON CONFLICT (course_id, kind, ref_id) DO NOTHING;
