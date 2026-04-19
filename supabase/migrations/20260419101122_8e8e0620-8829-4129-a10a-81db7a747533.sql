DROP POLICY IF EXISTS "Public read attachments bucket" ON storage.objects;

CREATE POLICY "Public read attachments scoped"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'attachments'
  AND (
    (storage.foldername(name))[1] = 'deadlines'
    OR (storage.foldername(name))[1] = 'library'
  )
);