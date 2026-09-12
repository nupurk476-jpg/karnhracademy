-- Turn off the three seed testimonials before launch.
--
-- 20260811100000_testimonials.sql inserted three rows whose quotes
-- literally begin "PLACEHOLDER —", attributed to named people with
-- fabricated credentials ("Priya, UGC NET Dec 2025 qualified"). The
-- column defaults `is_published` to true and the seed insert never
-- overrode it, so these have been rendering live on the homepage as if
-- they were real students.
--
-- Unpublish rather than delete: reversible, and it's the exact fallback
-- the seed migration's own comment offered ("replace... or delete these,
-- before launch"). There is still no admin screen for this table, so a
-- real replacement testimonial has to go in via the SQL editor for now.
UPDATE public.testimonials
SET is_published = false
WHERE quote LIKE 'PLACEHOLDER%';
