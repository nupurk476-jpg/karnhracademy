ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS video_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('note-videos', 'note-videos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view note videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'note-videos');

CREATE POLICY "Admins can upload note videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'note-videos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update note videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'note-videos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete note videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'note-videos' AND public.has_role(auth.uid(), 'admin'::app_role));