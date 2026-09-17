-- Courses: a browsable catalog assembled from the notes, MCQs and lectures
-- that already exist, rather than a second copy of them.
--
-- Three ideas hold this together:
--
--  1. A course ITEM POINTS AT existing content (kind + ref_id); it never
--     copies it. Edit a note once and every course carrying it updates.
--     The alternative -- lesson rows holding their own title and file --
--     means maintaining the same material in two places forever.
--
--  2. THE CATEGORY LIST LIVES HERE, not only in src/lib/disciplines.ts, so
--     adding a subject (Economics, say) is a row, not a deploy. What stays
--     in code is the icon and the colour palette, which cannot move: an
--     icon is a React component, and Tailwind purges any class it cannot
--     literally see in the source, so a colour string read from Postgres
--     renders as nothing. See src/lib/courseCategoryStyle.ts, which keys
--     styling off the slug and falls back to a neutral default -- a brand
--     new category looks deliberate on day one and gets its own palette
--     whenever someone gets round to it.
--
--  3. Courses are FREE FOR NOW but priced later, so the columns that
--     pricing needs exist from the start with free defaults. Adding a
--     price later is an UPDATE, not a migration against live data.

-- ── Categories (the catalog sidebar) ─────────────────────────────────────
CREATE TABLE public.course_categories (
  -- The slug IS the join key, and it is deliberately the same value that
  -- notes.subject / quizzes.subject / lectures.subject already carry
  -- ('hrm', 'ob', 'mba-eco', ...). One vocabulary across the whole site.
  slug TEXT NOT NULL PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT course_categories_slug_shape CHECK (slug ~ '^[a-z0-9-]{1,64}$')
);

ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads published categories" ON public.course_categories
  FOR SELECT USING (is_published);
CREATE POLICY "Admins read all categories" ON public.course_categories
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write categories" ON public.course_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── Courses ──────────────────────────────────────────────────────────────
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  category_slug TEXT NOT NULL REFERENCES public.course_categories(slug) ON UPDATE CASCADE,
  -- The topic this course was built from. Kept so the sync can find its own
  -- rows again, and so a course can link back to the topic page that
  -- carries the same material.
  topic_slug TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  -- Optional. Left NULL, the card draws the generated gradient cover from
  -- src/lib/subjectGradients.ts, which is why this catalog has no
  -- photographic payload to optimise in the first place.
  cover_url TEXT,
  level TEXT CHECK (level IS NULL OR level IN ('beginner', 'intermediate', 'advanced')),
  -- Free today. The catalog shows a "Free" badge off is_free, so switching
  -- a course to paid later is one UPDATE and the UI follows.
  is_free BOOLEAN NOT NULL DEFAULT true,
  price_paise INTEGER NOT NULL DEFAULT 0 CHECK (price_paise >= 0),
  -- Sync creates courses unpublished: a generated course is a draft until
  -- someone has looked at it. Nothing reaches students unreviewed.
  is_published BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- One course per (category, topic) so the sync is idempotent: running it
  -- twice updates the same row instead of growing a duplicate catalog.
  CONSTRAINT courses_category_topic_uniq UNIQUE (category_slug, topic_slug)
);

CREATE INDEX courses_category_idx ON public.courses (category_slug, display_order);
CREATE INDEX courses_published_idx ON public.courses (is_published) WHERE is_published;

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads published courses" ON public.courses
  FOR SELECT USING (is_published);
CREATE POLICY "Admins read all courses" ON public.courses
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write courses" ON public.courses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── Course items (the lessons) ───────────────────────────────────────────
-- A pointer, never a copy. No FK: the three targets live in three tables,
-- so referential integrity is kept by the sync, which drops items whose
-- target has gone.
CREATE TABLE public.course_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('note', 'quiz', 'lecture')),
  ref_id UUID NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- The same note cannot be added to one course twice, however many times
  -- a sync runs.
  CONSTRAINT course_items_unique UNIQUE (course_id, kind, ref_id)
);

CREATE INDEX course_items_course_idx ON public.course_items (course_id, position);

ALTER TABLE public.course_items ENABLE ROW LEVEL SECURITY;

-- Items are readable exactly when their course is: no separate answer to
-- "can I see this?", so an unpublished draft cannot leak its contents.
CREATE POLICY "Read items of readable courses" ON public.course_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.is_published)
  );
CREATE POLICY "Admins read all items" ON public.course_items
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write items" ON public.course_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── The catalog grid, in one round trip ──────────────────────────────────
-- Counts computed here rather than per card: six cards asking for their own
-- lesson/MCQ/lecture counts is eighteen requests for one screen.
--
-- security_invoker so the view enforces the caller's RLS rather than the
-- owner's -- without it an anonymous visitor would read unpublished drafts
-- through the view that the base table denies them directly.
CREATE VIEW public.course_cards WITH (security_invoker = true) AS
SELECT
  c.id, c.slug, c.category_slug, c.topic_slug, c.title, c.summary,
  c.cover_url, c.level, c.is_free, c.price_paise, c.is_published,
  c.display_order, c.created_at,
  cat.label AS category_label,
  cat.display_order AS category_order,
  coalesce(i.total, 0)    AS lesson_count,
  coalesce(i.notes, 0)    AS note_count,
  coalesce(i.quizzes, 0)  AS quiz_count,
  coalesce(i.lectures, 0) AS lecture_count
FROM public.courses c
JOIN public.course_categories cat ON cat.slug = c.category_slug
LEFT JOIN (
  SELECT course_id,
         count(*)                                AS total,
         count(*) FILTER (WHERE kind = 'note')    AS notes,
         count(*) FILTER (WHERE kind = 'quiz')    AS quizzes,
         count(*) FILTER (WHERE kind = 'lecture') AS lectures
  FROM public.course_items
  GROUP BY course_id
) i ON i.course_id = c.id;

GRANT SELECT ON public.course_cards TO anon, authenticated;

-- ── Build the catalog from content that already exists ───────────────────
-- Takes the category and topic labels from the caller, because
-- src/lib/disciplines.ts is their single source of truth and duplicating
-- them into Postgres would create a second one that silently drifts.
--
-- Idempotent by design. Editorial fields (title, summary, cover, level,
-- pricing, published, order) are set on INSERT and never overwritten
-- afterwards, so a rename or a hand-written summary survives every later
-- run. Only the item lists are reconciled.
CREATE OR REPLACE FUNCTION public.sync_courses_from_content(
  _categories JSONB DEFAULT '{}'::jsonb,  -- { "hrm": {"label": ..., "description": ..., "order": 0}, ... }
  _topics JSONB DEFAULT '{}'::jsonb       -- { "motivation": "Motivation", ... }
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

  -- 1. Categories named by the caller. DO NOTHING on conflict: a category
  --    renamed in the admin screen, or added straight to the table, is not
  --    reverted by the next sync.
  INSERT INTO public.course_categories (slug, label, description, display_order)
  SELECT key,
         coalesce(value->>'label', key),
         value->>'description',
         coalesce((value->>'order')::int, 0)
  FROM jsonb_each(_categories)
  WHERE key ~ '^[a-z0-9-]{1,64}$'
  ON CONFLICT (slug) DO NOTHING;
  GET DIAGNOSTICS cats_added = ROW_COUNT;

  -- 2. Every (subject, topic) pair that actually has content. Legacy notes
  --    predate the subject column and are NULL; the site has always read
  --    those as HRM (see NotesPage), so they are counted the same way here
  --    rather than vanishing from the catalog.
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

  -- Content pointing at a category nobody declared would violate the FK and
  -- abort the whole sync. Take it as the discovery it is and register the
  -- category, unpublished so it cannot appear in the sidebar unreviewed.
  INSERT INTO public.course_categories (slug, label, is_published)
  SELECT DISTINCT c.category_slug, c.category_slug, false
  FROM _content c
  WHERE c.category_slug ~ '^[a-z0-9-]{1,64}$'
  ON CONFLICT (slug) DO NOTHING;

  -- 3. One draft course per (category, topic) that has content.
  INSERT INTO public.courses (slug, category_slug, topic_slug, title)
  SELECT DISTINCT
    c.category_slug || '-' || c.topic_slug,
    c.category_slug,
    c.topic_slug,
    -- The caller's label, else a readable fallback built from the slug, so
    -- a topic added to the data before it is added to disciplines.ts still
    -- reads as words rather than as a slug.
    coalesce(_topics->>c.topic_slug, initcap(replace(c.topic_slug, '-', ' ')))
  FROM _content c
  WHERE c.category_slug ~ '^[a-z0-9-]{1,64}$'
  ON CONFLICT (category_slug, topic_slug) DO NOTHING;
  GET DIAGNOSTICS courses_added = ROW_COUNT;

  -- 4. Reconcile the items. Notes first, then lectures, then MCQs -- read
  --    it, watch it, test yourself on it -- and oldest first within each,
  --    which is the order the material was written in.
  INSERT INTO public.course_items (course_id, kind, ref_id, position)
  SELECT co.id, c.kind, c.ref_id,
         row_number() OVER (
           PARTITION BY co.id
           ORDER BY CASE c.kind WHEN 'note' THEN 1 WHEN 'lecture' THEN 2 ELSE 3 END,
                    c.created_at
         )
  FROM _content c
  JOIN public.courses co
    ON co.category_slug = c.category_slug AND co.topic_slug = c.topic_slug
  ON CONFLICT (course_id, kind, ref_id) DO NOTHING;
  GET DIAGNOSTICS items_added = ROW_COUNT;

  -- Items whose target was deleted or re-filed under another topic. Without
  -- this a card would keep advertising lessons that 404.
  DELETE FROM public.course_items ci
  USING public.courses co
  WHERE ci.course_id = co.id
    AND NOT EXISTS (
      SELECT 1 FROM _content c
      WHERE c.category_slug = co.category_slug
        AND c.topic_slug = co.topic_slug
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
