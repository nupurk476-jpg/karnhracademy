-- Seed catalogue for the freemium programmes.
--
-- Drafted from the programme list you described, because no
-- seed_programmes.sql was supplied. Read it before running it.
--
-- EVERY ROW IS is_active = false AND PRICED AT ZERO ON PURPOSE. Nothing here
-- appears on the public site until you set a real price and tick Published in
-- Admin → Programmes. A guessed price on a live page takes real money.
--
-- The GD & PI row is not created here: it already exists from the earlier
-- migration and has registrations pointing at it. This only fills in its new
-- catalogue fields, so it keeps its id and its batches.
--
-- Safe to re-run: every statement is idempotent on `slug`.

-- ── Existing row: fill in the new catalogue fields, keep everything else ──
UPDATE public.programmes SET
  short_description = 'GD and PI coaching for MBA and BBA admissions',
  category          = 'Admissions',
  sort_order        = 1
WHERE slug = 'gd-pi-preparation';

-- ── New rows ─────────────────────────────────────────────────────────────
INSERT INTO public.programmes
  (slug, title, short_description, long_description, includes, price_paise, mrp_paise, category, sort_order, is_active)
VALUES
  (
    'communication-skills',
    'Communication Skills Programme',
    'Spoken confidence and business communication for interviews and the workplace',
    'A practical programme covering spoken fluency, business writing, presentation structure and the register expected in professional settings. Built for students who understand the material but lose marks and offers in the delivery.',
    '["Weekly speaking practice with feedback", "Business email and report writing", "Presentation structure and delivery", "Group activities to build fluency", "Recordings for self-review"]'::jsonb,
    0, NULL, 'Skills', 2, false
  ),
  (
    'resume-and-cv-building',
    'Resume & CV Building',
    'A recruiter-ready CV, written with you rather than for you',
    'One-to-one sessions producing a CV that survives both an applicant tracking system and a thirty-second human skim. Covers structure, phrasing achievements in measurable terms, and tailoring one base CV to different roles.',
    '["One-to-one CV review session", "Rewritten, ATS-friendly structure", "Achievement phrasing that survives a skim", "LinkedIn profile alignment", "One revision round after your edits"]'::jsonb,
    0, NULL, 'Career', 3, false
  ),
  (
    'summer-internship-report',
    'Summer Internship Report Guidance',
    'Structure, method and formatting for a report that scores',
    'Guidance on turning an internship into a report that meets university expectations: framing objectives, choosing a method, presenting findings honestly, and formatting to your institution''s template. Guidance and review of your own work, not writing it for you.',
    '["Report structure and chapter planning", "Choosing and justifying a methodology", "Presenting data and findings", "Formatting to your university template", "Two review rounds on your drafts"]'::jsonb,
    0, NULL, 'Academic', 4, false
  ),
  (
    'ugc-net-code-55-pack',
    'UGC NET Code 55 — Complete Unit Pack',
    'Unit-wise notes and test series for Labour Welfare, Paper II',
    'The full Subject Code 55 syllabus as a single pack: unit-wise notes, PYQ-anchored MCQ sets, and a timed test series with score tracking. The free notes on this site stay free — this is the complete, downloadable, test-backed version.',
    '["Unit-wise notes for all 10 units", "Watermark-free PDF downloads", "PYQ-anchored MCQ sets per unit", "Timed test series with score tracking", "Progress dashboard"]'::jsonb,
    0, NULL, 'UGC NET', 5, false
  ),
  (
    'hr-interview-preparation',
    'HR Interview Preparation for MNC Roles',
    'Mock interviews and answer frameworks for corporate HR rounds',
    'Preparation for the HR round at MNC and corporate employers: the questions that actually recur, frameworks for structuring answers, and mock interviews with specific feedback. Preparation and practice — we do not promise or arrange placement.',
    '["Mock interviews with individual feedback", "Frameworks for common HR questions", "Competency and situational answering", "Salary and expectations conversations", "Session recordings for review"]'::jsonb,
    0, NULL, 'Career', 6, false
  )
ON CONFLICT (slug) DO NOTHING;
