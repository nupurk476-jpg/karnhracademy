
CREATE TABLE public.lectures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  topic_slug TEXT,
  subject TEXT DEFAULT 'hrm',
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.lectures TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lectures TO authenticated;
GRANT ALL ON public.lectures TO service_role;

ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read lectures" ON public.lectures FOR SELECT TO public USING (true);
CREATE POLICY "Admin insert lectures" ON public.lectures FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin update lectures" ON public.lectures FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin delete lectures" ON public.lectures FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage policies for lectures bucket
CREATE POLICY "Public read lectures bucket" ON storage.objects FOR SELECT TO public USING (bucket_id = 'lectures');
CREATE POLICY "Admin upload lectures bucket" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'lectures' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin update lectures bucket" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'lectures' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin delete lectures bucket" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'lectures' AND has_role(auth.uid(), 'admin'::app_role));
