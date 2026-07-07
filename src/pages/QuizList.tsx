import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { DISCIPLINES } from "@/lib/disciplines";
import {
  Search, ChevronRight, HelpCircle, Clock, BarChart3, Star,
  Layers, TrendingUp, BookOpen,
  CheckCircle2, Lightbulb, Award, Zap, Filter, ArrowRight,
  FileText, Video, Download, FolderOpen,
} from "lucide-react";

// ── Subject config ────────────────────────────────────────────────────────────
// Sourced from disciplines.ts so this can never drift out of sync with Notes/Admin.
const SUBJECTS = [
  { value: "all", label: "All Subjects", icon: Layers },
  ...DISCIPLINES.map(d => ({ value: d.value, label: d.label, icon: d.icon })),
];

const DIFFICULTIES = ["All", "Beginner", "Intermediate", "Advanced"];

const DURATIONS = [
  { label: "Any Duration", value: "any" },
  { label: "Under 10 min",  value: "short" },
  { label: "10–20 min",     value: "medium" },
  { label: "20+ min",       value: "long" },
];

const FEATURE_HIGHLIGHTS = [
  { icon: Zap,          title: "Instant Results",       desc: "Get your score and feedback immediately after each quiz." },
  { icon: Lightbulb,    title: "Detailed Explanations", desc: "Every question includes an expert explanation to reinforce learning." },
  { icon: Layers,       title: "Topic-wise Practice",   desc: "Filter quizzes by subject, topic, and difficulty level." },
  { icon: Award,        title: "Progress Tracking",     desc: "Track your performance over time on the leaderboard." },
];

const RELATED_RESOURCES = [
  { icon: FileText, label: "Study Notes",     to: "/notes" },
  { icon: Video,    label: "Video Lecture",   to: "/lectures" },
  { icon: Download, label: "Download PDF",    to: "/notes" },
  { icon: FolderOpen, label: "Case Study",   to: "/blogs" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function estimateMinutes(questionCount: number) {
  return Math.max(1, Math.round((questionCount * 60) / 60));
}

function getDifficulty(topic: string): "Beginner" | "Intermediate" | "Advanced" {
  const t = (topic || "").toLowerCase();
  if (t.includes("advanc") || t.includes("analytics") || t.includes("research") || t.includes("strategic")) return "Advanced";
  if (t.includes("intermedi") || t.includes("compensation") || t.includes("industrial") || t.includes("training")) return "Intermediate";
  return "Beginner";
}

const DIFFICULTY_COLOR: Record<string, string> = {
  Beginner:     "bg-[#F2F6FA] text-[#3D6C98] border-[#C9D8E8]",
  Intermediate: "bg-[#FAF5EA] text-[#8F6D33] border-[#E8DCC0]",
  Advanced:     "bg-[#E9EEF5] text-[#0D2A45] border-[#C0CEDD]",
};

function getSubjectForTopic(topic: string) {
  const t = (topic || "").toLowerCase();
  if (t.includes("vocabulary") || t.includes("grammar") || t.includes("verbal") || t.includes("comprehension") || t.includes("idiom") || t.includes("synonym")) return "english";
  if (t.includes("behaviour") || t.includes("motivation") || t.includes("perception") || t.includes("personality") || t.includes("leadership") || t.includes("group dynamics")) return "ob";
  if (t.includes("strateg")) return "sm";
  if (t.includes("governance") || t.includes("ethics") || t.includes("csr") || t.includes("esg")) return "cgbe";
  if (t.includes("global") || t.includes("international") || t.includes("expatriate") || t.includes("mnc")) return "ghr";
  if (t.includes("change") || t.includes(" od ") || t.includes("organisation development") || t.includes("organizational development")) return "odcm";
  if (t.includes("planning") || t.includes("organiz") || t.includes("direct") || t.includes("control") || t.includes("fayol") || t.includes("taylor") || t.includes("management theor")) return "pom";
  if (t.includes("communication") || t.includes("business letter") || t.includes("presentation") || t.includes("negotiation")) return "bc";
  if (t.includes("compensation") || t.includes("payroll") || t.includes("recruitment") || t.includes("training") || t.includes("industrial") || t.includes("analytics") || t.includes("hrm") || t.includes("talent") || t.includes("employee")) return "hrm";
  return "hrm";
}

// Quizzes created after the "subject" column was added carry a real discipline value
// (picked in Admin > Quizzes, same taxonomy as Notes). Older rows fall back to the
// keyword heuristic above.
function resolveSubject(quiz: any) {
  return quiz.subject || getSubjectForTopic(quiz.topic || "");
}

// ── QuizCard ──────────────────────────────────────────────────────────────────
const QuizCard = ({
  quiz,
  questionCount,
  rating,
  featured = false,
}: {
  quiz: any;
  questionCount: number;
  rating: { avg: number; count: number } | undefined;
  featured?: boolean;
}) => {
  const mins = estimateMinutes(questionCount);
  const difficulty = getDifficulty(quiz.topic || quiz.title);
  const subject = SUBJECTS.find(s => s.value === resolveSubject(quiz)) || SUBJECTS[1];
  const SubjectIcon = subject.icon;

  if (featured) {
    return (
      <div className="group grid lg:grid-cols-5 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm hover:shadow-md transition-all">
        {/* Left accent panel */}
        <div className="lg:col-span-2 relative flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 p-10">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10">
            <HelpCircle className="h-10 w-10 text-accent" />
          </div>
          <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground shadow">
            Featured Quiz
          </span>
          {/* Stats */}
          <div className="flex gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-foreground">{questionCount}</p>
              <p className="text-xs text-muted-foreground">Questions</p>
            </div>
            <div className="w-px bg-border" />
            <div>
              <p className="text-xl font-bold text-foreground">{mins}</p>
              <p className="text-xs text-muted-foreground">Minutes</p>
            </div>
            {rating && (
              <>
                <div className="w-px bg-border" />
                <div>
                  <p className="text-xl font-bold text-foreground">{rating.avg.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Rating</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right content */}
        <div className="lg:col-span-3 flex flex-col justify-between p-8">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-xs font-semibold ${DIFFICULTY_COLOR[difficulty]}`}>
                {difficulty}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-3 py-0.5 text-xs font-semibold text-primary">
                <SubjectIcon className="h-3 w-3" />{subject.label}
              </span>
            </div>
            <h2 className="mb-3 text-2xl font-bold text-foreground group-hover:text-accent transition-colors">
              {quiz.title}
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
              {quiz.description || `Test your understanding of ${quiz.topic || quiz.title}. This quiz covers key concepts aligned with MBA and UGC NET HR syllabi with instant feedback on every answer.`}
            </p>
            {/* Related Resources */}
            <div className="mb-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Related Resources</p>
              <div className="flex flex-wrap gap-2">
                {RELATED_RESOURCES.map(r => (
                  <Link key={r.label} to={r.to} onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-slate-50 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-accent hover:text-accent transition-colors">
                    <r.icon className="h-3.5 w-3.5" />{r.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <Link
            to={`/quizzes/${quiz.id}`}
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground hover:brightness-110 transition-all"
          >
            Start Quiz <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="flex items-start gap-4 p-5 pb-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-accent/10">
          <HelpCircle className="h-6 w-6 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${DIFFICULTY_COLOR[difficulty]}`}>
              {difficulty}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <SubjectIcon className="h-3 w-3" />{subject.label}
            </span>
          </div>
          <h3 className="text-base font-bold leading-snug text-foreground group-hover:text-accent transition-colors line-clamp-2">
            {quiz.title}
          </h3>
        </div>
      </div>

      {/* Description */}
      <p className="flex-1 px-5 pb-4 text-sm leading-relaxed text-muted-foreground line-clamp-2">
        {quiz.description || `Test your knowledge of ${quiz.topic || quiz.title} with this topic-focused MCQ quiz.`}
      </p>

      {/* Stats row */}
      <div className="mx-5 mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg bg-slate-50 px-4 py-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <HelpCircle className="h-3.5 w-3.5 text-accent" />
          <span><strong className="text-foreground">{questionCount}</strong> questions</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-accent" />
          <span>~{mins} min</span>
        </span>
        {rating && (
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-[#C7994A] text-[#C7994A]" />
            <strong className="text-foreground">{rating.avg.toFixed(1)}</strong>
            <span>({rating.count})</span>
          </span>
        )}
      </div>

      {/* Related resources */}
      <div className="px-5 pb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Related</p>
        <div className="flex flex-wrap gap-1.5">
          {RELATED_RESOURCES.map(r => (
            <Link key={r.label} to={r.to} onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 rounded border border-border bg-slate-50 px-2 py-1 text-xs text-muted-foreground hover:border-accent hover:text-accent transition-colors">
              <r.icon className="h-3 w-3" />{r.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="border-t border-border p-4">
        <Link
          to={`/quizzes/${quiz.id}`}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:brightness-110 transition-all"
        >
          Start Quiz <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const QuizList = () => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("all");
  const [topicSlug, setTopicSlug] = useState("all");
  const [difficulty, setDifficulty] = useState("All");
  const [duration, setDuration] = useState("any");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: quizData }, { data: questions }, { data: ratingData }] = await Promise.all([
        supabase.from("quizzes").select("*").order("created_at", { ascending: false }),
        supabase.from("quiz_questions").select("quiz_id"),
        supabase.from("quiz_ratings").select("quiz_id, rating"),
      ]);

      // Drafts stay admin-only; rows predating the "published" column count as published.
      if (quizData) setQuizzes(quizData.filter((q: any) => q.published !== false));

      if (questions) {
        const counts: Record<string, number> = {};
        questions.forEach(q => { counts[q.quiz_id] = (counts[q.quiz_id] || 0) + 1; });
        setQuestionCounts(counts);
      }

      if (ratingData) {
        const r: Record<string, { total: number; count: number }> = {};
        ratingData.forEach(rd => {
          if (!r[rd.quiz_id]) r[rd.quiz_id] = { total: 0, count: 0 };
          r[rd.quiz_id].total += rd.rating;
          r[rd.quiz_id].count++;
        });
        const mapped: Record<string, { avg: number; count: number }> = {};
        Object.entries(r).forEach(([id, v]) => { mapped[id] = { avg: v.total / v.count, count: v.count }; });
        setRatings(mapped);
      }
      setLoading(false);
    };
    load();
  }, []);

  const totalQuestions = useMemo(() => Object.values(questionCounts).reduce((a, b) => a + b, 0), [questionCounts]);
  const subjectsCovered = useMemo(() => new Set(quizzes.map(q => resolveSubject(q))).size, [quizzes]);

  const filtered = useMemo(() => quizzes.filter(q => {
    if (search && !q.title?.toLowerCase().includes(search.toLowerCase()) && !q.topic?.toLowerCase().includes(search.toLowerCase())) return false;
    if (subject !== "all" && resolveSubject(q) !== subject) return false;
    if (topicSlug !== "all" && q.topic_slug !== topicSlug) return false;
    if (difficulty !== "All" && getDifficulty(q.topic || q.title) !== difficulty) return false;
    if (duration !== "any") {
      const mins = estimateMinutes(questionCounts[q.id] || 10);
      if (duration === "short" && mins >= 10) return false;
      if (duration === "medium" && (mins < 10 || mins > 20)) return false;
      if (duration === "long" && mins <= 20) return false;
    }
    return true;
  }), [quizzes, search, subject, topicSlug, difficulty, duration, questionCounts]);

  // Sub-topic chips for the selected subject — only topics that actually have quizzes.
  const subTopics = useMemo(() => {
    if (subject === "all") return [];
    const d = DISCIPLINES.find(x => x.value === subject);
    if (!d) return [];
    const subjQuizzes = quizzes.filter(q => resolveSubject(q) === subject);
    return d.topics.filter(t => subjQuizzes.some(q => q.topic_slug === t.slug));
  }, [subject, quizzes]);

  const featured = filtered[0] ?? null;
  const rest = filtered.slice(1);

  // Group rest by subject
  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    rest.forEach(q => {
      const s = resolveSubject(q);
      if (!g[s]) g[s] = [];
      g[s].push(q);
    });
    return g;
  }, [rest]);

  const activeFiltersCount = [subject !== "all", topicSlug !== "all", difficulty !== "All", duration !== "any"].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <SEO
        title="MCQ Quizzes — HR & Management Assessment"
        description="Topic-wise MCQ quizzes for MBA, BBA, and UGC NET HR exam preparation. Instant results, detailed explanations, and progress tracking."
        path="/quizzes"
      />
      <Header />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
          {/* Breadcrumb */}
          <nav className="mb-5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-accent transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">MCQ Quizzes</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">Academic Assessment</p>
              <h1 className="mb-4 text-4xl font-bold leading-tight text-foreground" style={{ fontFamily: "'Sora', sans-serif" }}>
                Practice MCQs for<br />HR & Management
              </h1>
              <p className="mb-8 text-base leading-relaxed text-muted-foreground">
                Topic-wise quizzes designed for MBA, BBA, HR professionals, and UGC NET aspirants. Test your knowledge, get instant feedback, and track progress across all major HR subjects.
              </p>

              {/* Search */}
              <div className="relative max-w-lg mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search quizzes, topics, subjects…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-border bg-slate-50 pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent shadow-sm"
                />
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3">
                <a href="#quizzes" className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:brightness-110 transition-all">
                  Start Practicing <ArrowRight className="h-4 w-4" />
                </a>
                <a href="#subjects" className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-slate-50 transition-all">
                  Browse Subjects
                </a>
              </div>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-2 gap-4">
              {FEATURE_HIGHLIGHTS.map(f => (
                <div key={f.title} className="rounded-xl border border-border bg-slate-50 p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                    <f.icon className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="mb-1 text-sm font-bold text-foreground">{f.title}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      <div className="bg-[#DCE6F1] border-y border-[#C9D8E8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 divide-x divide-[#C9D8E8] sm:grid-cols-4">
            {[
              { value: quizzes.length,    label: "Quizzes Available",  icon: HelpCircle },
              { value: totalQuestions,    label: "Total Questions",    icon: BarChart3 },
              { value: subjectsCovered,   label: "Subjects Covered",  icon: BookOpen },
              { value: `${Math.round(totalQuestions * 1.5)}+`, label: "Practice Minutes", icon: Clock },
            ].map(stat => (
              <div key={stat.label} className="flex items-center gap-3 px-6 py-5">
                <stat.icon className="h-8 w-8 text-[#A9823F] flex-shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-[#1F4E79]">{stat.value}</p>
                  <p className="text-xs text-[#4A6076]">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Subject filter tabs ──────────────────────────────────────────── */}
      <div id="subjects" className="sticky top-16 z-30 bg-white border-b border-border shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-none">
            {SUBJECTS.map(s => {
              const Icon = s.icon;
              const active = subject === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => { setSubject(s.value); setTopicSlug("all"); }}
                  className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "bg-slate-100 text-muted-foreground hover:bg-slate-200 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {s.label}
                </button>
              );
            })}
          </div>
          {/* Sub-topic row — only when the selected subject has quizzes filed under topics */}
          {subTopics.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-none">
              <span className="flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sub topic:</span>
              <button
                onClick={() => setTopicSlug("all")}
                className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  topicSlug === "all" ? "bg-primary text-primary-foreground" : "bg-slate-100 text-muted-foreground hover:bg-slate-200"
                }`}
              >
                All
              </button>
              {subTopics.map(t => (
                <button
                  key={t.slug}
                  onClick={() => setTopicSlug(t.slug)}
                  className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    topicSlug === t.slug ? "bg-primary text-primary-foreground" : "bg-slate-100 text-muted-foreground hover:bg-slate-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div id="quizzes" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">

        {/* Filters + count bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading…" : `${filtered.length} quiz${filtered.length !== 1 ? "zes" : ""}`}
            {subject !== "all" && <span> in <strong className="text-foreground">{SUBJECTS.find(s => s.value === subject)?.label}</strong></span>}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                activeFiltersCount > 0
                  ? "border-accent bg-accent/5 text-accent"
                  : "border-border bg-white text-muted-foreground hover:text-foreground"
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              Filters {activeFiltersCount > 0 && <span className="rounded-full bg-accent px-1.5 text-xs text-accent-foreground">{activeFiltersCount}</span>}
            </button>
          </div>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="mb-6 rounded-xl border border-border bg-white p-5 shadow-sm">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Difficulty</label>
                <div className="flex flex-wrap gap-2">
                  {DIFFICULTIES.map(d => (
                    <button key={d} onClick={() => setDifficulty(d)} className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${difficulty === d ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:border-accent hover:text-accent"}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Duration</label>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map(d => (
                    <button key={d.value} onClick={() => setDuration(d.value)} className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${duration === d.value ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:border-accent hover:text-accent"}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => { setDifficulty("All"); setDuration("any"); setSubject("all"); setTopicSlug("all"); setSearch(""); }}
                  className="text-sm text-accent hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            <div className="h-64 w-full animate-pulse rounded-2xl bg-slate-200" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-72 animate-pulse rounded-xl bg-slate-200" />)}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white py-20 text-center">
            <HelpCircle className="mb-3 h-10 w-10 text-slate-300" />
            <p className="font-medium text-muted-foreground">No quizzes found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters or search term.</p>
            <button
              onClick={() => { setSearch(""); setSubject("all"); setTopicSlug("all"); setDifficulty("All"); setDuration("any"); }}
              className="mt-4 text-sm font-medium text-accent hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            {/* Featured quiz */}
            {featured && (
              <div className="mb-10">
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-accent">Featured</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <QuizCard
                  quiz={featured}
                  questionCount={questionCounts[featured.id] || 0}
                  rating={ratings[featured.id]}
                  featured
                />
              </div>
            )}

            {/* Grouped by subject */}
            {Object.keys(grouped).length > 0 && (
              Object.entries(grouped).map(([subjectValue, subjectQuizzes]) => {
                const subjectInfo = SUBJECTS.find(s => s.value === subjectValue) || SUBJECTS[1];
                const SubIcon = subjectInfo.icon;
                return (
                  <div key={subjectValue} className="mb-10">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
                          <SubIcon className="h-4 w-4 text-accent" />
                        </div>
                        <h2 className="text-base font-bold text-foreground">{subjectInfo.label}</h2>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                          {subjectQuizzes.length} quiz{subjectQuizzes.length !== 1 ? "zes" : ""}
                        </span>
                      </div>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {subjectQuizzes.map(q => (
                        <QuizCard
                          key={q.id}
                          quiz={q}
                          questionCount={questionCounts[q.id] || 0}
                          rating={ratings[q.id]}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}

            {/* If no grouping (single subject selected), show flat grid */}
            {Object.keys(grouped).length === 0 && rest.length === 0 && filtered.length === 1 && null}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default QuizList;
