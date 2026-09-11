import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { track, EVENTS } from "@/lib/analytics";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { DISCIPLINES, getDiscipline } from "@/lib/disciplines";
import { tidyTitle, timeAgo } from "@/lib/format";
import { SocialIconRow } from "@/components/SocialIcons";
import { LIVE_CHANNELS, CONTACT_EMAIL } from "@/lib/socialLinks";
import { normalizeYouTubeThumbnail } from "@/lib/youtube";
import { useHoneypot } from "@/hooks/use-honeypot";
import { useSubjectCounts } from "@/hooks/use-subject-counts";
import SubjectCard from "@/components/SubjectCard";
import {
  ArrowRight, BookOpen,
  Video, HelpCircle, FileText,
  CheckCircle2, ChevronRight, Clock, Award,
  PlayCircle, BookMarked, Search,
  Mail, HandHeart, ScrollText, Linkedin,
  BadgeCheck, Network, RefreshCw, Smartphone, GraduationCap, History,
} from "lucide-react";

// ─────────────── Brand tokens ────────────────────────────────────────────────
// Sourced from the single palette in src/lib/brand.ts (the same values
// Tailwind's brand-* classes resolve to) — these local aliases only keep
// this page's many inline styles terse.
import { BRAND } from "@/lib/brand";
const NAVY = BRAND.navy;
const NAVY_DARK = BRAND.navyDeep;
const STEEL = BRAND.steel;
const STEEL_DARK = BRAND.steelDeep;
const GOLD = BRAND.gold;
const GOLD_DARK = BRAND.goldDeep;
const GOLD_TEXT = BRAND.goldText;
const LIGHT = BRAND.light;

// ─────────────── Data ────────────────────────────────────────────────────────
// Hex colors for this page's custom (non-Tailwind-class) styling, keyed by
// discipline value. Everything else (label, short, value, icon, topics) is
// sourced from disciplines.ts so it can never drift out of sync.
const SUBJECT_HEX: Record<string, { color: string; bg: string }> = {
  hrm:     { color: NAVY,       bg: "#E8E6E2" },
  ob:      { color: STEEL_DARK, bg: "#F2F1EF" },
  sm:      { color: GOLD_TEXT,  bg: "#F7F4EF" },
  pom:     { color: NAVY_DARK,  bg: "#EBE9E4" },
  bc:      { color: STEEL_DARK, bg: "#F2F1EF" },
  odcm:    { color: GOLD_TEXT,  bg: "#F7F4EF" },
  ghr:     { color: NAVY_DARK,  bg: "#E8E6E2" },
  "mba-eco": { color: NAVY,     bg: "#E8E6E2" },
  "bba-eco": { color: STEEL_DARK, bg: "#F2F1EF" },
  lw:      { color: NAVY_DARK,  bg: "#EFEDE9" },
};

const SUBJECTS = DISCIPLINES.map(d => ({
  icon: d.icon,
  label: d.label,
  short: d.short,
  value: d.value,
  ...SUBJECT_HEX[d.value],
}));

const ROADMAP = [
  { step: "01", icon: Search,        title: "Choose a Subject",  desc: "Pick an HR & Management discipline — HRM and OB have full content now; more are being added." },
  { step: "02", icon: FileText,      title: "Study the Notes",   desc: "Read structured, exam-aligned study notes." },
  { step: "03", icon: PlayCircle,    title: "Watch Lectures",    desc: "Reinforce concepts with expert video lectures." },
  { step: "04", icon: HelpCircle,    title: "Practice MCQs",     desc: "Test yourself with topic-wise quizzes." },
  { step: "05", icon: Award,         title: "Master the Topic",  desc: "Achieve exam readiness and subject mastery." },
];

// ─────────────── Tiny reusable pieces ────────────────────────────────────────
const GoldLabel = ({ text }: { text: string }) => (
  <div className="flex items-center gap-2 mb-3">
    <span className="block h-px w-6 rounded-full" style={{ background: GOLD }} />
    <span className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: GOLD_TEXT }}>{text}</span>
  </div>
);

const SectionHeading = ({ title, sub, center = false }: { title: string; sub?: string; center?: boolean }) => (
  <div className={center ? "text-center" : ""}>
    <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight" style={{ letterSpacing: "-0.02em" }}>
      {title}
    </h2>
    {sub && <p className="mt-3 text-slate-500 max-w-xl leading-relaxed" style={center ? { margin: "0.75rem auto 0" } : {}}>{sub}</p>}
  </div>
);

// Note counts per subject, keyed by discipline value — the single query the
// hero sidebar widget and the discipline grid's badges both read from, so
// the two can never show different numbers for the same subject.
function useSubjectNoteCounts() {
  const { counts } = useSubjectCounts();
  return { counts: counts?.notes ?? {}, totalNotes: counts?.totalNotes ?? null };
}

// ─────────────── Section: Hero ────────────────────────────────────────────────
const Hero = () => {
  const { totalNotes } = useSubjectNoteCounts();
  // The card used to show only note counts, which read as "this is just a
  // notes site" — this row makes the full range of formats (MCQs, PYQs,
  // lectures) visible at a glance, not just the one format that happens to
  // be listed per-subject below.
  const { quizCount, pyqCount, lecturesCount } = useContentCounts();
  // Signed-in students with a paper mid-read get a "Resume reading" pill in
  // place of the generic sign-up pitch — the same reading-progress data the
  // PYQs page's "Continue where you left off" strip uses, surfaced at the
  // very first thing a returning visitor sees instead of only on /pyqs.
  const [resume, setResume] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user || cancelled) return;
      const { data: progress } = await (supabase.from("pyq_reading_progress" as any) as any)
        .select("pyq_id, last_page, total_pages")
        .order("updated_at", { ascending: false })
        .limit(1);
      const pr = progress?.[0];
      if (!pr || cancelled) return;
      const midRead = pr.last_page > 1 && (!pr.total_pages || pr.last_page < pr.total_pages);
      if (!midRead) return;
      const { data: paper } = await (supabase.from("pyq_papers" as any) as any)
        .select("title").eq("id", pr.pyq_id).maybeSingle();
      if (!paper || cancelled) return;
      setResume({ id: pr.pyq_id, title: paper.title });
    });
    return () => { cancelled = true; };
  }, []);

  return (
  <section className="relative overflow-hidden" style={{ background: `linear-gradient(180deg, #FFFFFF 0%, ${LIGHT} 100%)` }}>
    {/* Dot grid */}
    <div className="absolute inset-0 pointer-events-none opacity-[0.05]" style={{ backgroundImage: `radial-gradient(circle,${NAVY} 1px,transparent 1px)`, backgroundSize: "26px 26px" }} />
    {/* Gold glow */}
    <div className="absolute -top-40 -left-32 w-96 h-96 rounded-full pointer-events-none opacity-15" style={{ background: `radial-gradient(circle,${GOLD},transparent 70%)` }} />

    <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 min-h-[88vh] items-center py-16 lg:py-0">

        {/* Left */}
        <div className="flex flex-col justify-center">
          {resume ? (
            <Link
              to={`/pyqs/view/${resume.id}`}
              className="group inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-7 w-fit max-w-full transition-colors hover:opacity-90"
              style={{ background: "rgba(199,153,74,0.12)", border: `1px solid ${GOLD}55` }}
            >
              <History aria-hidden="true" className="h-3.5 w-3.5 flex-shrink-0" style={{ color: GOLD_TEXT }} />
              <span className="truncate text-xs font-semibold" style={{ color: GOLD_TEXT }}>
                Resume reading: {resume.title}
              </span>
              <ArrowRight aria-hidden="true" className="h-3 w-3 flex-shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: GOLD_TEXT }} />
            </Link>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-7 w-fit" style={{ background: "rgba(199,153,74,0.12)", border: `1px solid ${GOLD}55` }}>
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: GOLD }} />
              <span className="text-xs font-semibold" style={{ color: GOLD_TEXT }}>100% Free Academic Resource Platform</span>
            </div>
          )}

          <h1 className="font-extrabold leading-[1.08] mb-5" style={{ color: NAVY, fontSize: "clamp(1.9rem,3.9vw,3rem)", letterSpacing: "-0.02em" }}>
            Study Resources for{" "}
            <span style={{ color: GOLD_DARK }}>UGC NET/JRF, MBA/BBA &amp; HR Studies</span>
          </h1>

          <p className="text-sm md:text-base leading-relaxed mb-8 max-w-xl" style={{ color: "#55514C" }}>
            Notes, MCQs, previous year papers and video lectures for three kinds of learners — UGC NET/JRF
            Paper II (Subject Code 55) aspirants, MBA &amp; BBA students, and research scholars &amp; HR
            professionals — organised by syllabus, updated regularly, and free to use.
          </p>

          {/* CTAs — one primary (self-select a track below), one secondary
              (browse everything). Neither CTA singles out Labour Welfare —
              that used to read as if it were the whole site's focus; the
              three pathway cards below the hero now carry that routing. */}
          <div className="flex flex-wrap gap-3 mb-8">
            <a
              href="#pathways"
              onClick={(e) => { e.preventDefault(); document.getElementById("pathways")?.scrollIntoView({ behavior: "smooth" }); }}
              className="font-display inline-flex items-center gap-2 rounded-lg px-7 py-3 text-sm font-bold transition-all hover:opacity-90 hover:-translate-y-0.5 shadow-lg"
              style={{ background: GOLD, color: NAVY, boxShadow: `0 6px 24px ${GOLD}40` }}
            >
              Find Your Study Path <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
            <Link to="/notes" className="font-display inline-flex items-center gap-2 rounded-lg px-7 py-3 text-sm font-bold transition-all hover:-translate-y-0.5" style={{ border: `1.5px solid #DCD9D3`, color: NAVY, background: "#FFFFFF" }}>
              <FileText className="h-4 w-4" /> Browse All Resources
            </Link>
          </div>

          {/* Trust badges — four, not eight: each one a claim a student can
              verify on the site, not a slogan. */}
          <ul className="flex flex-wrap gap-2 mb-10 max-w-xl" aria-label="Why learners trust Karn HR Academy">
            {[
              { icon: BadgeCheck,    label: "Latest UGC NET/JRF Syllabus" },
              { icon: BookOpen,      label: "Syllabus-Ordered, Unit-wise" },
              { icon: RefreshCw,     label: "Updated Every Week" },
              { icon: Award,         label: "By a UGC NET Qualified Educator" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium" style={{ background: "#FFFFFF", color: STEEL_DARK, border: "1px solid #DCD9D3" }}>
                <Icon aria-hidden="true" className="h-3 w-3 flex-shrink-0" style={{ color: GOLD_TEXT }} />{label}
              </li>
            ))}
          </ul>
        </div>

        {/* Right: Live content snapshot — Option B layout (no bars) */}
        <div className="hidden lg:flex items-center justify-center">
          <div className="w-full max-w-md">
            {/* Card: no overflow:hidden so badge won't clip */}
            <div className="rounded-2xl shadow-xl" style={{ background: "#FFFFFF", border: "1px solid #E8E6E2" }}>

              {/* Card header — no star rating */}
              <div className="flex items-center gap-3 px-6 pt-5 pb-4" style={{ borderBottom: "1px solid #F2F1EF" }}>
                <div className="font-display flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl font-extrabold text-sm" style={{ background: GOLD, color: NAVY }}>K</div>
                <div>
                  <p className="font-display text-sm font-bold" style={{ color: NAVY }}>Karn HR Academy</p>
                  <p className="text-xs" style={{ color: "#8A8580" }}>Live from the library</p>
                </div>
              </div>

              {/* What's in the library, by format. The per-subject breakdown
                  lives in the subject grid below — repeating it here made the
                  card and the grid say the same thing twice. */}
              <div className="grid grid-cols-2 gap-3 px-6 pt-5 pb-3">
                {[
                  { icon: FileText,   label: "Study Notes",   value: totalNotes,    to: "/notes" },
                  { icon: HelpCircle, label: "MCQ Sets",      value: quizCount,     to: "/quizzes" },
                  { icon: ScrollText, label: "PYQ Papers",    value: pyqCount,      to: "/pyqs" },
                  { icon: PlayCircle, label: "Video Lectures", value: lecturesCount, to: "/lectures" },
                ].map(f => {
                  const I = f.icon;
                  return (
                    <Link key={f.label} to={f.to} className="group rounded-xl px-4 py-3 transition-colors hover:bg-white" style={{ background: LIGHT, border: "1px solid #E8E6E2" }}>
                      <I className="mb-1.5 h-4 w-4" style={{ color: GOLD_TEXT }} />
                      <p className="font-display text-2xl font-extrabold leading-none tabular-nums" style={{ color: NAVY }}>{f.value !== null ? f.value : "…"}</p>
                      <p className="mt-1 text-[11px] font-semibold" style={{ color: "#8A8580" }}>{f.label}</p>
                    </Link>
                  );
                })}
              </div>
              <div className="px-6 pb-5">
                <p className="text-[11px]" style={{ color: "#8A8580" }}>
                  Across <strong style={{ color: NAVY }}>{DISCIPLINES.length} subjects</strong> · all free · new uploads every week
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  );
};

// Real content counts, shared by the hero card and the audience cards.
function useContentCounts() {
  const [notesCount, setNotesCount] = useState<number | null>(null);
  const [quizCount, setQuizCount] = useState<number | null>(null);
  const [lecturesCount, setLecturesCount] = useState<number | null>(null);
  const [booksCount, setBooksCount] = useState<number | null>(null);
  const [pyqCount, setPyqCount] = useState<number | null>(null);

  useEffect(() => {
    supabase.from("notes").select("id", { count: "exact", head: true }).then(({ count }) => setNotesCount(count ?? 0));
    supabase.from("quizzes").select("id", { count: "exact", head: true }).then(({ count }) => setQuizCount(count ?? 0));
    supabase.from("lectures" as any).select("id", { count: "exact", head: true }).then(({ count }) => setLecturesCount(count ?? 0));
    supabase.from("book_recommendations").select("id", { count: "exact", head: true }).then(({ count }) => setBooksCount(count ?? 0));
    (supabase.from("pyq_papers" as any) as any).select("id", { count: "exact", head: true }).then(({ count }: any) => setPyqCount(count ?? 0));
  }, []);

  return { notesCount, quizCount, lecturesCount, booksCount, pyqCount };
}

// ─────────────── Section: Compact "How It Works" strip ──────────────────────
// Replaces the old raw stats grid (132 notes / 50 quizzes / ...) right below
// the hero — a wall of numbers this early reads as "prove it to me" rather
// than helping a first-time visitor understand what to do next. This is the
// only "how it works" section on the page — the full illustrated version
// used to duplicate it further down and was removed as dead weight.
const CompactHowItWorks = () => (
  <section style={{ background: "#F7F4EF", borderTop: "1px solid #F0C8C1", borderBottom: "1px solid #F0C8C1" }}>
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex items-center gap-2 overflow-x-auto sm:flex-wrap sm:justify-center sm:overflow-visible">
        {ROADMAP.map((r, i) => {
          const Icon = r.icon;
          return (
            <div key={r.step} className="flex flex-shrink-0 items-center gap-2">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full" style={{ background: GOLD, color: NAVY }}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="font-display text-xs font-semibold" style={{ color: NAVY }}>{r.title}</span>
              </div>
              {i < ROADMAP.length - 1 && <ArrowRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: GOLD_DARK }} />}
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

// ─────────────── Section: Subjects ───────────────────────────────────────────
const MIN_NOTES_TO_LINK = 3;

const Subjects = () => {
  const { counts } = useSubjectCounts();
  const totalNotes = counts?.totalNotes ?? null;
  // A subject only counts as "live" once it has enough published notes to
  // link — the same threshold the cards use — so this number can never drift
  // out of sync with what's actually shown.
  const disciplineCount = counts ? DISCIPLINES.filter(d => (counts.notes[d.value] ?? 0) >= MIN_NOTES_TO_LINK).length : 0;
  const disciplineWord = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"][disciplineCount] || String(disciplineCount);

  return (
    <section id="subjects" className="py-16 md:py-20" style={{ background: LIGHT }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <GoldLabel text="Browse by Subject" />
            <SectionHeading title="HR & Management. One Platform." sub={`${counts ? disciplineWord : "…"} subjects live, ${totalNotes !== null ? totalNotes : "…"} notes, updated weekly — all free.`} />
          </div>
          <Link to="/notes" className="inline-flex items-center gap-1.5 text-sm font-bold flex-shrink-0 hover:underline" style={{ color: GOLD_TEXT }}>
            View all notes <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DISCIPLINES.map(d => (
            <SubjectCard
              key={d.value}
              discipline={d}
              notes={counts ? (counts.notes[d.value] ?? 0) : null}
              quizzes={counts ? (counts.quizzes[d.value] ?? 0) : null}
              lectures={counts ? (counts.lectures[d.value] ?? 0) : null}
              minNotes={MIN_NOTES_TO_LINK}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

// ─────────────── Section: audience split ────────────────────────────────────
// One "who are you?" section replaces the two stacked full-width promo
// banners (UGC NET + MBA/BBA) — the same framed style, half the height,
// side-by-side so a first-time visitor self-selects in one glance instead
// of scrolling through two screens of promotion.
const AudienceSplit = () => {
  const [lw, setLw] = useState<{ notes: number | null; quizzes: number | null; pyqs: number | null }>({ notes: null, quizzes: null, pyqs: null });
  const [mba, setMba] = useState<{ notes: number | null; quizzes: number | null; lectures: number | null }>({ notes: null, quizzes: null, lectures: null });
  const { booksCount } = useContentCounts();

  useEffect(() => {
    supabase.from("notes").select("id", { count: "exact", head: true }).eq("subject", "lw")
      .then(({ count }) => setLw(v => ({ ...v, notes: count ?? 0 })));
    (supabase.from("quizzes") as any).select("id", { count: "exact", head: true }).eq("subject", "lw")
      .then(({ count }: any) => setLw(v => ({ ...v, quizzes: count ?? 0 })));
    (supabase.from("pyq_papers" as any) as any).select("id", { count: "exact", head: true }).eq("subject", "lw")
      .then(({ count }: any) => setLw(v => ({ ...v, pyqs: count ?? 0 })));
    supabase.from("notes").select("id", { count: "exact", head: true }).neq("subject", "lw")
      .then(({ count }) => setMba(v => ({ ...v, notes: count ?? 0 })));
    (supabase.from("quizzes") as any).select("id", { count: "exact", head: true }).neq("subject", "lw")
      .then(({ count }: any) => setMba(v => ({ ...v, quizzes: count ?? 0 })));
    (supabase.from("lectures" as any) as any).select("id", { count: "exact", head: true })
      .then(({ count }: any) => setMba(v => ({ ...v, lectures: count ?? 0 })));
  }, []);

  const n = (v: number | null) => (v !== null ? String(v) : "…");

  const AudienceCard = ({
    accent, eyebrowColor, eyebrow, icon: Icon, title, body, stats, to, cta,
  }: {
    accent: string; eyebrowColor: string; eyebrow: string; icon: any; title: string; body: string;
    stats: { label: string; value: string }[]; to: string; cta: string;
  }) => (
    <div
      className="relative flex flex-col overflow-hidden rounded-3xl border-2 p-7 md:p-9"
      style={{ borderColor: accent, background: `linear-gradient(135deg, ${accent}0a, ${accent}14)` }}
    >
      <div className="absolute -right-7 -top-7 h-24 w-24 rotate-45 rounded-2xl opacity-[0.07]" style={{ background: accent }} />
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: accent }}>
          <Icon className="h-4.5 w-4.5 text-white" />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: eyebrowColor }}>
          {eyebrow}
        </span>
      </div>
      <h3 className="mb-2 font-display text-xl font-extrabold leading-tight text-slate-900 sm:text-2xl">{title}</h3>
      <p className="mb-5 text-sm leading-relaxed text-slate-600">{body}</p>
      <div className="mb-6 flex flex-wrap gap-x-6 gap-y-2">
        {stats.map(st => (
          <div key={st.label}>
            <p className="font-display text-xl font-extrabold" style={{ color: accent }}>{st.value}</p>
            <p className="text-[11px] font-semibold text-slate-500">{st.label}</p>
          </div>
        ))}
      </div>
      <Link
        to={to}
        className="mt-auto inline-flex w-fit items-center gap-2 rounded-lg px-5 py-2.5 font-display text-sm font-bold text-white transition-all hover:opacity-90"
        style={{ background: accent }}
      >
        {cta} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );

  return (
    <section id="pathways" className="py-16 md:py-20 bg-white" style={{ scrollMarginTop: "80px" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col items-center text-center">
          <GoldLabel text="Learning Paths" />
          <SectionHeading center title="What are you studying for?" sub="Pick the track that matches your goal — everything on it is free." />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <AudienceCard
            accent={NAVY_DARK}
            eyebrowColor={NAVY_DARK}
            eyebrow="UGC NET/JRF Paper II · Code 55"
            icon={HandHeart}
            title="Preparing for UGC NET/JRF Labour Welfare?"
            body="All 10 official units with notes, MCQs and previous year papers — the only fully unit-wise hub for Subject Code 55."
            stats={[
              { label: "Units", value: "10" },
              { label: "Notes", value: n(lw.notes) },
              { label: "MCQ Sets", value: n(lw.quizzes) },
              { label: "PYQ Papers", value: n(lw.pyqs) },
            ]}
            to="/ugc-net-labour-welfare"
            cta="Explore the Unit-wise Hub"
          />
          <AudienceCard
            accent={GOLD_DARK}
            eyebrowColor={GOLD_TEXT}
            eyebrow="MBA · BBA · PGDM · B.Com"
            icon={GraduationCap}
            title="Studying HR & Management this semester?"
            body="Nine core subjects with semester-wise guidance — Principles of Management and Economics through OD & Change and International HRM."
            stats={[
              { label: "Subjects", value: String(DISCIPLINES.length - 1) },
              { label: "Notes", value: n(mba.notes) },
              { label: "MCQ Sets", value: n(mba.quizzes) },
              { label: "Lectures", value: n(mba.lectures) },
            ]}
            to="/mba-bba"
            cta="Explore the MBA/BBA Hub"
          />
          <AudienceCard
            accent={STEEL_DARK}
            eyebrowColor={STEEL_DARK}
            eyebrow="PhD · Faculty · HR Practitioners"
            icon={BookMarked}
            title="Doing research or working in HR?"
            body="A curated reference library and research-based notes to support academic work and applied HR practice, alongside the founder's own publications."
            stats={[
              { label: "Books Curated", value: n(booksCount) },
              { label: "Subjects", value: String(DISCIPLINES.length) },
            ]}
            to="/books"
            cta="Explore the Book Library"
          />
        </div>
      </div>
    </section>
  );
};


// ─────────────── Section: Testimonials ───────────────────────────────────────
// Renders nothing at all when there are no published rows — a half-empty
// "what students say" section reads worse than not having one.
type Testimonial = { id: string; quote: string; name: string; context: string };

const Testimonials = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[] | null>(null);

  useEffect(() => {
    (supabase.from("testimonials" as any) as any)
      .select("id, quote, name, context")
      .eq("is_published", true)
      .order("display_order", { ascending: true })
      .limit(3)
      .then(({ data }: any) => setTestimonials(data ?? []));
  }, []);

  if (!testimonials || testimonials.length === 0) return null;

  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col items-center text-center">
          <GoldLabel text="Student Voices" />
          <SectionHeading center title="What aspirants say" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map(t => (
            <div key={t.id} className="flex flex-col rounded-2xl border p-6" style={{ borderColor: "#E8E6E2", background: LIGHT }}>
              <p className="flex-1 text-sm leading-relaxed text-slate-700 line-clamp-3">"{t.quote}"</p>
              <p className="mt-4 font-display text-sm font-bold text-slate-900">{t.name}</p>
              <p className="text-xs text-slate-500">{t.context}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─────────────── Section: Recently Added (live from DB) ──────────────────────
// A compact freshness strip — notes, MCQ sets and lectures merged by upload
// date — rather than three oversized "featured" cards showing whatever was
// uploaded last. Proves the site is updated weekly without competing with
// the subject grid for attention.
type RecentItem = { id: string; kind: "PDF" | "PPT" | "NOTE" | "MCQ" | "VIDEO"; title: string; subject: string; created_at: string; to: string };

const RecentlyAdded = () => {
  const [items, setItems] = useState<RecentItem[] | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("notes").select("id, title, subject, file_url, created_at").order("created_at", { ascending: false }).limit(6),
      (supabase.from("quizzes") as any).select("id, title, subject, published, created_at").eq("published", true).order("created_at", { ascending: false }).limit(4),
      (supabase.from("lectures" as any) as any).select("id, title, subject, created_at").order("created_at", { ascending: false }).limit(3),
    ]).then(([n, q, l]) => {
      const notes: RecentItem[] = (n.data ?? []).map((x: any) => ({
        id: x.id, title: x.title, subject: x.subject || "hrm", created_at: x.created_at,
        kind: /\.pptx?(\?|$)/i.test(x.file_url ?? "") ? "PPT" : /\.pdf(\?|$)/i.test(x.file_url ?? "") ? "PDF" : "NOTE",
        to: /\.pdf(\?|$)/i.test(x.file_url ?? "") ? `/notes/view/${x.id}` : `/notes?subject=${x.subject || "hrm"}`,
      }));
      const quizzes: RecentItem[] = (q.data ?? []).map((x: any) => ({ id: x.id, title: x.title, subject: x.subject || "hrm", created_at: x.created_at, kind: "MCQ", to: `/quizzes/${x.id}` }));
      const lectures: RecentItem[] = (l.data ?? []).map((x: any) => ({ id: x.id, title: x.title, subject: x.subject || "hrm", created_at: x.created_at, kind: "VIDEO", to: "/lectures" }));
      setItems([...notes, ...quizzes, ...lectures].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 6));
    });
  }, []);

  if (!items || items.length === 0) return null;

  const KIND_STYLE: Record<RecentItem["kind"], { bg: string; fg: string }> = {
    PDF:   { bg: "#FDF4F2", fg: GOLD_TEXT },
    PPT:   { bg: "#FDF4F2", fg: GOLD_TEXT },
    NOTE:  { bg: "#FDF4F2", fg: GOLD_TEXT },
    MCQ:   { bg: "#EFEDE9", fg: NAVY },
    VIDEO: { bg: "#E8E6E2", fg: NAVY_DARK },
  };

  return (
    <section className="py-12 md:py-14 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <GoldLabel text="Recently Added" />
            <p className="text-sm text-slate-500">New notes, MCQ sets and lectures — updated every week.</p>
          </div>
          <Link to="/notes" className="inline-flex items-center gap-1.5 text-sm font-bold flex-shrink-0 hover:underline" style={{ color: GOLD_TEXT }}>
            Browse all notes <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {items.map((it, i) => {
            const d = getDiscipline(it.subject);
            const ks = KIND_STYLE[it.kind];
            return (
              <li key={`${it.kind}-${it.id}`}>
                <Link to={it.to} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 sm:gap-4 sm:px-5">
                  <span className="w-12 shrink-0 rounded-md py-0.5 text-center text-[10px] font-extrabold tracking-wider" style={{ background: ks.bg, color: ks.fg }}>{it.kind}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 group-hover:text-brand-navy">{tidyTitle(it.title)}</span>
                  {i === 0 && <span className="hidden rounded-full px-2 py-0.5 text-[10px] font-bold sm:inline" style={{ background: GOLD, color: "#fff" }}>NEW</span>}
                  <span className="hidden w-28 shrink-0 truncate text-xs font-semibold text-slate-500 sm:block">{d?.short ?? it.subject.toUpperCase()}</span>
                  <span className="w-20 shrink-0 text-right text-xs tabular-nums text-slate-400 sm:w-24">{timeAgo(it.created_at)}</span>
                  <ChevronRight className="hidden h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500 sm:block" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

// ─────────────── Section: Video Lectures ─────────────────────────────────────
const VideoLectures = () => {
  const [lectures, setLectures] = useState<any[]>([]);
  const [playing, setPlaying] = useState<any | null>(null);
  useEffect(() => {
    supabase.from("lectures").select("*").order("created_at", { ascending: false }).limit(3).then(({ data }) => data && setLectures(data));
  }, []);

  return (
    <section className="py-20 md:py-24" style={{ background: LIGHT }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <GoldLabel text="Video Lectures" />
            <SectionHeading title="Expert Video Lectures" sub="Watch, pause, and master concepts with our subject-expert lectures." />
          </div>
          <Link to="/lectures" className="inline-flex items-center gap-1.5 text-sm font-bold flex-shrink-0 hover:underline" style={{ color: GOLD_TEXT }}>
            All lectures <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {lectures.length === 0 ? (
          <p className="text-sm text-slate-500">New lectures are added regularly — check back soon.</p>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {lectures.map((lec: any, i: number) => {
            const thumb = normalizeYouTubeThumbnail(lec.thumbnail_url);
            return (
            <button
              key={lec.id || i}
              type="button"
              onClick={() => lec.video_url && setPlaying(lec)}
              disabled={!lec.video_url}
              className="group flex w-full flex-col rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-200 hover:shadow-lg overflow-hidden disabled:cursor-default"
            >
              {/* Thumbnail */}
              <div
                className="relative flex items-center justify-center h-44 overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${NAVY}ee, ${NAVY}bb)` }}
              >
                {thumb && (
                  <>
                    {/* Blurred, scaled backdrop — fills the frame no matter the thumbnail's
                        own aspect ratio, so there's never a plain gap around it. */}
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url("${thumb}")`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        filter: "blur(16px) brightness(0.6)",
                        transform: "scale(1.15)",
                      }}
                    />
                    {/* The real thumbnail, always shown in FULL — object-fit: contain
                        can never crop, unlike cover, so nothing is ever cut off. */}
                    <img
                      src={thumb}
                      alt={lec.title}
                      loading="lazy"
                      decoding="async"
                      className="relative z-[1] h-full w-full"
                      style={{ objectFit: "contain" }}
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    {/* Bottom scrim so the play button/badges stay legible over any thumbnail */}
                    <div className="absolute inset-0 z-[2]" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.02) 55%, rgba(0,0,0,0.45) 100%)" }} />
                  </>
                )}
                <PlayCircle className="relative z-10 h-14 w-14 text-white opacity-90 drop-shadow-lg group-hover:scale-110 transition-transform" />
                {lec.duration_minutes && (
                  <span className="absolute bottom-3 right-3 rounded px-2 py-0.5 text-xs font-bold bg-black/60 text-white">
                    {lec.duration_minutes} min
                  </span>
                )}
                <span className="absolute top-3 left-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold" style={{ background: GOLD, color: NAVY }}>
                  {(lec.subject || "hrm").toUpperCase()}
                </span>
              </div>
              <div className="p-5">
                <h3 className="text-base font-bold text-slate-800 leading-snug mb-2 line-clamp-2 group-hover:text-brand-navy transition-colors">
                  {lec.title}
                </h3>
                {lec.description && <p className="text-sm text-slate-500 line-clamp-2 mb-3">{lec.description}</p>}
                <span className="-mx-2 inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-bold" style={{ color: STEEL_DARK }}>
                  <PlayCircle className="h-4 w-4" /> Watch Now
                </span>
              </div>
            </button>
            );
          })}
        </div>
        )}
      </div>

      {/* Lightbox player — same pattern as /lectures */}
      {playing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPlaying(null)}>
          <div className="w-full max-w-4xl" onClick={e => e.stopPropagation()}>
            {(() => {
              const url: string = playing.video_url || "";
              const isFile = /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url) || url.includes("/storage/v1/object/");
              if (isFile) return <video src={url} controls autoPlay className="w-full rounded-lg bg-black" />;
              let embed = url;
              const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
              if (yt) embed = `https://www.youtube.com/embed/${yt[1]}?autoplay=1`;
              return (
                <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
                  <iframe src={embed} title={playing.title} allow="autoplay; encrypted-media; fullscreen" allowFullScreen className="h-full w-full border-0" />
                </div>
              );
            })()}
            <div className="mt-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{playing.title}</h2>
              <div className="flex items-center gap-2">
                <a href={playing.video_url} target="_blank" rel="noopener noreferrer" className="rounded-md bg-white/90 px-3 py-1.5 text-sm text-slate-800 hover:bg-white">
                  Open in new tab
                </a>
                <button onClick={() => setPlaying(null)} className="rounded-md bg-white px-3 py-1.5 text-sm text-slate-800">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

// ─────────────── Section: Books ───────────────────────────────────────────────
const BooksSection = () => {
  const [books, setBooks] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("book_recommendations").select("*").order("created_at", { ascending: false }).limit(4).then(({ data }) => data && setBooks(data));
  }, []);

  const bookColors = [NAVY, STEEL_DARK, NAVY_DARK, GOLD];

  return (
    <section className="py-20 md:py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <GoldLabel text="Recommended Reading" />
            <SectionHeading title="Curated Book Library" sub="Hand-picked books for HR students, professionals, and researchers." />
          </div>
          <Link to="/books" className="inline-flex items-center gap-1.5 text-sm font-bold flex-shrink-0 hover:underline" style={{ color: GOLD_TEXT }}>
            View all books <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {books.length === 0 ? (
          <p className="text-sm text-slate-500">Book recommendations are added regularly — check back soon.</p>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {books.map((book: any, i: number) => (
            <div key={book.id || i} className="group flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden">
              {/* Cover area: real image if available, styled fallback otherwise */}
              <div className="relative flex items-center justify-center pt-6 pb-5 px-6 overflow-hidden" style={{ background: `linear-gradient(160deg, ${bookColors[i % 4]}18, ${bookColors[i % 4]}06)`, minHeight: "10rem" }}>
                {book.cover_image ? (
                  <img
                    src={book.cover_image}
                    alt={`Cover of ${book.title}`}
                    loading="lazy"
                    decoding="async"
                    className="h-36 w-auto max-w-[7rem] object-cover rounded shadow-xl ring-1 ring-black/10"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="relative w-24 h-32 rounded-lg shadow-xl flex flex-col items-center justify-center gap-2 px-2" style={{ background: bookColors[i % 4] }}>
                    <div className="absolute left-0 top-0 bottom-0 w-2 rounded-l-lg" style={{ background: "rgba(0,0,0,0.2)" }} />
                    <BookMarked className="h-7 w-7 text-white/80" />
                    <span className="text-[9px] text-center text-white/70 leading-tight px-1 line-clamp-3">{book.title}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col flex-1 p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-1 line-clamp-2 leading-snug">{book.title}</h3>
                <p className="text-xs font-medium mb-3" style={{ color: bookColors[i % 4] }}>{book.author}</p>
                <p className="text-xs leading-relaxed text-slate-500 flex-1 line-clamp-3 mb-4">{book.description}</p>
                <Link to="/books" className="inline-flex items-center gap-1 text-xs font-bold hover:underline" style={{ color: bookColors[i % 4] }}>
                  View Details <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </section>
  );
};

// ─────────────── Section: Meet the Founder ───────────────────────────────────
const FOUNDER_LINKEDIN = LIVE_CHANNELS.find(c => c.key === "linkedin")?.url ?? "/connect";

const FOUNDER_QUALIFICATIONS = [
  "UGC NET Qualified (Code 55)",
  "Assistant Professor",
  "PhD Scholar (Management)",
  "MBA (HR)",
  "Industry Experience in Banking & HR",
  "Author & Researcher",
];

const AboutAuthor = () => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Same photo source the About page uses — a real photo uploaded to the
  // "educator" storage bucket appears here automatically, monogram otherwise.
  useEffect(() => {
    const { data } = supabase.storage.from("educator").getPublicUrl("profile.jpg");
    fetch(data.publicUrl, { method: "HEAD" }).then(res => {
      if (res.ok) setPhotoUrl(data.publicUrl);
    }).catch(() => {});
  }, []);

  return (
  <section id="founder" className="py-16 md:py-20" style={{ background: LIGHT, scrollMarginTop: "80px" }} aria-labelledby="founder-heading">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid lg:grid-cols-[1fr_minmax(0,380px)] gap-10 items-center">
        {/* Left: Founder card */}
        <div className="rounded-3xl border bg-white p-7 sm:p-9" style={{ borderColor: "#E8E6E2" }}>
          <div className="mb-6 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <div className="relative flex-shrink-0">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl shadow-xl" style={{ background: `linear-gradient(135deg, ${NAVY}, ${STEEL})` }}>
                {photoUrl ? (
                  <img src={photoUrl} alt="Ms. Nupur Karn, founder of Karn HR Academy" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-display text-3xl font-extrabold text-white">NK</span>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow" style={{ background: GOLD }}>
                <Award aria-hidden="true" className="h-4 w-4" style={{ color: NAVY }} />
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: GOLD_TEXT }}>Meet the Founder</p>
              <h3 id="founder-heading" className="text-2xl font-extrabold text-slate-900">Ms. Nupur Karn</h3>
              <p className="text-sm text-slate-500">Founder, Karn HR Academy</p>
            </div>
          </div>

          <ul className="mb-6 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {FOUNDER_QUALIFICATIONS.map(q => (
              <li key={q} className="flex items-start gap-2 text-sm text-slate-600">
                <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: GOLD_DARK }} />
                {q}
              </li>
            ))}
          </ul>

          <blockquote className="mb-7 border-l-2 pl-4 text-slate-600 italic leading-relaxed" style={{ borderColor: GOLD }}>
            "Karn HR Academy was created to provide high-quality academic resources that bridge university learning and competitive examination preparation."
          </blockquote>

          <div className="flex flex-wrap gap-3">
            <a
              href={FOUNDER_LINKEDIN}
              target="_blank"
              rel="noopener noreferrer"
              className="font-display inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: NAVY }}
            >
              <Linkedin aria-hidden="true" className="h-4 w-4" /> LinkedIn
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-display inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5"
              style={{ borderColor: "#DCD9D3", color: NAVY, background: "#FFFFFF" }}
            >
              <Mail aria-hidden="true" className="h-4 w-4" /> Email
            </a>
            <Link
              to="/about"
              className="font-display inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5"
              style={{ borderColor: "#DCD9D3", color: NAVY, background: "#FFFFFF" }}
            >
              Full profile <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Right: follow the academy — the library numbers already sit in
            the hero card, so this side carries the channels instead of
            repeating them. */}
        <div className="rounded-3xl border bg-white p-7" style={{ borderColor: "#E8E6E2" }}>
          <GoldLabel text="Follow Karn HR Academy" />
          <p className="mb-5 text-sm leading-relaxed text-slate-600">
            New lectures on YouTube, daily MCQs on Instagram and Telegram, and exam updates on LinkedIn — pick the channel you actually open.
          </p>
          <SocialIconRow items={[...LIVE_CHANNELS.map(c => ({ key: c.key, label: c.label, url: c.url })), { key: "email", label: "Email", url: `mailto:${CONTACT_EMAIL}` }]} size={42} />
          <Link to="/connect" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold hover:underline" style={{ color: GOLD_TEXT }}>
            All channels &amp; QR codes <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  </section>
  );
};

// ─────────────── Section: Newsletter ─────────────────────────────────────────
const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const { isBot, honeypotFieldProps } = useHoneypot();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (isBot()) { setDone(true); setEmail(""); return; }
    setLoading(true);
    await (supabase.rpc as any)("subscribe_email", { _email: email.trim() });
    track(EVENTS.NEWSLETTER_SUBSCRIBE, { where: "home" });
    setLoading(false);
    setDone(true);
    setEmail("");
  };

  return (
    <section className="py-20 md:py-24 relative overflow-hidden" style={{ background: "#E8E6E2" }}>
      <div className="absolute inset-0 pointer-events-none opacity-[0.05]" style={{ backgroundImage: `radial-gradient(circle,${NAVY} 1px,transparent 1px)`, backgroundSize: "24px 24px" }} />
      <div className="absolute top-0 right-0 w-96 h-96 pointer-events-none opacity-15 rounded-full" style={{ background: `radial-gradient(circle,${GOLD},transparent 70%)`, transform: "translate(40%,-40%)" }} />
      <div className="relative mx-auto max-w-2xl px-4 sm:px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="h-px w-6 rounded-full" style={{ background: GOLD }} />
          <Mail className="h-5 w-5" style={{ color: GOLD_DARK }} />
          <span className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: GOLD_TEXT }}>Stay Updated</span>
          <span className="h-px w-6 rounded-full" style={{ background: GOLD }} />
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ color: NAVY, letterSpacing: "-0.02em" }}>
          Join the HR Learning Community
        </h2>
        <p className="mb-8 leading-relaxed" style={{ color: "#55514C" }}>
          New notes, MCQs, video lectures, and articles every week — curated for MBA, BBA, and UGC NET/JRF preparation. Free forever.
        </p>

        {done ? (
          <div className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold" style={{ background: "#EDF7F1", color: "#1E7E4A", border: "1px solid #A8D5BC" }}>
            <CheckCircle2 className="h-5 w-5" /> You're subscribed — welcome to the community!
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-5">
            <input type="text" {...honeypotFieldProps} />
            <input
              type="email" required
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="flex-1 rounded-xl px-5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
              style={{ background: "#FFFFFF", border: "1px solid #DCD9D3" }}
            />
            <button type="submit" disabled={loading} className="font-display rounded-xl px-6 py-3 text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60" style={{ background: GOLD, color: NAVY }}>
              {loading ? "Subscribing…" : "Subscribe Free"}
            </button>
          </form>
        )}

        <div className="flex items-center justify-center gap-5 text-xs" style={{ color: "#6E6963" }}>
          {["No spam, ever", "Free forever", "Unsubscribe anytime"].map(t => (
            <span key={t} className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" style={{ color: GOLD_DARK }} /> {t}
            </span>
          ))}
        </div>
        <p className="mt-4 text-xs" style={{ color: "#8A8580" }}>
          By subscribing, you agree to our{" "}
          <Link to="/privacy-policy" className="underline hover:text-brand-navy">Privacy Policy</Link>.
        </p>
      </div>
    </section>
  );
};

// ─────────────── Page ─────────────────────────────────────────────────────────
const Index = () => (
  <div className="min-h-screen bg-white">
    <SEO
      title="Karn HR Academy — HRM, Labour Welfare & Management Studies Resources"
      description="Notes, MCQs, previous year questions, and video lectures for UGC NET/JRF Labour Welfare, HRM and Management Studies — organised by syllabus for aspirants, MBA/BBA students, and HR professionals. Free."
      path="/"
    />
    <Header />
    <main id="main-content">
      {/* Order is the visitor's journey: pick a track → pick a subject →
          see it's alive → watch → trust the person → subscribe. Anything
          that repeated an earlier section (founder strip, resource-type
          tiles, popular-topic chips) has been cut. */}
      <Hero />
      <AudienceSplit />
      <CompactHowItWorks />
      <Subjects />
      <RecentlyAdded />
      <VideoLectures />
      <Testimonials />
      <BooksSection />
      <AboutAuthor />
      <Newsletter />
    </main>
    <Footer />
  </div>
);

export default Index;
