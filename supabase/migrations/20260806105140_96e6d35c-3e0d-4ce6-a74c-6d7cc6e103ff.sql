-- Public-read buckets: admin-only writes AND images only, so no sensitive
-- non-image file can ever be stashed in a publicly downloadable bucket.
DROP POLICY IF EXISTS "Admins upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Home assets: admin insert" ON storage.objects;
DROP POLICY IF EXISTS "Admins update product images" ON storage.objects;
DROP POLICY IF EXISTS "Home assets: admin update" ON storage.objects;

CREATE POLICY "Admins upload product images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.has_role(auth.uid(), 'admin')
    AND COALESCE(metadata->>'mimetype', 'image/png') LIKE 'image/%'
  );

CREATE POLICY "Home assets: admin insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'home-assets'
    AND public.has_role(auth.uid(), 'admin')
    AND COALESCE(metadata->>'mimetype', 'image/png') LIKE 'image/%'
  );

CREATE POLICY "Admins update product images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.has_role(auth.uid(), 'admin')
    AND COALESCE(metadata->>'mimetype', 'image/png') LIKE 'image/%'
  );

CREATE POLICY "Home assets: admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'home-assets' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (
    bucket_id = 'home-assets'
    AND public.has_role(auth.uid(), 'admin')
    AND COALESCE(metadata->>'mimetype', 'image/png') LIKE 'image/%'
  );