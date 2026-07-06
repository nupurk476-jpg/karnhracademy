-- ═══════════════════════════════════════════════════════════════════════════
-- NETAce AI — core schema
--
-- Designed for an AI-powered content ingestion pipeline:
--   • questions may arrive incomplete (nullable answers / explanations)
--   • every AI-derived field carries a confidence score
--   • nothing is published without human review (status workflow)
--   • full audit history + source provenance
--   • built to scale from 150 → 100,000+ questions (pgvector, FTS, trigram)
--
-- Apply to a FRESH Supabase project (Dashboard → SQL editor, or supabase db push).
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";
create extension if not exists "vector";
create extension if not exists "pg_trgm";

-- ── Enums ────────────────────────────────────────────────────────────────────

create type public.user_role as enum ('student', 'faculty', 'admin');

create type public.question_status as enum (
  'processing',      -- still being enriched by the pipeline
  'pending_review',  -- waiting in the faculty review queue
  'approved',        -- reviewed, content verified, not yet visible to students
  'published',       -- live for students
  'rejected',        -- reviewed and discarded
  'duplicate',       -- resolved as a duplicate of another question
  'archived'         -- unpublished / retired
);

create type public.question_type as enum (
  'mcq_single', 'mcq_multi', 'true_false', 'numeric', 'descriptive'
);

create type public.difficulty_level as enum ('easy', 'medium', 'hard');

create type public.job_status as enum (
  'pending', 'extracting', 'parsing', 'enriching', 'completed', 'failed', 'cancelled'
);

create type public.document_kind as enum ('questions', 'answer_key', 'mixed', 'unknown');

create type public.duplicate_status as enum ('open', 'dismissed', 'merged');

create type public.session_kind as enum ('practice', 'adaptive', 'mock', 'bookmarks');

create type public.session_status as enum ('active', 'completed', 'abandoned');

-- ── Profiles ─────────────────────────────────────────────────────────────────

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  role        public.user_role not null default 'student',
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- The very first account bootstraps as admin; everyone after is a student
-- until promoted from the Faculty portal (Users page).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role public.user_role;
begin
  if not exists (select 1 from public.profiles) then
    v_role := 'admin';
  else
    v_role := 'student';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    v_role
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role helpers used by RLS policies. SECURITY DEFINER so policies can read
-- profiles without recursive policy evaluation.
create or replace function public.current_user_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.current_user_role() in ('faculty', 'admin'), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

-- ── Syllabus taxonomy ────────────────────────────────────────────────────────

create table public.syllabus_units (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,           -- e.g. "U1"
  title       text not null,
  description text,
  order_index int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.topics (
  id          uuid primary key default gen_random_uuid(),
  unit_id     uuid not null references public.syllabus_units (id) on delete cascade,
  title       text not null,
  description text,
  order_index int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (unit_id, title)
);

create index topics_unit_idx on public.topics (unit_id, order_index);

-- ── Source documents & ingestion jobs ────────────────────────────────────────

create table public.documents (
  id                 uuid primary key default gen_random_uuid(),
  uploaded_by        uuid not null references public.profiles (id),
  storage_path       text not null,
  file_name          text not null,
  file_ext           text not null,
  mime_type          text,
  size_bytes         bigint not null default 0,
  sha256             text,                    -- content hash: re-upload detection
  page_count         int,
  kind               public.document_kind not null default 'unknown',
  -- when this file is an answer key for a previously uploaded question file:
  linked_document_id uuid references public.documents (id) on delete set null,
  extracted_text     text,
  needs_ocr          boolean not null default false,
  extraction_meta    jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);

create index documents_sha_idx on public.documents (sha256);
create index documents_uploader_idx on public.documents (uploaded_by, created_at desc);

create table public.ingestion_jobs (
  id                    uuid primary key default gen_random_uuid(),
  document_id           uuid not null references public.documents (id) on delete cascade,
  created_by            uuid not null references public.profiles (id),
  status                public.job_status not null default 'pending',
  stage_detail          text,
  progress              int not null default 0 check (progress between 0 and 100),
  questions_found       int not null default 0,
  questions_imported    int not null default 0,
  duplicates_found      int not null default 0,
  error                 text,
  -- resumable pipeline cursor + per-job options (e.g. default unit)
  config                jsonb not null default '{}'::jsonb,
  -- optimistic lock so concurrent process ticks don't double-run a stage
  lock_token            uuid,
  locked_at             timestamptz,
  started_at            timestamptz,
  finished_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index ingestion_jobs_status_idx on public.ingestion_jobs (status, created_at desc);
create index ingestion_jobs_document_idx on public.ingestion_jobs (document_id);

create table public.ingestion_events (
  id         bigint generated always as identity primary key,
  job_id     uuid not null references public.ingestion_jobs (id) on delete cascade,
  level      text not null default 'info' check (level in ('debug', 'info', 'warn', 'error')),
  message    text not null,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index ingestion_events_job_idx on public.ingestion_events (job_id, id);

-- ── Questions ────────────────────────────────────────────────────────────────
-- The heart of the system. Deliberately tolerant of incomplete data:
-- correct_options, answer_text and explanation are all nullable, and the
-- confidence jsonb records how sure the pipeline was about each field.

create table public.questions (
  id                 uuid primary key default gen_random_uuid(),
  status             public.question_status not null default 'processing',
  question_type      public.question_type not null default 'mcq_single',
  stem               text not null,
  -- [{ "key": "A", "text": "..." }, ...] — null when the source had no options
  options            jsonb,
  -- keys of correct option(s); NULL means "answer unknown / missing in source"
  correct_options    text[],
  -- free-form answer for numeric / descriptive questions
  answer_text        text,
  explanation        text,
  explanation_is_ai  boolean not null default false,

  unit_id            uuid references public.syllabus_units (id) on delete set null,
  topic_id           uuid references public.topics (id) on delete set null,
  difficulty         public.difficulty_level,
  keywords           text[] not null default '{}',

  -- per-field confidence, e.g. {"overall":0.82,"stem":0.95,"options":0.9,
  --   "answer":0.4,"explanation":0.7,"classification":0.65}
  confidence         jsonb not null default '{}'::jsonb,
  overall_confidence numeric(4,3),

  -- provenance
  document_id        uuid references public.documents (id) on delete set null,
  ingestion_job_id   uuid references public.ingestion_jobs (id) on delete set null,
  source_page        int,
  source_order       int,          -- question number / position in the source
  source_excerpt     text,         -- raw text the question was extracted from
  import_warnings    text[] not null default '{}',

  -- dedup + search
  normalized_hash    text,
  embedding          vector(1536),
  search_tsv         tsvector generated always as (
                       to_tsvector('english', coalesce(stem, '') || ' ' ||
                                   coalesce(explanation, ''))
                     ) stored,
  duplicate_of       uuid references public.questions (id) on delete set null,

  -- denormalized usage stats (maintained by trigger on attempts)
  times_answered     int not null default 0,
  times_correct      int not null default 0,

  created_by         uuid references public.profiles (id),
  reviewed_by        uuid references public.profiles (id),
  published_by       uuid references public.profiles (id),
  published_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index questions_status_idx     on public.questions (status, created_at desc);
create index questions_taxonomy_idx   on public.questions (unit_id, topic_id) where status = 'published';
create index questions_hash_idx       on public.questions (normalized_hash);
create index questions_job_idx        on public.questions (ingestion_job_id);
create index questions_search_idx     on public.questions using gin (search_tsv);
create index questions_keywords_idx   on public.questions using gin (keywords);
create index questions_stem_trgm_idx  on public.questions using gin (lower(stem) gin_trgm_ops);
-- HNSW scales to 100k+ vectors with fast approximate cosine search
create index questions_embedding_idx  on public.questions
  using hnsw (embedding vector_cosine_ops);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger questions_touch before update on public.questions
  for each row execute function public.touch_updated_at();
create trigger ingestion_jobs_touch before update on public.ingestion_jobs
  for each row execute function public.touch_updated_at();
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ── Audit history ────────────────────────────────────────────────────────────

create table public.question_revisions (
  id          bigint generated always as identity primary key,
  question_id uuid not null references public.questions (id) on delete cascade,
  actor_id    uuid references public.profiles (id),
  action      text not null,        -- imported | updated | approved | published | ...
  changes     jsonb not null default '{}'::jsonb,
  note        text,
  created_at  timestamptz not null default now()
);

create index question_revisions_q_idx on public.question_revisions (question_id, id desc);

-- ── Duplicate candidates ─────────────────────────────────────────────────────

create table public.question_duplicates (
  id           uuid primary key default gen_random_uuid(),
  question_id  uuid not null references public.questions (id) on delete cascade,
  duplicate_id uuid not null references public.questions (id) on delete cascade,
  similarity   numeric(4,3) not null,
  method       text not null check (method in ('hash', 'trigram', 'embedding')),
  status       public.duplicate_status not null default 'open',
  resolved_by  uuid references public.profiles (id),
  resolved_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (question_id, duplicate_id),
  check (question_id <> duplicate_id)
);

create index question_duplicates_open_idx on public.question_duplicates (status, created_at desc);

-- ── Student activity ─────────────────────────────────────────────────────────

create table public.practice_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  kind           public.session_kind not null default 'practice',
  status         public.session_status not null default 'active',
  unit_id        uuid references public.syllabus_units (id) on delete set null,
  topic_id       uuid references public.topics (id) on delete set null,
  question_ids   uuid[] not null default '{}',
  current_index  int not null default 0,
  total_answered int not null default 0,
  correct_count  int not null default 0,
  duration_sec   int,                 -- set for mock tests
  ends_at        timestamptz,         -- mock test deadline
  config         jsonb not null default '{}'::jsonb,
  started_at     timestamptz not null default now(),
  completed_at   timestamptz
);

create index practice_sessions_user_idx on public.practice_sessions (user_id, started_at desc);

create table public.attempts (
  id               bigint generated always as identity primary key,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  question_id      uuid not null references public.questions (id) on delete cascade,
  session_id       uuid references public.practice_sessions (id) on delete set null,
  selected_options text[],
  answer_text      text,
  is_correct       boolean,          -- null when the question has no known answer
  time_taken_ms    int,
  kind             public.session_kind not null default 'practice',
  created_at       timestamptz not null default now()
);

create index attempts_user_time_idx on public.attempts (user_id, created_at desc);
create index attempts_user_question_idx on public.attempts (user_id, question_id);
create index attempts_session_idx on public.attempts (session_id);

create table public.bookmarks (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);

-- Per-topic mastery rollup — powers weak-topic detection & adaptive practice.
create table public.user_topic_stats (
  user_id         uuid not null references public.profiles (id) on delete cascade,
  topic_id        uuid not null references public.topics (id) on delete cascade,
  attempts        int not null default 0,
  correct         int not null default 0,
  last_attempt_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

create or replace function public.record_attempt_stats()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_topic uuid;
begin
  select topic_id into v_topic from public.questions where id = new.question_id;

  update public.questions
     set times_answered = times_answered + 1,
         times_correct  = times_correct + case when new.is_correct then 1 else 0 end
   where id = new.question_id;

  if v_topic is not null then
    insert into public.user_topic_stats (user_id, topic_id, attempts, correct, last_attempt_at)
    values (new.user_id, v_topic, 1, case when new.is_correct then 1 else 0 end, now())
    on conflict (user_id, topic_id) do update
      set attempts        = user_topic_stats.attempts + 1,
          correct         = user_topic_stats.correct + case when new.is_correct then 1 else 0 end,
          last_attempt_at = now();
  end if;
  return new;
end;
$$;

create trigger attempts_stats after insert on public.attempts
  for each row execute function public.record_attempt_stats();

-- Cache for student-facing AI explanations on published questions that are
-- missing one. Never mutates the reviewed question row itself.
create table public.ai_explanation_cache (
  question_id uuid primary key references public.questions (id) on delete cascade,
  explanation text not null,
  model       text,
  created_at  timestamptz not null default now()
);

-- ── Pipeline & app RPCs ──────────────────────────────────────────────────────

-- Duplicate detection: exact hash → trigram → embedding cosine, best match per id.
create or replace function public.find_similar_questions(
  p_hash      text,
  p_stem      text,
  p_embedding vector(1536) default null,
  p_exclude   uuid default null,
  p_limit     int default 5
)
returns table (id uuid, stem text, status public.question_status, similarity numeric, method text)
language sql stable security definer set search_path = public
as $$
  with hash_hits as (
    select q.id, q.stem, q.status, 1.0::numeric as similarity, 'hash'::text as method
      from public.questions q
     where q.normalized_hash = p_hash
       and (p_exclude is null or q.id <> p_exclude)
       and q.status not in ('rejected', 'duplicate')
  ),
  trigram_hits as (
    select q.id, q.stem, q.status,
           round(similarity(lower(q.stem), lower(p_stem))::numeric, 3) as similarity,
           'trigram'::text as method
      from public.questions q
     where lower(q.stem) % lower(p_stem)
       and similarity(lower(q.stem), lower(p_stem)) >= 0.6
       and (p_exclude is null or q.id <> p_exclude)
       and q.status not in ('rejected', 'duplicate')
     order by similarity(lower(q.stem), lower(p_stem)) desc
     limit p_limit
  ),
  embedding_hits as (
    select q.id, q.stem, q.status,
           round((1 - (q.embedding <=> p_embedding))::numeric, 3) as similarity,
           'embedding'::text as method
      from public.questions q
     where p_embedding is not null
       and q.embedding is not null
       and (p_exclude is null or q.id <> p_exclude)
       and q.status not in ('rejected', 'duplicate')
       and (1 - (q.embedding <=> p_embedding)) >= 0.88
     order by q.embedding <=> p_embedding
     limit p_limit
  ),
  unioned as (
    select * from hash_hits
    union all select * from trigram_hits
    union all select * from embedding_hits
  )
  select distinct on (u.id) u.id, u.stem, u.status, u.similarity, u.method
    from unioned u
   -- SECURITY: exposes unpublished stems, so staff (or service role) only.
   where public.is_staff() or auth.role() = 'service_role'
   order by u.id, u.similarity desc
   limit p_limit;
$$;

-- Semantic search hook for future RAG — schema-ready, unused by the MVP UI.
create or replace function public.match_questions(
  query_embedding vector(1536),
  match_count     int default 10,
  min_similarity  numeric default 0.75
)
returns table (id uuid, stem text, similarity numeric)
language sql stable security definer set search_path = public
as $$
  select q.id, q.stem, round((1 - (q.embedding <=> query_embedding))::numeric, 3)
    from public.questions q
   where q.status = 'published' and q.embedding is not null
     and (1 - (q.embedding <=> query_embedding)) >= min_similarity
   order by q.embedding <=> query_embedding
   limit match_count;
$$;

-- Adaptive practice: sample published questions, weighting topics the user is
-- weak in (low accuracy) and questions they have not seen recently.
create or replace function public.pick_adaptive_questions(
  p_user  uuid,
  p_count int default 10
)
returns setof uuid
language sql stable security definer set search_path = public
as $$
  -- SECURITY: non-staff callers can only compute against their own history.
  with target as (
    select case when public.is_staff() then p_user else auth.uid() end as uid
  ),
  topic_weight as (
    select t.id as topic_id,
           case
             when s.attempts is null or s.attempts = 0 then 0.75          -- unexplored
             else greatest(0.15, 1.0 - (s.correct::numeric / s.attempts)) -- weak first
           end as weight
      from public.topics t
      left join public.user_topic_stats s
        on s.topic_id = t.id and s.user_id = (select uid from target)
  ),
  recent as (
    select question_id from public.attempts
     where user_id = (select uid from target)
     order by created_at desc
     limit 50
  ),
  candidates as (
    select q.id,
           coalesce(w.weight, 0.5) * (0.5 + random()) as score
      from public.questions q
      left join topic_weight w on w.topic_id = q.topic_id
     where q.status = 'published'
       and q.id not in (select question_id from recent)
  )
  select id from candidates order by score desc limit p_count;
$$;

-- Daily activity for the analytics trend chart.
create or replace function public.get_daily_activity(p_user uuid, p_days int default 14)
returns table (day date, total int, correct int)
language sql stable security definer set search_path = public
as $$
  -- SECURITY: non-staff callers can only read their own activity.
  select d::date as day,
         count(a.id)::int as total,
         count(a.id) filter (where a.is_correct)::int as correct
    from generate_series(current_date - (p_days - 1), current_date, '1 day') d
    left join public.attempts a
      on a.user_id = (case when public.is_staff() then p_user else auth.uid() end)
     and a.created_at::date = d::date
   group by d::date
   order by d::date;
$$;

-- ── Row Level Security ───────────────────────────────────────────────────────

alter table public.profiles            enable row level security;
alter table public.syllabus_units      enable row level security;
alter table public.topics              enable row level security;
alter table public.documents           enable row level security;
alter table public.ingestion_jobs      enable row level security;
alter table public.ingestion_events    enable row level security;
alter table public.questions           enable row level security;
alter table public.question_revisions  enable row level security;
alter table public.question_duplicates enable row level security;
alter table public.practice_sessions   enable row level security;
alter table public.attempts            enable row level security;
alter table public.bookmarks           enable row level security;
alter table public.user_topic_stats    enable row level security;
alter table public.ai_explanation_cache enable row level security;

-- profiles
create policy "read own profile"   on public.profiles for select using (id = auth.uid());
create policy "staff read profiles" on public.profiles for select using (public.is_staff());
create policy "update own profile" on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.current_user_role()); -- can't self-promote
create policy "admin update profiles" on public.profiles for update using (public.is_admin());

-- syllabus: everyone signed-in reads, staff writes
create policy "read units"  on public.syllabus_units for select using (auth.uid() is not null);
create policy "staff write units" on public.syllabus_units for all
  using (public.is_staff()) with check (public.is_staff());
create policy "read topics" on public.topics for select using (auth.uid() is not null);
create policy "staff write topics" on public.topics for all
  using (public.is_staff()) with check (public.is_staff());

-- ingestion surfaces: staff only (pipeline itself uses the service role)
create policy "staff documents" on public.documents for all
  using (public.is_staff()) with check (public.is_staff());
create policy "staff jobs" on public.ingestion_jobs for all
  using (public.is_staff()) with check (public.is_staff());
create policy "staff events" on public.ingestion_events for select using (public.is_staff());

-- questions: students see published; staff see & manage everything
create policy "students read published" on public.questions for select
  using (status = 'published' and auth.uid() is not null);
create policy "staff read questions"   on public.questions for select using (public.is_staff());
create policy "staff write questions"  on public.questions for insert with check (public.is_staff());
create policy "staff update questions" on public.questions for update
  using (public.is_staff()) with check (public.is_staff());
create policy "staff delete questions" on public.questions for delete using (public.is_staff());

create policy "staff revisions" on public.question_revisions for all
  using (public.is_staff()) with check (public.is_staff());
create policy "staff duplicates" on public.question_duplicates for all
  using (public.is_staff()) with check (public.is_staff());

-- student activity: owner-scoped
create policy "own sessions" on public.practice_sessions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own attempts" on public.attempts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own bookmarks" on public.bookmarks for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own topic stats" on public.user_topic_stats for select using (user_id = auth.uid());

create policy "read ai cache" on public.ai_explanation_cache for select
  using (auth.uid() is not null);

-- ── Storage ──────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit)
values ('ingestion', 'ingestion', false, 52428800)  -- 50 MB per file
on conflict (id) do nothing;

create policy "staff upload ingestion" on storage.objects for insert
  with check (bucket_id = 'ingestion' and public.is_staff());
create policy "staff read ingestion" on storage.objects for select
  using (bucket_id = 'ingestion' and public.is_staff());
create policy "staff delete ingestion" on storage.objects for delete
  using (bucket_id = 'ingestion' and public.is_staff());
