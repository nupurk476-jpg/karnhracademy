
ALTER TABLE public.blog_posts ADD COLUMN cover_image text;

INSERT INTO storage.buckets (id, name, public) VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read blog images" ON storage.objects FOR SELECT USING (bucket_id = 'blog-images');
CREATE POLICY "Public upload blog images dev" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'blog-images');
CREATE POLICY "Public update blog images dev" ON storage.objects FOR UPDATE USING (bucket_id = 'blog-images');
CREATE POLICY "Public delete blog images dev" ON storage.objects FOR DELETE USING (bucket_id = 'blog-images');
