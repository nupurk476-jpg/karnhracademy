
INSERT INTO storage.buckets (id, name, public) VALUES ('educator', 'educator', true);

CREATE POLICY "Anyone can view educator images" ON storage.objects FOR SELECT USING (bucket_id = 'educator');
CREATE POLICY "Public upload educator dev" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'educator');
CREATE POLICY "Public update educator dev" ON storage.objects FOR UPDATE USING (bucket_id = 'educator');
CREATE POLICY "Public delete educator dev" ON storage.objects FOR DELETE USING (bucket_id = 'educator');
