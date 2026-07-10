-- UGC NET Labour Welfare hub: tags on notes, and a new Previous Year
-- Questions (PYQ) content type. Follows the same admin-gated pattern
-- already used for notes/quizzes (public SELECT, admin-only writes via
-- has_role) rather than the old "dev" open-write policies.

ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE public.pyq_papers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL DEFAULT 'lw',
  year INTEGER NOT NULL,
  title TEXT NOT NULL,
  file_url TEXT,
  unit_tags INTEGER[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pyq_papers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pyq papers" ON public.pyq_papers FOR SELECT USING (true);
CREATE POLICY "Admin insert pyq papers" ON public.pyq_papers FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin update pyq papers" ON public.pyq_papers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin delete pyq papers" ON public.pyq_papers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Anonymous visitors can't UPDATE pyq_papers directly (admin-only policy
-- above), so view counting goes through a narrow SECURITY DEFINER function
-- that can only increment — same pattern as increment_note_views.
CREATE OR REPLACE FUNCTION public.increment_pyq_views(_pyq_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.pyq_papers SET view_count = view_count + 1 WHERE id = _pyq_id;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_pyq_views(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_pyq_views(uuid) TO anon, authenticated;

-- Storage bucket for PYQ PDFs.
INSERT INTO storage.buckets (id, name, public) VALUES ('pyq-papers', 'pyq-papers', true);

CREATE POLICY "Anyone can read pyq files" ON storage.objects FOR SELECT USING (bucket_id = 'pyq-papers');
CREATE POLICY "Admins can upload pyq files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pyq-papers' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update pyq files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'pyq-papers' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'pyq-papers' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete pyq files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'pyq-papers' AND public.has_role(auth.uid(), 'admin'::app_role));
