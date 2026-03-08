CREATE TABLE public.hr_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_slug text NOT NULL,
  title text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'pdf',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read hr resources"
  ON public.hr_resources FOR SELECT
  USING (true);

CREATE POLICY "Admin insert hr resources"
  ON public.hr_resources FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin delete hr resources"
  ON public.hr_resources FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Create storage bucket for HR files
INSERT INTO storage.buckets (id, name, public) VALUES ('hr-resources', 'hr-resources', true);

CREATE POLICY "Anyone can read hr resource files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hr-resources');

CREATE POLICY "Admin can upload hr resource files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'hr-resources');

CREATE POLICY "Admin can delete hr resource files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'hr-resources');