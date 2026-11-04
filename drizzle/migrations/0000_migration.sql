ALTER TABLE public.items
  ADD COLUMN job_document_path text,
  ADD COLUMN job_document_name text,
  ADD COLUMN job_document_type text;

COMMENT ON COLUMN public.items.job_document_path IS 'Storage object path of the single attached document in the private job-documents bucket (null = no document)';
COMMENT ON COLUMN public.items.job_document_name IS 'Original file name of the attached document, shown in the UI';
COMMENT ON COLUMN public.items.job_document_type IS 'MIME type of the attached document';

-- Owner-only access to the private job-documents bucket.
-- Objects are stored under {user_id}/{item_id}/<filename> so foldername[1] is the owner id.
CREATE POLICY "Users read own job documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'job-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own job documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'job-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users replace own job documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'job-documents' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'job-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own job documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'job-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
