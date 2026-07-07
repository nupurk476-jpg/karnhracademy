# NETAce AI

AI-powered exam preparation SaaS with two portals:

- **Student Portal** — adaptive practice, timed mock tests, bookmarks, full-text search,
  analytics with weak-topic detection, and on-demand AI explanations. Mobile-first.
- **Faculty Portal** — an **AI content-ingestion system** (the core of the product):
  upload messy PDFs / DOCX / CSV / XLSX / TXT / images / scans, and the pipeline extracts,
  OCRs, splits, scores and classifies every question — then routes **everything** through a
  human review queue. Nothing is published automatically.

Built with **Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase
(Postgres + Auth + Storage + pgvector)**. Deploys on Vercel.

---

## How the ingestion pipeline works

```
Upload ──► Extract text ──► OCR (vision LLM, if scanned) ──► Structure detection
      (unpdf/mammoth/exceljs)                                (heuristics + LLM)
                                                                    │
Review Queue ◄── Enrich: classify topic · difficulty · keywords ◄───┘
 (faculty)        embeddings (pgvector) · duplicate detection
                  AI draft explanations (flagged, never silent)
```

Key properties:

- **Never invents data.** Missing answers/explanations stay `NULL` with per-field
  confidence scores stored in `questions.confidence`. Answers referencing nonexistent
  options are cleared and flagged, not guessed.
- **Handles messy input**: questions-only files, inline answers, trailing answer-key
  sections (`Answer Key: 1.B 2.C …`), separate answer-key documents (linked at upload,
  matched by question number), OCR noise, duplicates, inconsistent numbering.
- **Duplicate detection** at three levels: exact normalized hash → trigram similarity
  (`pg_trgm`) → embedding cosine similarity (pgvector HNSW). Faculty resolves pairs in
  the Duplicate Manager (merge keeps the older question and fills its gaps).
- **Resumable + serverless-safe.** Jobs advance one bounded step per request
  (`POST /api/ingestion/jobs/:id/process`) with an optimistic lock, so long imports never
  hit function timeouts and survive refreshes/retries.
- **Full audit trail**: `question_revisions` records import, edits, approvals, publishes
  and merges; `ingestion_events` records the pipeline log per upload.

## Swappable AI layer

`src/lib/ai/` defines a provider-agnostic interface (`complete`, structured JSON with
zod-validated self-repair, vision input, embeddings). Adapters: **Anthropic, OpenAI,
Gemini** — selected by `AI_PROVIDER`, no business-logic changes needed. Embeddings are
optional (`EMBEDDING_PROVIDER=openai|gemini|none`); without them the pipeline degrades
gracefully (hash + trigram dedup still work). The `questions.embedding` column and
`match_questions()` RPC are ready for future RAG / semantic search.

## Getting started

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/migrations/20260706000001_netace_schema.sql` in the SQL editor
   (or `supabase db push`). This creates the schema, RLS policies, RPCs and the
   private `ingestion` storage bucket.
3. Optionally run `supabase/seed.sql` for a starter syllabus.
4. **The first account to sign up becomes admin automatically.** Promote further
   faculty from *Faculty → Users*, or via SQL:
   `update profiles set role = 'faculty' where email = '...';`

### 2. Environment

```bash
cp .env.example .env.local   # then fill in values
```

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; powers the ingestion pipeline |
| `AI_PROVIDER` | `anthropic` (default) \| `openai` \| `gemini` |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GOOGLE_AI_API_KEY` | Provider key(s) |
| `AI_MODEL` | Optional model override |
| `EMBEDDING_PROVIDER` / `EMBEDDING_MODEL` | Optional; enables semantic dedup |
| `NEXT_PUBLIC_APP_URL` | Used in auth email redirects |

### 3. Run

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests (parser, dedup, AI JSON layer)
npm run lint
npm run typecheck
```

### 4. Deploy to Vercel

Import the repo, set the environment variables above, deploy. Route handlers declare
`maxDuration = 60` for pipeline steps. In Supabase → Auth → URL Configuration, set your
site URL so confirmation emails redirect correctly.

## Project structure

```
src/
  app/
    (auth)/               login, register
    (student)/            dashboard, practice, tests, bookmarks, search, analytics
    (faculty)/faculty/    overview, upload, processing, review(+editor),
                          duplicates, imports, users, syllabus
    api/                  ingestion process/retry ticks, AI explanations
  components/             ui (shadcn), shell, shared, feature components
  lib/
    ai/                   provider-agnostic AI layer (+ adapters, JSON repair)
    ingestion/            extract → ocr → heuristics → llm-extract → enrich → pipeline
    actions/              server actions (auth, upload, review, practice, admin)
    supabase/             browser / server / admin clients, middleware helper
supabase/
  migrations/             full schema (pgvector, FTS, RLS, RPCs, triggers)
  seed.sql                starter syllabus
```

## Security model

- **Roles**: `student` / `faculty` / `admin` on `profiles`; the first signup
  bootstraps as admin (serialized with an advisory lock). RLS gates every table.
- **Server-only grading**: students have SELECT-only access to `attempts` and
  `practice_sessions`. All grading, session and counter writes go through
  server actions using the service role, so scores, timers and the usage stats
  that feed analytics cannot be forged from the browser.
- **Mock-test integrity**: answers/explanations are stripped from active-test
  payloads, `submitAnswer` returns no feedback for mocks, results pages are
  unreachable while time remains, and attempts are unique per (session,
  question). Known limitation: columns of *published* questions (which
  practice mode reveals after answering anyway) are readable through the API
  by signed-in users; column-level views are the planned hardening if
  high-stakes exams are ever run on this platform.
- **Pipeline safety**: optimistic lock with token-guarded writes, idempotent
  chunk processing, per-job tick ceiling, and bounded AI-call timeouts sized
  to the serverless execution window.

## Scale notes

Designed for 150 → 100,000+ questions: HNSW vector index, GIN FTS + trigram indexes,
keyset-friendly status indexes, denormalized per-question stats maintained by trigger,
and paginated faculty queues. Heavy work (LLM calls) is chunked per request and
resumable, so import size is unbounded.
