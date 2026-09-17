-- Count a unit-based subject's modules as UNITS, not as topics.
--
-- Labour Welfare came out as "55 modules · 161 lessons". That is a
-- syllabus, not a course: nobody scans 55 modules. Its syllabus has ten
-- units, each holding several topics, and the same is true of the two
-- Economics subjects. For those three the module is the unit; for the
-- other seven, whose topics are flat, the module stays the topic.
--
-- The unit is already recoverable from the topic slug: every unit-based
-- topic is prefixed "u<unit>-" precisely so that the topic_slug column
-- alone identifies its unit (see the note at the top of
-- src/lib/labourWelfareUnits.ts, and getUnitForTopicSlug beside it). This
-- reuses that convention rather than inventing a second source of truth
-- that could drift from it -- and it means no new column, no re-sync, and
-- nothing for the admin screen to send.
CREATE OR REPLACE FUNCTION public.course_module_key(_topic_slug TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  -- 'u3-industrial-disputes' → 'u3'   (a unit-based subject)
  -- 'compensation-and-benefits' → itself   (a flat subject)
  SELECT coalesce(substring(_topic_slug from '^u[0-9]+'), _topic_slug);
$$;

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
  -- Kept alongside it: the topic count is still the honest measure of how
  -- much of a syllabus is covered, and a ten-module course built from 55
  -- topics is a different thing from one built from twelve.
  coalesce(i.topics, 0)   AS topic_count
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
