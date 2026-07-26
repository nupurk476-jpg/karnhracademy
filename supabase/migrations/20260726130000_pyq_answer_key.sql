-- Pairs a PYQ paper with its answer key as one entry instead of two
-- disconnected rows — the secure viewer gets a "Question Paper / Answer
-- Key" tab switcher when this is set. Stored in the same pyq-papers
-- bucket, so no new storage policies are needed.
ALTER TABLE public.pyq_papers ADD COLUMN IF NOT EXISTS answer_key_url TEXT;
