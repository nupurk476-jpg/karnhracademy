import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import NoteCoverThumbnail from "@/components/NoteCoverThumbnail";
import { DISCIPLINES } from "@/lib/disciplines";
import { normalizeYouTubeThumbnail } from "@/lib/youtube";
import { useHoneypot } from "@/hooks/use-honeypot";
import {
  ArrowRight, BookOpen,
  Video, HelpCircle, FileText,
  CheckCircle2, ChevronRight, Clock, Award,
  PlayCircle, BookMarked, Search,
  Mail, HandHeart, ScrollText, Linkedin,
  BadgeCheck, Network, RefreshCw, Smartphone, GraduationCap,
} from "lucide-react";

// ─────────────── Brand tokens ────────────────────────────────────────────────
const NAVY  = "#1F4E79";
const NAVY_DARK = "#0D2A45";
const STEEL = "#5B8AB8";
const STEEL_DARK = "#3D6C98";
const GOLD  = "#C7994A";
const GOLD_DARK = "#A9823F";
const LIGHT = "#EEF0F8";

// ─────────────── Data ────────────────────────────────────────────────────────
// Hex colors for this page's custom (non-Tailwind-class) styling, keyed by
// discipline value. Everything else (label, short, value, icon, topics) is
// sourced from disciplines.ts so it can never drift out of sync.
const SUBJECT_HEX: Record<string, { color: string; bg: string }> = {
  hrm:     { color: NAVY,       bg: "#DCE6F1" },
  ob:      { color: STEEL_DARK, bg: "#EEF0F8" },
  sm:      { color: GOLD_DARK,  bg: "#F7F1E3" },
  pom:     { color: NAVY_DARK,  bg: "#E3EAF2" },
  bc:      { color: STEEL,      bg: "#EEF0F8" },
  odcm:    { color: GOLD,       bg: "#F7F1E3" },
  ghr:     { color: NAVY_DARK,  bg: "#DCE6F1" },
  lw:      { color: NAVY_DARK,  bg: "#E9EEF5" },
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

const TOPICS = [
  "Recruitment & Selection", "Performance Appraisal", "Motivation Theories",
  "Leadership Styles", "Job Analysis", "HR Planning", "HR Analytics",
  "Compensation & Benefits", "Training & Development", "OD & Change",
  "Talent Management", "Industrial Relations", "Business Ethics",
  "Strategic HRM", "Organisational Culture", "Employee Relations",
  "HR Metrics", "Collective Bargaining",
];

// ─────────────── Tiny reusable pieces ────────────────────────────────────────
const GoldLabel = ({ text }: { text: string }) => (
  <div className="flex items-center gap-2 mb-3">
    <span className="block h-px w-6 rounded-full" style={{ background: GOLD }} />
    <span className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: GOLD }}>{text}</span>
  </div>
);

const SectionHeading = ({ title, sub, center = false }: { title: string; sub?: string; center?: boolean }) => (
  <div className={center ? "text-center" : ""}>
    <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight" style={{ fontFamily: "'Sora',sans-serif", letterSpacing: "-0.02em" }}>
      {title}
    </h2>
    {sub && <p className="mt-3 text-slate-500 max-w-xl leading-relaxed" style={center ? { margin: "0.75rem auto 0" } : {}}>{sub}</p>}
  </div>
);

// ─────────────── Section: Hero ────────────────────────────────────────────────
const HERO_SUBJECTS = SUBJECTS.map(s => ({ label: s.label, value: s.value, color: s.color }));

const Hero = () => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [totalNotes, setTotalNotes] = useState<number | null>(null);

  useEffect(() => {
    supabase.from("notes").select("subject").then(({ data }) => {
      if (!data) return;
      setTotalNotes(data.length);
      const map: Record<string, number> = {};
      data.forEach((n: any) => {
        const key = n.subject || "hrm";
        map[key] = (map[key] || 0) + 1;
      });
      setCounts(map);
    });
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
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-7 w-fit" style={{ background: "rgba(199,153,74,0.12)", border: `1px solid ${GOLD}55` }}>
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: GOLD }} />
            <span className="text-xs font-semibold" style={{ color: GOLD_DARK }}>100% Free Academic Resource Platform</span>
          </div>

          <h1 className="font-extrabold leading-[1.08] mb-5" style={{ color: NAVY, fontFamily: "'Sora',sans-serif", fontSize: "clamp(1.9rem,3.9vw,3rem)", letterSpacing: "-0.02em" }}>
            Notes, MCQs &amp; PYQs for{" "}
            <span style={{ color: GOLD_DARK }}>UGC NET/JRF Labour Welfare</span>,{" "}
            HRM &amp; Management Studies
          </h1>

          <p className="text-sm md:text-base leading-relaxed mb-8 max-w-xl" style={{ color: "#4A6076" }}>
            A syllabus-based academic resource platform for UGC NET/JRF aspirants, MBA &amp; BBA students,
            university learners, and HR professionals — organised unit-by-unit, updated regularly, and free
            to use.
          </p>

          {/* CTAs — one primary, one secondary */}
          <div className="flex flex-wrap gap-3 mb-8">
            <Link to="/notes" className="inline-flex items-center gap-2 rounded-lg px-7 py-3 text-sm font-bold transition-all hover:opacity-90 hover:-translate-y-0.5 shadow-lg" style={{ background: GOLD, color: NAVY, fontFamily: "'Sora',sans-serif", boxShadow: `0 6px 24px ${GOLD}40` }}>
              Start Learning <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link to="/ugc-net-labour-welfare" className="inline-flex items-center gap-2 rounded-lg px-7 py-3 text-sm font-bold transition-all hover:-translate-y-0.5" style={{ border: `1.5px solid #C9D8E8`, color: NAVY, background: "#FFFFFF", fontFamily: "'Sora',sans-serif" }}>
              <ScrollText className="h-4 w-4" /> UGC NET/JRF Labour Welfare
            </Link>
          </div>

          {/* Trust badges — each with its own academic icon */}
          <ul className="flex flex-wrap gap-2 mb-10 max-w-xl" aria-label="Why learners trust Karn HR Academy">
            {[
              { icon: BadgeCheck,    label: "Latest UGC NET/JRF Syllabus" },
              { icon: BookOpen,      label: "Research-Based Content" },
              { icon: GraduationCap, label: "University-Oriented Learning" },
              { icon: Network,       label: "Diagram-Rich Visual Notes" },
              { icon: RefreshCw,     label: "Regularly Updated" },
              { icon: Smartphone,    label: "Mobile & Print Friendly" },
              { icon: FileText,      label: "Case Studies & Research Support" },
              { icon: Award,         label: "Designed by Academic Experts" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium" style={{ background: "#FFFFFF", color: STEEL_DARK, border: "1px solid #C9D8E8" }}>
                <Icon aria-hidden="true" className="h-3 w-3 flex-shrink-0" style={{ color: GOLD }} />{label}
              </li>
            ))}
          </ul>
        </div>

        {/* Right: Live content snapshot — Option B layout (no bars) */}
        <div className="hidden lg:flex items-center justify-center">
          <div className="w-full max-w-md">
            {/* Card: no overflow:hidden so badge won't clip */}
            <div className="rounded-2xl shadow-xl" style={{ background: "#FFFFFF", border: "1px solid #DCE6F1" }}>

              {/* Card header — no star rating */}
              <div className="flex items-center gap-3 px-6 pt-5 pb-4" style={{ borderBottom: "1px solid #EEF0F8" }}>
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl font-extrabold text-sm" style={{ background: GOLD, color: NAVY, fontFamily: "'Sora',sans-serif" }}>K</div>
                <div>
                  <p className="text-sm font-bold" style={{ color: NAVY, fontFamily: "'Sora',sans-serif" }}>Karn HR Academy</p>
                  <p className="text-xs" style={{ color: "#7A8FA6" }}>Notes by subject — live from the library</p>
                </div>
              </div>

              {/* Subject rows — only subjects with real content, so this card
                  never reads as "mostly empty". Repeating a "Coming Soon"
                  badge across every not-yet-populated subject undermined
                  trust more than just not mentioning them here at all. */}
              <div className="px-6 py-4 space-y-2.5">
                {(() => {
                  const withContent = HERO_SUBJECTS.filter(s => (counts[s.value] || 0) > 0);
                  if (withContent.length === 0) {
                    return (
                      <p className="text-xs" style={{ color: "#8296AC" }}>
                        New content added every week — check back soon.
                      </p>
                    );
                  }
                  return withContent.map(s => (
                    <div key={s.value} className="flex items-center justify-between gap-3">
                      {/* Color dot */}
                      <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: s.color }} />
                      <span className="flex-1 text-xs font-medium" style={{ color: "#33475C" }}>{s.label}</span>
                      <span className="text-xs font-semibold tabular-nums" style={{ color: s.color }}>
                        {counts[s.value]} {counts[s.value] === 1 ? "note" : "notes"}
                      </span>
                    </div>
                  ));
                })()}
              </div>

              {/* Total badge — inside the card at the bottom, no absolute overlap */}
              <div className="mx-6 mb-5 mt-1 flex items-center justify-between rounded-xl px-4 py-3" style={{ background: LIGHT, border: "1px solid #DCE6F1" }}>
                <p className="text-xs" style={{ color: "#64798F" }}>Study notes in library</p>
                <p className="text-xl font-extrabold" style={{ color: NAVY, fontFamily: "'Sora',sans-serif" }}>
                  {totalNotes !== null ? `${totalNotes}` : "…"}
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

// Real content counts, shared by StatsBar and AboutAuthor — replaces the
// fabricated static numbers both sections used to show independently.
function useContentCounts() {
  const [notesCount, setNotesCount] = useState<number | null>(null);
  const [quizCount, setQuizCount] = useState<number | null>(null);
  const [lecturesCount, setLecturesCount] = useState<number | null>(null);
  const [booksCount, setBooksCount] = useState<number | null>(null);

  useEffect(() => {
    supabase.from("notes").select("id", { count: "exact", head: true }).then(({ count }) => setNotesCount(count ?? 0));
    supabase.from("quizzes").select("id", { count: "exact", head: true }).then(({ count }) => setQuizCount(count ?? 0));
    supabase.from("lectures" as any).select("id", { count: "exact", head: true }).then(({ count }) => setLecturesCount(count ?? 0));
    supabase.from("book_recommendations").select("id", { count: "exact", head: true }).then(({ count }) => setBooksCount(count ?? 0));
  }, []);

  return { notesCount, quizCount, lecturesCount, booksCount };
}

// ─────────────── Section: Quick Access ───────────────────────────────────────
// The five student-facing formats the platform is actually organised
// around — placed right after the hero so a first-time visitor can jump
// straight to what they came for instead of scrolling through marketing
// copy first.
const QUICK_ACCESS = [
  { icon: HandHeart,  label: "UGC NET/JRF Labour Welfare", desc: "Unit-wise notes, MCQs & PYQs for Subject Code 55", to: "/ugc-net-labour-welfare", color: NAVY_DARK, bg: "#E3EAF2" },
  { icon: FileText,   label: "Notes",                      desc: "Exam-aligned notes across every discipline",        to: "/notes",                 color: NAVY,      bg: "#DCE6F1" },
  { icon: HelpCircle, label: "MCQs",                        desc: "Topic-wise quizzes with instant feedback",          to: "/quizzes",               color: STEEL_DARK, bg: "#EEF0F8" },
  { icon: ScrollText, label: "Previous Year Questions",     desc: "Real exam papers by subject and year",              to: "/pyqs",                  color: GOLD_DARK, bg: "#F7F1E3" },
  { icon: PlayCircle, label: "Video Lectures",               desc: "Concept-clarity lectures from HR educators",       to: "/lectures",              color: STEEL,     bg: "#EEF0F8" },
];

const QuickAccess = () => (
  <section className="py-14 md:py-16 bg-white border-b border-slate-100" aria-label="Quick access">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {QUICK_ACCESS.map(item => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.to}
              className="group flex flex-col rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              style={{ background: item.bg, borderColor: `${item.color}20` }}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: item.color }}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <p className="mb-1 text-sm font-bold leading-snug text-slate-800" style={{ fontFamily: "'Sora',sans-serif" }}>{item.label}</p>
              <p className="flex-1 text-xs leading-relaxed text-slate-500">{item.desc}</p>
              <div className="mt-3 flex items-center gap-1 text-xs font-semibold opacity-0 transition-opacity group-hover:opacity-100" style={{ color: item.color }}>
                Open <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  </section>
);

// ─────────────── Section: Compact "How It Works" strip ──────────────────────
// Replaces the old raw stats grid (132 notes / 50 quizzes / ...) right below
// the hero — a wall of numbers this early reads as "prove it to me" rather
// than helping a first-time visitor understand what to do next. This is the
// only "how it works" section on the page — the full illustrated version
// used to duplicate it further down and was removed as dead weight.
const CompactHowItWorks = () => (
  <section style={{ background: "#F7F1E3", borderTop: "1px solid #E8DCC0", borderBottom: "1px solid #E8DCC0" }}>
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
                <span className="text-xs font-semibold" style={{ color: NAVY, fontFamily: "'Sora',sans-serif" }}>{r.title}</span>
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
const Subjects = () => (
  <section id="subjects" className="py-20 md:py-24" style={{ background: LIGHT }}>
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
        <div>
          <GoldLabel text="Browse by Discipline" />
          <SectionHeading title="HR & Management. One Platform." sub="Deep resources for HRM and OB now live — more disciplines actively being added. Check the Notes page for availability." />
        </div>
        <Link to="/notes" className="inline-flex items-center gap-1.5 text-sm font-bold flex-shrink-0 hover:underline" style={{ color: GOLD }}>
          View all notes <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {/* Labour Welfare is deliberately left out of this grid — the
          LabourWelfareBanner section immediately below already gives it a
          full, dedicated promotion, so a plain tile here just repeated the
          same "go to the Labour Welfare hub" link a second time in a row. */}
      <div className="flex flex-wrap justify-center gap-4">
        {SUBJECTS.filter(s => s.value !== "lw").map(s => {
          const Icon = s.icon;
          return (
            <Link key={s.label} to="/notes" className="group flex w-[calc(50%-8px)] flex-col rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md sm:w-[calc(33.333%-11px)] lg:w-[calc(20%-13px)]" style={{ background: s.bg, borderColor: `${s.color}20` }}>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: s.color }}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: s.color }}>{s.short}</p>
              <p className="text-sm font-bold leading-snug text-slate-800 flex-1">{s.label}</p>
              <div className="mt-3 flex items-center gap-1 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: s.color }}>
                Explore <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  </section>
);

// ─────────────── Section: Labour Welfare feature banner ─────────────────────
// A framed callout for the one subject that has a full unit-wise hub (notes +
// MCQs + previous year papers across all 10 official units) rather than just
// a filtered notes view, so it doesn't get lost among the plain subject tiles.
const LabourWelfareBanner = () => {
  const [notesCount, setNotesCount] = useState<number | null>(null);
  const [quizCount, setQuizCount] = useState<number | null>(null);
  const [pyqCount, setPyqCount] = useState<number | null>(null);

  // Three independent queries (not Promise.all) — same pattern as
  // useContentCounts above, which avoids TypeScript trying to infer one
  // combined tuple type across differently-shaped Supabase query builders.
  useEffect(() => {
    supabase.from("notes").select("id", { count: "exact", head: true }).eq("subject", "lw")
      .then(({ count }) => setNotesCount(count ?? 0));
    (supabase.from("quizzes") as any).select("id", { count: "exact", head: true }).eq("subject", "lw")
      .then(({ count }: any) => setQuizCount(count ?? 0));
    (supabase.from("pyq_papers" as any) as any).select("id", { count: "exact", head: true }).eq("subject", "lw")
      .then(({ count }: any) => setPyqCount(count ?? 0));
  }, []);

  const stats = [
    { label: "Units", value: "10" },
    { label: "Notes", value: notesCount !== null ? String(notesCount) : "…" },
    { label: "MCQ Sets", value: quizCount !== null ? String(quizCount) : "…" },
    { label: "PYQ Papers", value: pyqCount !== null ? String(pyqCount) : "…" },
  ];

  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className="relative overflow-hidden rounded-3xl border-2 p-8 md:p-12"
          style={{ borderColor: NAVY_DARK, background: `linear-gradient(135deg, ${NAVY_DARK}0a, ${STEEL}0a)` }}
        >
          <div className="absolute -right-8 -top-8 h-32 w-32 rotate-45 rounded-2xl opacity-[0.06]" style={{ background: NAVY_DARK }} />
          <div className="absolute right-16 bottom-10 h-14 w-14 rotate-45 rounded-xl opacity-[0.10]" style={{ background: GOLD }} />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: NAVY_DARK }}>
                  <HandHeart className="h-4.5 w-4.5 text-white" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: NAVY_DARK }}>
                  UGC NET/JRF Paper II · Subject Code 55
                </span>
              </div>
              <h2 className="mb-3 text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl" style={{ fontFamily: "'Sora',sans-serif" }}>
                UGC NET/JRF Labour Welfare — our only fully unit-wise study hub
              </h2>
              <p className="mb-6 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
                Management, HRM, HRD &amp; IHRM, Organisational Behaviour, Industrial Relations &amp; Trade Unions,
                Industrial Disputes, Labour Legislation, Wages, Labour Welfare &amp; Social Security, and Labour
                Market — every one of the 10 official UGC NET/JRF units, with notes, MCQs, and previous year
                question papers all organised unit-by-unit.
              </p>
              <Link
                to="/ugc-net-labour-welfare"
                className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: NAVY_DARK, fontFamily: "'Sora',sans-serif" }}
              >
                <ScrollText className="h-4 w-4" /> Explore the Unit-wise Hub <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="flex gap-4 lg:gap-6 lg:border-l lg:pl-8" style={{ borderColor: `${NAVY_DARK}25` }}>
              {stats.map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-2xl font-extrabold" style={{ color: NAVY_DARK, fontFamily: "'Sora',sans-serif" }}>{s.value}</p>
                  <p className="text-[11px] font-semibold text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─────────────── Section: Featured Notes (live from DB) ──────────────────────
const FeaturedNotes = () => {
  const [notes, setNotes] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("notes").select("*").order("created_at", { ascending: false }).limit(3).then(({ data }) => data && setNotes(data));
  }, []);

  const subjectLabel: Record<string, { label: string; color: string }> = {
    hrm:    { label: "HRM",       color: NAVY },
    ob:     { label: "OB",        color: STEEL_DARK },
    sm:     { label: "SM",        color: GOLD_DARK },
    pom:    { label: "POM",       color: NAVY_DARK },
    bc:     { label: "BC",        color: STEEL },
    odcm:   { label: "OD & CM",   color: GOLD },
    ghr:    { label: "International HRM", color: NAVY_DARK },
  };

  return (
    <section className="py-20 md:py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <GoldLabel text="Study Notes" />
            <SectionHeading title="Featured Study Notes" sub="Exam-aligned, topic-wise notes for every major HR subject." />
          </div>
          <Link to="/notes" className="inline-flex items-center gap-1.5 text-sm font-bold flex-shrink-0 hover:underline" style={{ color: GOLD }}>
            Browse all notes <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {notes.length === 0 ? (
          <p className="text-sm text-slate-500">New notes are added regularly — check back soon.</p>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {notes.map((note: any, i: number) => {
            const sub = subjectLabel[note.subject] || { label: "HRM", color: NAVY };
            return (
              <div key={note.id || i} className="group flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden">
                {/* Cover page — real PDF page 1 when available, icon fallback otherwise */}
                <NoteCoverThumbnail fileUrl={note.file_url} title={note.title} subject={note.subject} topicSlug={note.topic_slug} size="lg" className="relative h-44 w-full overflow-hidden border-b border-slate-100">
                  <div className="flex h-full w-full items-center justify-center" style={{ background: `${sub.color}0d` }}>
                    <FileText className="h-10 w-10" style={{ color: `${sub.color}80` }} />
                  </div>
                </NoteCoverThumbnail>
                <div className="h-1.5 w-full" style={{ background: sub.color }} />
                <div className="flex flex-col flex-1 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="rounded-full px-3 py-0.5 text-xs font-bold" style={{ background: `${sub.color}15`, color: sub.color }}>{sub.label}</span>
                    {i === 0 && <span className="rounded-full px-3 py-0.5 text-xs font-bold bg-[#DCE6F1] text-[#1F4E79]">New</span>}
                  </div>
                  <h3 className="text-base font-bold text-slate-800 leading-snug mb-4 group-hover:text-[#1F4E79] transition-colors" style={{ fontFamily: "'Sora',sans-serif" }}>
                    {note.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-500 flex-1 line-clamp-3 mb-5">
                    {note.description || "Comprehensive study material covering key concepts, definitions, and exam-focused explanations."}
                  </p>
                  <Link to="/notes" className="-mx-2 inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-bold transition-colors hover:gap-2.5" style={{ color: sub.color }}>
                    Download Notes <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
        )}
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
          <Link to="/lectures" className="inline-flex items-center gap-1.5 text-sm font-bold flex-shrink-0 hover:underline" style={{ color: GOLD }}>
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
                <h3 className="text-base font-bold text-slate-800 leading-snug mb-2 line-clamp-2 group-hover:text-[#1F4E79] transition-colors" style={{ fontFamily: "'Sora',sans-serif" }}>
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
          <Link to="/books" className="inline-flex items-center gap-1.5 text-sm font-bold flex-shrink-0 hover:underline" style={{ color: GOLD }}>
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
                <h3 className="text-sm font-bold text-slate-800 mb-1 line-clamp-2 leading-snug" style={{ fontFamily: "'Sora',sans-serif" }}>{book.title}</h3>
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

// ─────────────── Section: Popular Topics ─────────────────────────────────────
const PopularTopics = () => (
  <section className="py-16 bg-white border-y border-slate-100">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <p className="text-sm font-bold text-slate-500 flex-shrink-0">Popular Topics:</p>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map(t => (
            <Link key={t} to="/notes" className="rounded-full border px-3.5 py-2 text-xs font-medium text-slate-600 transition-all hover:border-[#C7994A] hover:text-[#A9823F] hover:bg-[#F7F1E3]" style={{ borderColor: "#DCE6F1" }}>
              {t}
            </Link>
          ))}
        </div>
      </div>
    </div>
  </section>
);

// ─────────────── Section: Meet the Founder ───────────────────────────────────
// Set this to the founder's exact LinkedIn profile URL when available; the
// default is a safe public search for her name, so the button always works.
const FOUNDER_LINKEDIN = "https://www.linkedin.com/search/results/people/?keywords=Nupur%20Karn";
const FOUNDER_EMAIL = "contact@karnhracademy.com";

const FOUNDER_QUALIFICATIONS = [
  "UGC NET Qualified (Code 55)",
  "Assistant Professor",
  "PhD Scholar (Management)",
  "MBA (HR)",
  "Industry Experience in Banking & HR",
  "Author & Researcher",
];

const AboutAuthor = () => {
  const { notesCount, quizCount, lecturesCount, booksCount } = useContentCounts();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Same photo source the About page uses — a real photo uploaded to the
  // "educator" storage bucket appears here automatically, monogram otherwise.
  useEffect(() => {
    const { data } = supabase.storage.from("educator").getPublicUrl("profile.jpg");
    fetch(data.publicUrl, { method: "HEAD" }).then(res => {
      if (res.ok) setPhotoUrl(data.publicUrl);
    }).catch(() => {});
  }, []);

  const achievements = [
    { icon: BookOpen,   value: String(DISCIPLINES.length),                          label: "Subjects Covered", color: NAVY,       bg: "#DCE6F1" },
    { icon: FileText,   value: notesCount    !== null ? String(notesCount)    : "…", label: "Notes Published",  color: STEEL_DARK, bg: "#EEF0F8" },
    { icon: HelpCircle, value: quizCount     !== null ? String(quizCount)     : "…", label: "MCQs Created",     color: NAVY_DARK,  bg: "#E3EAF2" },
    { icon: BookMarked, value: booksCount    !== null ? String(booksCount)    : "…", label: "Books Curated",    color: GOLD_DARK,  bg: "#F7F1E3" },
    { icon: Video,      value: lecturesCount !== null ? String(lecturesCount) : "…", label: "Video Lectures",   color: STEEL,      bg: "#EEF0F8" },
    { icon: Award,      value: "10+",                                              label: "Years Teaching",   color: GOLD,       bg: "#F7F1E3" },
  ];
  return (
  <section className="py-20 md:py-24 bg-white" aria-labelledby="founder-heading">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Left: Founder card */}
        <div className="rounded-3xl border p-7 sm:p-9" style={{ borderColor: "#DCE6F1", background: "#fafafa" }}>
          <div className="mb-6 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <div className="relative flex-shrink-0">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl shadow-xl" style={{ background: `linear-gradient(135deg, ${NAVY}, ${STEEL})` }}>
                {photoUrl ? (
                  <img src={photoUrl} alt="Ms. Nupur Karn, founder of Karn HR Academy" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl font-extrabold text-white" style={{ fontFamily: "'Sora',sans-serif" }}>NK</span>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow" style={{ background: GOLD }}>
                <Award aria-hidden="true" className="h-4 w-4" style={{ color: NAVY }} />
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: GOLD }}>Meet the Founder</p>
              <h3 id="founder-heading" className="text-2xl font-extrabold text-slate-900" style={{ fontFamily: "'Sora',sans-serif" }}>Ms. Nupur Karn</h3>
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
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: NAVY, fontFamily: "'Sora',sans-serif" }}
            >
              <Linkedin aria-hidden="true" className="h-4 w-4" /> LinkedIn
            </a>
            <a
              href={`mailto:${FOUNDER_EMAIL}`}
              className="inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5"
              style={{ borderColor: "#C9D8E8", color: NAVY, background: "#FFFFFF", fontFamily: "'Sora',sans-serif" }}
            >
              <Mail aria-hidden="true" className="h-4 w-4" /> Email
            </a>
            <Link
              to="/blogs"
              className="inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5"
              style={{ borderColor: "#C9D8E8", color: NAVY, background: "#FFFFFF", fontFamily: "'Sora',sans-serif" }}
            >
              <ScrollText aria-hidden="true" className="h-4 w-4" /> Publications
            </Link>
          </div>
        </div>

        {/* Right: Achievements */}
        <div className="grid grid-cols-2 gap-4">
          {achievements.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl border p-5" style={{ background: item.bg, borderColor: `${item.color}18` }}>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: item.color }}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-2xl font-extrabold leading-none mb-1" style={{ color: item.color, fontFamily: "'Sora',sans-serif" }}>{item.value}</p>
                <p className="text-xs font-semibold text-slate-500">{item.label}</p>
              </div>
            );
          })}
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
    await supabase.from("email_subscribers").upsert({ email: email.trim() }, { onConflict: "email" });
    setLoading(false);
    setDone(true);
    setEmail("");
  };

  return (
    <section className="py-20 md:py-24 relative overflow-hidden" style={{ background: "#DCE6F1" }}>
      <div className="absolute inset-0 pointer-events-none opacity-[0.05]" style={{ backgroundImage: `radial-gradient(circle,${NAVY} 1px,transparent 1px)`, backgroundSize: "24px 24px" }} />
      <div className="absolute top-0 right-0 w-96 h-96 pointer-events-none opacity-15 rounded-full" style={{ background: `radial-gradient(circle,${GOLD},transparent 70%)`, transform: "translate(40%,-40%)" }} />
      <div className="relative mx-auto max-w-2xl px-4 sm:px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="h-px w-6 rounded-full" style={{ background: GOLD }} />
          <Mail className="h-5 w-5" style={{ color: GOLD_DARK }} />
          <span className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: GOLD_DARK }}>Stay Updated</span>
          <span className="h-px w-6 rounded-full" style={{ background: GOLD }} />
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ color: NAVY, fontFamily: "'Sora',sans-serif", letterSpacing: "-0.02em" }}>
          Join the HR Learning Community
        </h2>
        <p className="mb-8 leading-relaxed" style={{ color: "#4A6076" }}>
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
              className="flex-1 rounded-xl px-5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C7994A]/50"
              style={{ background: "#FFFFFF", border: "1px solid #C9D8E8" }}
            />
            <button type="submit" disabled={loading} className="rounded-xl px-6 py-3 text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60" style={{ background: GOLD, color: NAVY, fontFamily: "'Sora',sans-serif" }}>
              {loading ? "Subscribing…" : "Subscribe Free"}
            </button>
          </form>
        )}

        <div className="flex items-center justify-center gap-5 text-xs" style={{ color: "#64798F" }}>
          {["No spam, ever", "Free forever", "Unsubscribe anytime"].map(t => (
            <span key={t} className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" style={{ color: GOLD_DARK }} /> {t}
            </span>
          ))}
        </div>
        <p className="mt-4 text-xs" style={{ color: "#7A8FA6" }}>
          By subscribing, you agree to our{" "}
          <Link to="/privacy-policy" className="underline hover:text-[#1F4E79]">Privacy Policy</Link>.
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
      <Hero />
      <QuickAccess />
      <CompactHowItWorks />
      <Subjects />
      <LabourWelfareBanner />
      <FeaturedNotes />
      <VideoLectures />
      <BooksSection />
      <PopularTopics />
      <AboutAuthor />
      <Newsletter />
    </main>
    <Footer />
  </div>
);

export default Index;
