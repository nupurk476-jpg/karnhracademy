import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import {
  ArrowRight, BookOpen, Users, Target, Languages,
  GraduationCap, Scale, Repeat, Globe, Briefcase,
  MessageSquare, Video, HelpCircle, Download, FileText,
  CheckCircle2, ChevronRight, Clock, Award, Lightbulb,
  PlayCircle, BookMarked, Search, Zap, Shield, BarChart2,
} from "lucide-react";

// ─────────────── Brand tokens ────────────────────────────────────────────────
const NAVY  = "#16243f";
const GOLD  = "#c79a4b";
const LIGHT = "#f8f9fc";

// ─────────────── Data ────────────────────────────────────────────────────────
const STATS = [
  { value: "500+",  label: "Study Notes",       icon: FileText  },
  { value: "1000+", label: "Practice MCQs",     icon: HelpCircle },
  { value: "50+",   label: "Video Lectures",    icon: Video      },
  { value: "200+",  label: "Books Listed",      icon: BookMarked },
  { value: "10+",   label: "Subjects Covered",  icon: BookOpen   },
  { value: "5K+",   label: "Students Helped",   icon: Users      },
];

// Exactly mirrors disciplines.ts — same values, same order
const SUBJECTS = [
  { icon: BookOpen,      label: "Human Resource Management",          short: "HRM",     value: "hrm",     color: "#3B5BDB", bg: "#EDF2FF" },
  { icon: Users,         label: "Organisational Behaviour",           short: "OB",      value: "ob",      color: "#7048E8", bg: "#F3F0FF" },
  { icon: Target,        label: "Strategic Management",               short: "SM",      value: "sm",      color: "#0CA678", bg: "#EBFBEE" },
  { icon: Briefcase,     label: "Principles of Management",           short: "POM",     value: "pom",     color: "#E67E22", bg: "#FEF3E0" },
  { icon: MessageSquare, label: "Business Communication",             short: "BC",      value: "bc",      color: "#0891B2", bg: "#ECFEFF" },
  { icon: Scale,         label: "Corporate Governance & Business Ethics", short: "CG & BE", value: "cgbe", color: "#6B7280", bg: "#F9FAFB" },
  { icon: Repeat,        label: "OD & Change Management",             short: "OD & CM", value: "odcm",    color: "#DD6B20", bg: "#FFFAF0" },
  { icon: Globe,         label: "Global HR Practices",                short: "GHR",     value: "ghr",     color: "#319795", bg: "#E6FFFA" },
  { icon: Languages,     label: "English for Management",             short: "English", value: "english", color: "#5B5EA6", bg: "#EEF0FF" },
];

const WHY_CHOOSE = [
  { icon: FileText,     title: "Structured Study Notes",     desc: "Chapter-wise, topic-wise notes aligned to MBA & UGC NET syllabi. Downloadable PDFs for every subject.", color: "#3B5BDB", bg: "#EDF2FF" },
  { icon: Video,        title: "Expert Video Lectures",      desc: "Concept-clarity videos by HR academics. Watch, rewind, and master every topic at your own pace.",        color: "#7048E8", bg: "#F3F0FF" },
  { icon: HelpCircle,   title: "Topic-wise MCQ Quizzes",     desc: "Topic-wise MCQs with instant feedback and expert explanations — new quizzes added regularly.",          color: "#0CA678", bg: "#EBFBEE" },
  { icon: BookMarked,   title: "Curated Book Library",       desc: "Hand-picked books on HRM, OB, Strategy and Research Methodology with author notes and buy links.",        color: GOLD,      bg: "#FFF9DB" },
  { icon: BarChart2,    title: "HR Analytics Resources",     desc: "Data-driven HR content — workforce analytics, dashboards, and predictive tools explained clearly.",       color: "#0891B2", bg: "#ECFEFF" },
  { icon: Shield,       title: "UGC NET & Exam Ready",       desc: "All content is mapped to UGC NET Management, MBA entrance, and university examination patterns.",         color: "#E53E3E", bg: "#FFF5F5" },
];

const ROADMAP = [
  { step: "01", icon: Search,        title: "Choose a Subject",  desc: "Pick an HR & Management discipline — HRM and OB have full content now; more are being added." },
  { step: "02", icon: FileText,      title: "Study the Notes",   desc: "Read structured, exam-aligned study notes." },
  { step: "03", icon: PlayCircle,    title: "Watch Lectures",    desc: "Reinforce concepts with expert video lectures." },
  { step: "04", icon: HelpCircle,    title: "Practice MCQs",     desc: "Test yourself with topic-wise quizzes." },
  { step: "05", icon: Award,         title: "Master the Topic",  desc: "Achieve exam readiness and subject mastery." },
];

const TESTIMONIALS = [
  { name: "Priya Sharma",    role: "MBA HR Student, Delhi University",        text: "The notes are brilliantly structured. Cleared my semester exams using only Karn HR Academy — couldn't have done it without the topic-wise MCQs.", stars: 5, initial: "P" },
  { name: "Rahul Mehta",     role: "UGC NET Management Aspirant",             text: "Best free resource for UGC NET Management prep. The HR Analytics section especially — no other platform covers it this clearly.", stars: 5, initial: "R" },
  { name: "Dr. Anita Joshi", role: "Assistant Professor, Management Studies", text: "I recommend Karn HR Academy to all my students. The academic rigour and alignment to university syllabi is genuinely impressive.", stars: 5, initial: "A" },
  { name: "Vikram Nair",     role: "HR Manager, Pune",                        text: "As a working HR professional, I use this to stay current. The OD & Change Management notes are the most comprehensive I've found.", stars: 5, initial: "V" },
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
// All 9 subjects — values exactly match disciplines.ts
const HERO_SUBJECTS = [
  { label: "Human Resource Management",          value: "hrm",     color: "#3B5BDB" },
  { label: "Organisational Behaviour",           value: "ob",      color: "#7048E8" },
  { label: "Strategic Management",               value: "sm",      color: "#0CA678" },
  { label: "Principles of Management",           value: "pom",     color: "#E67E22" },
  { label: "Business Communication",             value: "bc",      color: "#0891B2" },
  { label: "Corporate Governance & Bus. Ethics", value: "cgbe",    color: "#6B7280" },
  { label: "OD & Change Management",             value: "odcm",    color: "#DD6B20" },
  { label: "Global HR Practices",                value: "ghr",     color: "#319795" },
  { label: "English for Management",             value: "english", color: "#5B5EA6" },
];

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
  <section className="relative overflow-hidden" style={{ background: NAVY }}>
    {/* Dot grid */}
    <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle,#fff 1px,transparent 1px)", backgroundSize: "26px 26px" }} />
    {/* Gold glow */}
    <div className="absolute -top-40 -left-32 w-96 h-96 rounded-full pointer-events-none opacity-20" style={{ background: `radial-gradient(circle,${GOLD},transparent 70%)` }} />

    <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 min-h-[88vh] items-center py-16 lg:py-0">

        {/* Left */}
        <div className="flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-7 w-fit" style={{ background: "rgba(199,154,75,0.12)", border: `1px solid ${GOLD}33` }}>
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: GOLD }} />
            <span className="text-xs font-semibold" style={{ color: GOLD }}>India's Premier HR Academic Portal</span>
          </div>

          <h1 className="font-extrabold text-white leading-[1.04] mb-5" style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(2.4rem,5vw,3.75rem)", letterSpacing: "-0.025em" }}>
            Complete Learning Platform for{" "}
            <span style={{ color: GOLD }}>HR & Management</span>{" "}
            Excellence
          </h1>

          <p className="text-base md:text-lg leading-relaxed mb-7 max-w-lg" style={{ color: "rgba(255,255,255,0.72)" }}>
            Structured notes, expert video lectures, curated books, and research resources — all aligned with MBA, BBA & UGC NET syllabi. Built by an educator, for serious learners.
          </p>

          {/* Audience pills */}
          <div className="flex flex-wrap gap-2 mb-9">
            {["MBA Students", "BBA Students", "HR Professionals", "UGC NET Aspirants", "Professors & Researchers"].map(a => (
              <span key={a} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.78)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <CheckCircle2 className="h-3 w-3" style={{ color: GOLD }} />{a}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 mb-10">
            <Link to="/notes" className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold transition-all hover:opacity-90 hover:-translate-y-0.5 shadow-lg" style={{ background: GOLD, color: NAVY, fontFamily: "'Sora',sans-serif", boxShadow: `0 6px 24px ${GOLD}40` }}>
              Start Learning Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/quizzes" className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold transition-all hover:-translate-y-0.5" style={{ border: `1.5px solid rgba(255,255,255,0.22)`, color: "#fff", background: "rgba(255,255,255,0.05)", fontFamily: "'Sora',sans-serif" }}>
              Practice MCQs
            </Link>
            <Link to="/lectures" className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold transition-all hover:-translate-y-0.5" style={{ border: `1.5px solid rgba(255,255,255,0.22)`, color: "#fff", background: "rgba(255,255,255,0.05)", fontFamily: "'Sora',sans-serif" }}>
              <PlayCircle className="h-4 w-4" /> Watch Lectures
            </Link>
          </div>
        </div>

        {/* Right: Live content snapshot — Option B layout (no bars) */}
        <div className="hidden lg:flex items-center justify-center">
          <div className="w-full max-w-md">
            {/* Card: no overflow:hidden so badge won't clip */}
            <div className="rounded-2xl shadow-2xl" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", backdropFilter: "blur(12px)" }}>

              {/* Card header — no star rating */}
              <div className="flex items-center gap-3 px-6 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl font-extrabold text-sm" style={{ background: GOLD, color: NAVY, fontFamily: "'Sora',sans-serif" }}>K</div>
                <div>
                  <p className="text-sm font-bold text-white" style={{ fontFamily: "'Sora',sans-serif" }}>Karn HR Academy</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Notes by subject — live from the library</p>
                </div>
              </div>

              {/* Subject rows — Option B: name + status label, no progress bars */}
              <div className="px-6 py-4 space-y-2.5">
                {HERO_SUBJECTS.map(s => {
                  const c = counts[s.value] || 0;
                  return (
                    <div key={s.value} className="flex items-center justify-between gap-3">
                      {/* Color dot */}
                      <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: s.color }} />
                      <span className="flex-1 text-xs font-medium" style={{ color: "rgba(255,255,255,0.80)" }}>{s.label}</span>
                      {c > 0 ? (
                        <span className="text-xs font-semibold tabular-nums" style={{ color: s.color }}>
                          {c} {c === 1 ? "note" : "notes"}
                        </span>
                      ) : (
                        /* Neutral gray — does not compete with gold CTA buttons */
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.45)" }}>
                          Coming Soon
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Total badge — inside the card at the bottom, no absolute overlap */}
              <div className="mx-6 mb-5 mt-1 flex items-center justify-between rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }}>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.50)" }}>Study notes in library</p>
                <p className="text-xl font-extrabold" style={{ color: "#fff", fontFamily: "'Sora',sans-serif" }}>
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

// ─────────────── Section: Stats bar ──────────────────────────────────────────
const StatsBar = () => {
  const [notesCount, setNotesCount] = useState<number | null>(null);
  const [quizCount, setQuizCount] = useState<number | null>(null);

  useEffect(() => {
    supabase.from("notes").select("id", { count: "exact", head: true }).then(({ count }) => setNotesCount(count ?? 0));
    supabase.from("quizzes").select("id", { count: "exact", head: true }).then(({ count }) => setQuizCount(count ?? 0));
  }, []);

  const liveStats = [
    { value: notesCount !== null ? String(notesCount) : "…",  label: "Study Notes",       icon: FileText  },
    { value: quizCount  !== null ? String(quizCount)  : "…",  label: "Practice MCQs",     icon: HelpCircle },
    { value: "50+",   label: "Video Lectures",    icon: Video      },
    { value: "200+",  label: "Books Listed",      icon: BookMarked },
    { value: "10",    label: "Subjects Covered",  icon: BookOpen   },
    { value: "Free",  label: "Always",            icon: Users      },
  ];

  return (
  <section style={{ background: GOLD }}>
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        {liveStats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex flex-col items-center text-center gap-1">
              <Icon className="h-5 w-5 mb-0.5" style={{ color: NAVY }} />
              <p className="text-xl font-extrabold leading-none" style={{ color: NAVY, fontFamily: "'Sora',sans-serif" }}>{s.value}</p>
              <p className="text-[11px] font-semibold leading-tight" style={{ color: `${NAVY}aa` }}>{s.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  </section>
  );
};

// ─────────────── Section: Why Choose ─────────────────────────────────────────
const WhyChoose = () => (
  <section className="py-20 md:py-24 bg-white">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-14">
        <GoldLabel text="Why Choose Us" />
        <SectionHeading center title="Everything You Need to Excel in HR & Management" sub="One platform covering notes, quizzes, lectures, books, and research — free for every learner." />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {WHY_CHOOSE.map(f => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="group rounded-2xl border p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg" style={{ borderColor: `${f.color}18`, background: "#fafafa" }}>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: f.bg }}>
                <Icon className="h-6 w-6" style={{ color: f.color }} />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-2" style={{ fontFamily: "'Sora',sans-serif" }}>{f.title}</h3>
              <p className="text-sm leading-relaxed text-slate-500">{f.desc}</p>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {SUBJECTS.map(s => {
          const Icon = s.icon;
          return (
            <Link key={s.label} to="/notes" className="group flex flex-col rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md" style={{ background: s.bg, borderColor: `${s.color}20` }}>
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

// ─────────────── Section: Learning Roadmap ───────────────────────────────────
const Roadmap = () => (
  <section className="py-20 md:py-24" style={{ background: NAVY }}>
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-14">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="h-px w-6 rounded-full" style={{ background: GOLD }} />
          <span className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: GOLD }}>Your Path to Mastery</span>
          <span className="h-px w-6 rounded-full" style={{ background: GOLD }} />
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight" style={{ fontFamily: "'Sora',sans-serif", letterSpacing: "-0.02em" }}>
          How It Works
        </h2>
        <p className="mt-3 max-w-xl mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
          Follow this proven 5-step path to go from complete beginner to exam-ready in any HR subject.
        </p>
      </div>

      <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Connector line (desktop) */}
        <div className="absolute top-10 left-0 right-0 h-px hidden lg:block" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}50, transparent)` }} />

        {ROADMAP.map((r, i) => {
          const Icon = r.icon;
          return (
            <div key={r.step} className="relative flex flex-col items-center text-center">
              {/* Step circle */}
              <div className="relative z-10 mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 shadow-lg" style={{ background: i === 0 ? GOLD : "rgba(255,255,255,0.06)", borderColor: i === 0 ? GOLD : "rgba(255,255,255,0.12)" }}>
                <Icon className="h-7 w-7" style={{ color: i === 0 ? NAVY : "#fff" }} />
              </div>
              <span className="text-[10px] font-bold tracking-widest mb-1.5" style={{ color: GOLD }}>STEP {r.step}</span>
              <h3 className="text-sm font-bold text-white mb-1.5" style={{ fontFamily: "'Sora',sans-serif" }}>{r.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.50)" }}>{r.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-12 text-center">
        <Link to="/notes" className="inline-flex items-center gap-2 rounded-lg px-7 py-3 text-sm font-bold transition-all hover:opacity-90" style={{ background: GOLD, color: NAVY, fontFamily: "'Sora',sans-serif" }}>
          Begin Your Journey <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  </section>
);

// ─────────────── Section: Featured Notes (live from DB) ──────────────────────
const FeaturedNotes = () => {
  const [notes, setNotes] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("notes").select("*").order("created_at", { ascending: false }).limit(3).then(({ data }) => data && setNotes(data));
  }, []);

  const subjectLabel: Record<string, { label: string; color: string }> = {
    hrm:    { label: "HRM",       color: "#3B5BDB" },
    ob:     { label: "OB",        color: "#7048E8" },
    sm:     { label: "SM",        color: "#0CA678" },
    pom:    { label: "POM",       color: "#E67E22" },
    bc:     { label: "BC",        color: "#0891B2" },
    cgbe:   { label: "CG & BE",   color: "#E53E3E" },
    odcm:   { label: "OD & CM",   color: "#DD6B20" },
    ghr:    { label: "Global HR", color: "#319795" },
    english:{ label: "English",   color: "#6B7280" },
  };

  const placeholders = [
    { title: "Introduction to HRM", description: "A comprehensive overview of Human Resource Management — its scope, objectives, and functions in modern organisations.", subject: "hrm" },
    { title: "Motivation Theories", description: "Maslow, Herzberg, McGregor & Vroom's theories explained with examples relevant to MBA & UGC NET preparation.", subject: "ob" },
    { title: "Strategic Management Framework", description: "SWOT, Porter's Five Forces, and BCG Matrix explained with real corporate case studies.", subject: "sm" },
  ];

  const items = notes.length > 0 ? notes : placeholders;

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((note: any, i: number) => {
            const sub = subjectLabel[note.subject] || { label: "HRM", color: "#3B5BDB" };
            return (
              <div key={note.id || i} className="group flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden">
                {/* Top color strip */}
                <div className="h-1.5 w-full" style={{ background: sub.color }} />
                <div className="flex flex-col flex-1 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="rounded-full px-3 py-0.5 text-xs font-bold" style={{ background: `${sub.color}15`, color: sub.color }}>{sub.label}</span>
                    {i === 0 && <span className="rounded-full px-3 py-0.5 text-xs font-bold bg-emerald-50 text-emerald-700">New</span>}
                    <span className="ml-auto flex items-center gap-1 text-xs text-slate-400"><Clock className="h-3 w-3" />5 min read</span>
                  </div>
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: `${sub.color}12` }}>
                      <FileText className="h-5 w-5" style={{ color: sub.color }} />
                    </div>
                    <h3 className="text-base font-bold text-slate-800 leading-snug group-hover:text-blue-700 transition-colors" style={{ fontFamily: "'Sora',sans-serif" }}>
                      {note.title}
                    </h3>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-500 flex-1 line-clamp-3 mb-5">
                    {note.description || "Comprehensive study material covering key concepts, definitions, and exam-focused explanations."}
                  </p>
                  <Link to="/notes" className="inline-flex items-center gap-1.5 text-sm font-bold transition-colors hover:gap-2.5" style={{ color: sub.color }}>
                    Download Notes <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// ─────────────── Section: Video Lectures ─────────────────────────────────────
const VideoLectures = () => {
  const [lectures, setLectures] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("lectures").select("*").order("created_at", { ascending: false }).limit(3).then(({ data }) => data && setLectures(data));
  }, []);

  const placeholders = [
    { title: "Introduction to HRM — Concepts & Functions",    subject: "hrm", duration_minutes: 28 },
    { title: "Motivation Theories — Maslow to Vroom",        subject: "ob",  duration_minutes: 35 },
    { title: "Porter's Five Forces Explained",               subject: "sm",  duration_minutes: 22 },
  ];

  const items = lectures.length > 0 ? lectures : placeholders;

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((lec: any, i: number) => (
            <div key={lec.id || i} className="group rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden">
              {/* Thumbnail */}
              <div className="relative flex items-center justify-center h-44 overflow-hidden" style={{ background: `linear-gradient(135deg, ${NAVY}ee, ${NAVY}bb)` }}>
                {lec.thumbnail_url
                  ? <img src={lec.thumbnail_url} alt={lec.title} className="absolute inset-0 h-full w-full object-cover opacity-60" />
                  : null}
                <PlayCircle className="relative z-10 h-14 w-14 text-white opacity-90 group-hover:scale-110 transition-transform" />
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
                <h3 className="text-base font-bold text-slate-800 leading-snug mb-2 line-clamp-2 group-hover:text-purple-700 transition-colors" style={{ fontFamily: "'Sora',sans-serif" }}>
                  {lec.title}
                </h3>
                {lec.description && <p className="text-sm text-slate-500 line-clamp-2 mb-3">{lec.description}</p>}
                <Link to="/lectures" className="inline-flex items-center gap-1.5 text-sm font-bold" style={{ color: "#7048E8" }}>
                  <PlayCircle className="h-4 w-4" /> Watch Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─────────────── Section: Books ───────────────────────────────────────────────
const BooksSection = () => {
  const [books, setBooks] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("book_recommendations").select("*").order("created_at", { ascending: false }).limit(4).then(({ data }) => data && setBooks(data));
  }, []);

  // OpenStax OB has a free open-access cover. Robbins, Dessler, Mello are
  // commercially published — no free official cover image available online.
  // Flag: add cover_image URLs via Supabase Admin for those three once you
  // have permission to use the images (e.g. from Amazon product pages or
  // publisher sites). The UI will automatically show them when present.
  const placeholders = [
    { title: "Human Resource Management",           author: "Gary Dessler",           description: "The definitive textbook covering all HRM functions, processes, and practices.",           cover_image: null },
    { title: "Organisational Behaviour",             author: "Stephen P. Robbins",     description: "Comprehensive coverage of OB concepts — motivation, leadership, group dynamics.",          cover_image: "https://openstax.org/apps/image-cdn/v1/f=webp/apps/cms/images/OrganizationalBehavior-bookcover.jpg" },
    { title: "Strategic Human Resource Management", author: "Jeffrey Mello",           description: "Connects HRM strategy to organisational goals and competitive advantage.",                 cover_image: null },
    { title: "HR Analytics",                        author: "Martin Edwards & Kirsten Edwards", description: "Practical guide to data-driven HR decision-making and workforce analytics.",  cover_image: null },
  ];

  const items = books.length > 0 ? books : placeholders;
  const bookColors = ["#3B5BDB", "#7048E8", "#0CA678", GOLD];

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((book: any, i: number) => (
            <div key={book.id || i} className="group flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden">
              {/* Cover area: real image if available, styled fallback otherwise */}
              <div className="relative flex items-center justify-center pt-6 pb-5 px-6 overflow-hidden" style={{ background: `linear-gradient(160deg, ${bookColors[i % 4]}18, ${bookColors[i % 4]}06)`, minHeight: "10rem" }}>
                {book.cover_image ? (
                  <img
                    src={book.cover_image}
                    alt={`Cover of ${book.title}`}
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
      </div>
    </section>
  );
};

// ─────────────── Section: Blog (magazine style) ───────────────────────────────
const BlogSection = () => {
  const [posts, setPosts] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("blog_posts").select("*").eq("published", true).order("created_at", { ascending: false }).limit(4).then(({ data }) => data && setPosts(data));
  }, []);

  const placeholders = [
    { title: "What is Strategic HRM? A Complete Guide",              excerpt: "Understanding how HR strategy aligns with organisational goals for sustainable competitive advantage.", category: "HRM Basics",      created_at: new Date().toISOString() },
    { title: "Motivation in the Workplace: Theories & Applications", excerpt: "Maslow, Herzberg, Vroom — how classic motivation theories apply to modern workplaces and exam questions.", category: "Organizational Behaviour", created_at: new Date().toISOString() },
    { title: "HR Analytics: Why Every HR Professional Needs It",     excerpt: "Data-driven HR is no longer optional. Here's why analytics skills are essential for modern HR professionals.", category: "HRM Basics", created_at: new Date().toISOString() },
    { title: "UGC NET Management: Complete Preparation Strategy",    excerpt: "A structured 90-day roadmap for UGC NET Management aspirants — subjects, resources, and time allocation.", category: "Research Methodology", created_at: new Date().toISOString() },
  ];

  const items = posts.length > 0 ? posts : placeholders;
  const catColors: Record<string, string> = {
    "HRM Basics": "#3B5BDB", "Organizational Behaviour": "#7048E8", "Research Methodology": "#0CA678",
    "Ethical HRM": "#E53E3E", "Quiet Quitting": "#DD6B20", "General Studies": "#6B7280", "Current Affairs": "#0891B2",
  };

  const [featured, ...rest] = items;

  const readTime = (content = "") => Math.max(3, Math.round((content || "").replace(/<[^>]+>/g, "").split(/\s+/).length / 200));

  return (
    <section className="py-20 md:py-24" style={{ background: LIGHT }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <GoldLabel text="Knowledge Articles" />
            <SectionHeading title="Insights & Research Articles" sub="In-depth articles by HR educators and researchers — exam prep meets real-world application." />
          </div>
          <Link to="/blogs" className="inline-flex items-center gap-1.5 text-sm font-bold flex-shrink-0 hover:underline" style={{ color: GOLD }}>
            All articles <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Featured left */}
          {featured && (
            <Link to={featured.slug ? `/blogs/${featured.slug}` : "/blogs"} className="group lg:col-span-3 flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-xl transition-all duration-200 overflow-hidden">
              <div className="relative h-56 lg:h-72 overflow-hidden" style={{ background: `linear-gradient(135deg, ${NAVY}, #2a3f6b)` }}>
                {featured.cover_image && <img src={featured.cover_image} alt={featured.title} className="absolute inset-0 h-full w-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-300" />}
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <span className="inline-block w-fit rounded-full px-3 py-0.5 text-xs font-bold mb-3" style={{ background: GOLD, color: NAVY }}>{featured.category}</span>
                  <h3 className="text-xl font-extrabold text-white leading-snug line-clamp-2" style={{ fontFamily: "'Sora',sans-serif" }}>{featured.title}</h3>
                </div>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <p className="text-sm leading-relaxed text-slate-500 line-clamp-3 mb-4 flex-1">{featured.excerpt || featured.description}</p>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>{featured.author_name || "Nupur Karn"}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{readTime(featured.content)} min read</span>
                  <span className="ml-auto inline-flex items-center gap-1 font-bold" style={{ color: catColors[featured.category] || GOLD }}>
                    Read Article <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          )}

          {/* Right stack */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {rest.slice(0, 3).map((post: any, i: number) => (
              <Link key={post.id || i} to={post.slug ? `/blogs/${post.slug}` : "/blogs"} className="group flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: `${catColors[post.category] || GOLD}15` }}>
                  <FileText className="h-5 w-5" style={{ color: catColors[post.category] || GOLD }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: catColors[post.category] || GOLD }}>{post.category}</span>
                  <h4 className="text-sm font-bold text-slate-800 leading-snug line-clamp-2 mb-1 group-hover:text-blue-700 transition-colors" style={{ fontFamily: "'Sora',sans-serif" }}>{post.title}</h4>
                  <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="h-3 w-3" />{readTime(post.content)} min read</span>
                </div>
              </Link>
            ))}
            <Link to="/blogs" className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-4 text-sm font-bold transition-colors hover:border-solid" style={{ borderColor: `${GOLD}50`, color: GOLD }}>
              View all articles <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
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
            <Link key={t} to="/notes" className="rounded-full border px-3.5 py-1.5 text-xs font-medium text-slate-600 transition-all hover:border-[#c79a4b] hover:text-[#c79a4b] hover:bg-amber-50" style={{ borderColor: "#e2e8f0" }}>
              {t}
            </Link>
          ))}
        </div>
      </div>
    </div>
  </section>
);

// ─────────────── Section: About the Author ────────────────────────────────────
const AboutAuthor = () => (
  <section className="py-20 md:py-24 bg-white">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Left: Profile */}
        <div className="flex flex-col items-start gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-extrabold text-white shadow-xl" style={{ background: `linear-gradient(135deg, ${NAVY}, #2a3f6b)`, fontFamily: "'Sora',sans-serif" }}>
                NK
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white shadow" style={{ background: GOLD }}>
                <Award className="h-3.5 w-3.5" style={{ color: NAVY }} />
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: GOLD }}>About the Author</p>
              <h3 className="text-xl font-extrabold text-slate-900" style={{ fontFamily: "'Sora',sans-serif" }}>Nupur Karn</h3>
              <p className="text-sm text-slate-500">HR Educator, Researcher & Academic Content Creator</p>
            </div>
          </div>

          <p className="text-slate-600 leading-relaxed">
            Nupur Karn is an HR educator and researcher with deep expertise in Human Resource Management, Organisational Behaviour, and Strategic HRM. With a passion for making complex HR concepts accessible, she has built Karn HR Academy as a comprehensive free knowledge hub for MBA students, BBA students, HR professionals, and UGC NET aspirants across India.
          </p>
          <p className="text-slate-600 leading-relaxed">
            All content on this platform is personally researched, structured, and aligned with current university and competitive exam syllabi — ensuring academic rigour while remaining practical and exam-ready.
          </p>

          <div className="flex flex-wrap gap-3">
            {["MBA (HR)", "UGC NET Management", "HR Research", "Academic Writing", "OB & Leadership"].map(t => (
              <span key={t} className="rounded-full border px-3 py-1 text-xs font-semibold text-slate-600" style={{ borderColor: "#e2e8f0", background: LIGHT }}>
                {t}
              </span>
            ))}
          </div>

          <Link to="/about" className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold transition-all hover:opacity-90" style={{ background: NAVY, color: "#fff", fontFamily: "'Sora',sans-serif" }}>
            Learn More <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Right: Achievements */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: BookOpen,   value: "10+",   label: "Subjects Covered",       color: "#3B5BDB", bg: "#EDF2FF" },
            { icon: FileText,   value: "500+",  label: "Notes Published",         color: "#7048E8", bg: "#F3F0FF" },
            { icon: HelpCircle, value: "1000+", label: "MCQs Created",            color: "#0CA678", bg: "#EBFBEE" },
            { icon: Users,      value: "5K+",   label: "Students Helped",         color: GOLD,      bg: "#FFF9DB" },
            { icon: BookMarked, value: "200+",  label: "Books Curated",           color: "#E53E3E", bg: "#FFF5F5" },
            { icon: Video,      value: "50+",   label: "Video Lectures",          color: "#0891B2", bg: "#ECFEFF" },
          ].map(item => {
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

// ─────────────── Section: Testimonials ───────────────────────────────────────
const Testimonials = () => (
  <section className="py-20 md:py-24" style={{ background: LIGHT }}>
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-14">
        <GoldLabel text="Student Reviews" />
        <SectionHeading center title="Loved by 5,000+ Students & Educators" sub="Real feedback from MBA students, UGC NET aspirants, and HR professionals." />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {TESTIMONIALS.map(t => (
          <div key={t.name} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex gap-0.5 mb-4">
              {[...Array(t.stars)].map((_,i) => <Star key={i} className="h-4 w-4 fill-[#c79a4b] text-[#c79a4b]" />)}
            </div>
            <p className="text-sm text-slate-600 leading-relaxed flex-1 mb-5">"{t.text}"</p>
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm text-white flex-shrink-0" style={{ background: NAVY, fontFamily: "'Sora',sans-serif" }}>{t.initial}</div>
              <div>
                <p className="text-sm font-bold text-slate-800">{t.name}</p>
                <p className="text-xs text-slate-500 leading-tight">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ─────────────── Section: Newsletter ─────────────────────────────────────────
const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    await supabase.from("email_subscribers").upsert({ email: email.trim() }, { onConflict: "email" });
    setLoading(false);
    setDone(true);
    setEmail("");
  };

  return (
    <section className="py-20 md:py-24 relative overflow-hidden" style={{ background: NAVY }}>
      <div className="absolute inset-0 pointer-events-none opacity-[0.05]" style={{ backgroundImage: "radial-gradient(circle,#fff 1px,transparent 1px)", backgroundSize: "24px 24px" }} />
      <div className="absolute top-0 right-0 w-96 h-96 pointer-events-none opacity-10 rounded-full" style={{ background: `radial-gradient(circle,${GOLD},transparent 70%)`, transform: "translate(40%,-40%)" }} />
      <div className="relative mx-auto max-w-2xl px-4 sm:px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="h-px w-6 rounded-full" style={{ background: GOLD }} />
          <Mail className="h-5 w-5" style={{ color: GOLD }} />
          <span className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: GOLD }}>Stay Updated</span>
          <span className="h-px w-6 rounded-full" style={{ background: GOLD }} />
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4" style={{ fontFamily: "'Sora',sans-serif", letterSpacing: "-0.02em" }}>
          Join the HR Learning Community
        </h2>
        <p className="mb-8 leading-relaxed" style={{ color: "rgba(255,255,255,0.60)" }}>
          New notes, MCQs, video lectures, and articles every week — curated for MBA, BBA, and UGC NET preparation. Free forever.
        </p>

        {done ? (
          <div className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)" }}>
            <CheckCircle2 className="h-5 w-5" /> You're subscribed — welcome to the community!
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-5">
            <input
              type="email" required
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="flex-1 rounded-xl px-5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c79a4b]/50"
              style={{ background: "rgba(255,255,255,0.95)" }}
            />
            <button type="submit" disabled={loading} className="rounded-xl px-6 py-3 text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60" style={{ background: GOLD, color: NAVY, fontFamily: "'Sora',sans-serif" }}>
              {loading ? "Subscribing…" : "Subscribe Free"}
            </button>
          </form>
        )}

        <div className="flex items-center justify-center gap-5 text-xs" style={{ color: "rgba(255,255,255,0.40)" }}>
          {["No spam, ever", "Free forever", "Unsubscribe anytime"].map(t => (
            <span key={t} className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─────────────── Page ─────────────────────────────────────────────────────────
const Index = () => (
  <div className="min-h-screen bg-white">
    <SEO
      title="Karn HR Academy — Complete HR & Management Learning Platform"
      description="Free study notes, video lectures, MCQs, and research resources for MBA, BBA & UGC NET aspirants in HR & Management. Built by an educator, for serious learners."
      path="/"
    />
    <Header />
    <main>
      <Hero />
      <StatsBar />
      <WhyChoose />
      <Subjects />
      <Roadmap />
      <FeaturedNotes />
      <VideoLectures />
      <BooksSection />
      <BlogSection />
      <PopularTopics />
      <AboutAuthor />
      <Testimonials />
      <Newsletter />
    </main>
    <Footer />
  </div>
);

export default Index;
