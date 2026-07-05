-- hr_resources was a per-topic-page notes system that predated the "notes"
-- table gaining a subject/topic_slug column. All app code was migrated to
-- read/write through the shared "notes" table; nothing references
-- hr_resources or the hr-resources storage bucket anymore.
DROP TABLE IF EXISTS public.hr_resources CASCADE;

DELETE FROM storage.objects WHERE bucket_id = 'hr-resources';
DELETE FROM storage.buckets WHERE id = 'hr-resources';

-- quiz-uploads backed the AI "generate quiz from PDF/paste text" feature,
-- which depended on a Lovable-only edge function that no longer exists.
-- The upload/paste-text buttons were removed from Admin > Quizzes.
DELETE FROM storage.objects WHERE bucket_id = 'quiz-uploads';
DELETE FROM storage.buckets WHERE id = 'quiz-uploads';
