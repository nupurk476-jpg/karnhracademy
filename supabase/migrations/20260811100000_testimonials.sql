-- Homepage "Student Voices" testimonials — admin-managed, same gated
-- pattern as exam_info_cards (public SELECT, admin-only writes).

CREATE TABLE public.testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote TEXT NOT NULL,
  name TEXT NOT NULL,
  context TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read testimonials" ON public.testimonials FOR SELECT USING (true);
CREATE POLICY "Admin insert testimonials" ON public.testimonials FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin update testimonials" ON public.testimonials FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin delete testimonials" ON public.testimonials FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Placeholder seed rows — replace with real student testimonials via
-- Admin, or delete these, before launch.
INSERT INTO public.testimonials (quote, name, context, display_order) VALUES
  ('PLACEHOLDER — The unit-wise notes made revising Subject Code 55 so much easier. I could finally see the whole syllabus laid out clearly.', 'Priya', 'UGC NET Dec 2025 qualified', 1),
  ('PLACEHOLDER — The MCQ sets after every topic helped me spot my weak areas early instead of finding out on exam day.', 'Rohit', 'MBA, Delhi', 2),
  ('PLACEHOLDER — Free, well-organised, and actually aligned to the syllabus — exactly what I needed while preparing part-time.', 'Ananya', 'UGC NET/JRF aspirant', 3);
