
-- Create newspaper_highlights table
CREATE TABLE public.newspaper_highlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.newspaper_highlights ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Anyone can read highlights" ON public.newspaper_highlights FOR SELECT USING (true);
CREATE POLICY "Public insert highlights dev" ON public.newspaper_highlights FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update highlights dev" ON public.newspaper_highlights FOR UPDATE USING (true);
CREATE POLICY "Public delete highlights dev" ON public.newspaper_highlights FOR DELETE USING (true);

-- Storage bucket for highlight images
INSERT INTO storage.buckets (id, name, public) VALUES ('newspaper-highlights', 'newspaper-highlights', true);

CREATE POLICY "Anyone can read highlight images" ON storage.objects FOR SELECT USING (bucket_id = 'newspaper-highlights');
CREATE POLICY "Public upload highlight images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'newspaper-highlights');
CREATE POLICY "Public delete highlight images" ON storage.objects FOR DELETE USING (bucket_id = 'newspaper-highlights');
