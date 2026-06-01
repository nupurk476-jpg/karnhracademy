-- Drop overly permissive public write policies on storage.objects
DROP POLICY IF EXISTS "Public upload blog images dev" ON storage.objects;
DROP POLICY IF EXISTS "Public update blog images dev" ON storage.objects;
DROP POLICY IF EXISTS "Public delete blog images dev" ON storage.objects;
DROP POLICY IF EXISTS "Public upload educator dev" ON storage.objects;
DROP POLICY IF EXISTS "Public update educator dev" ON storage.objects;
DROP POLICY IF EXISTS "Public delete educator dev" ON storage.objects;
DROP POLICY IF EXISTS "Public upload highlight images" ON storage.objects;
DROP POLICY IF EXISTS "Public delete highlight images" ON storage.objects;
DROP POLICY IF EXISTS "Public upload note files dev" ON storage.objects;
DROP POLICY IF EXISTS "Public delete note files dev" ON storage.objects;
DROP POLICY IF EXISTS "Admin can upload hr resource files" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete hr resource files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload quiz files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete quiz files" ON storage.objects;

-- Admin-only write for blog-images
CREATE POLICY "Admins can upload blog images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update blog images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete blog images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Admin-only write for educator
CREATE POLICY "Admins can upload educator" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'educator' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update educator" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'educator' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete educator" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'educator' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Admin-only write for newspaper-highlights
CREATE POLICY "Admins can upload highlight images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'newspaper-highlights' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete highlight images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'newspaper-highlights' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Admin-only write for notes
CREATE POLICY "Admins can upload note files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'notes' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete note files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'notes' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Admin-only write for hr-resources
CREATE POLICY "Admins can upload hr resources" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hr-resources' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete hr resources" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'hr-resources' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Admin-only write for quiz-uploads
CREATE POLICY "Admins can upload quiz files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'quiz-uploads' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete quiz files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'quiz-uploads' AND public.has_role(auth.uid(), 'admin'::app_role));