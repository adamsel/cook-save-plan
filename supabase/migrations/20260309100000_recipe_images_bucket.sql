-- Create a public storage bucket for recipe images
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload recipe images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'recipe-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow anyone to view recipe images (public bucket)
CREATE POLICY "Anyone can view recipe images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'recipe-images');

-- Allow users to update/delete their own images
CREATE POLICY "Users can manage own recipe images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'recipe-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own recipe images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'recipe-images' AND (storage.foldername(name))[1] = auth.uid()::text);
