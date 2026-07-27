-- Compact "Exam Essentials" info cards for the Labour Welfare hub —
-- syllabus, upcoming exam notifications, cut-offs, eligibility, exam
-- pattern, etc. Each card links out (internal path or external URL) or
-- carries an uploaded PDF. Admin-managed, same gated pattern as the
-- other content tables (public SELECT, admin-only writes via has_role).

CREATE TABLE public.exam_info_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  link_url TEXT,
  file_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_info_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read exam info cards" ON public.exam_info_cards FOR SELECT USING (true);
CREATE POLICY "Admin insert exam info cards" ON public.exam_info_cards FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin update exam info cards" ON public.exam_info_cards FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin delete exam info cards" ON public.exam_info_cards FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Public bucket: these are official NTA documents (syllabus PDFs, exam
-- notifications) meant for free, ungated distribution — unlike notes/PYQs
-- there is nothing to protect, so permanent public URLs are fine.
INSERT INTO storage.buckets (id, name, public) VALUES ('exam-info', 'exam-info', true);

CREATE POLICY "Anyone can read exam info files" ON storage.objects FOR SELECT USING (bucket_id = 'exam-info');
CREATE POLICY "Admins can upload exam info files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'exam-info' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update exam info files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'exam-info' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'exam-info' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete exam info files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'exam-info' AND public.has_role(auth.uid(), 'admin'::app_role));
