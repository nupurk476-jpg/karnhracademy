-- hr_resources was a per-topic-page notes system that predated the "notes"
-- table gaining a subject/topic_slug column. All app code was migrated to
-- read/write through the shared "notes" table; nothing references
-- hr_resources or the hr-resources storage bucket anymore.
DROP TABLE IF EXISTS public.hr_resources CASCADE;

-- NOTE: this migration originally also deleted the orphaned hr-resources and
-- quiz-uploads rows from storage.objects/storage.buckets, but Supabase's
-- storage.protect_delete() trigger forbids direct SQL deletes on storage
-- tables ("Use the Storage API instead"), which made this migration fail and
-- blocked the GitHub auto-deploy pipeline for every migration after it. The
-- empty buckets are harmless; remove them via the dashboard's Storage UI if
-- desired. The attempt below is kept but made non-fatal for older projects
-- where direct deletes are still permitted.
DO $$
BEGIN
  DELETE FROM storage.objects WHERE bucket_id IN ('hr-resources', 'quiz-uploads');
  DELETE FROM storage.buckets WHERE id IN ('hr-resources', 'quiz-uploads');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping storage cleanup (%): remove hr-resources/quiz-uploads buckets via Storage UI instead', SQLERRM;
END $$;
