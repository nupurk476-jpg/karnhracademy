
-- Create storage bucket for quiz file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('quiz-uploads', 'quiz-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to quiz-uploads
CREATE POLICY "Authenticated users can upload quiz files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'quiz-uploads');

-- Allow public read access for AI processing
CREATE POLICY "Public read quiz uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'quiz-uploads');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete quiz files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'quiz-uploads');
