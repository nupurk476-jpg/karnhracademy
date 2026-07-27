import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import { HelpCircle, ChevronRight, Clock, Calendar, LayoutGrid, List } from "lucide-react";
import { DISCIPLINES, getTopicLabel, getDiscipline } from "@/lib/disciplines";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { formatDate } from "@/lib/format";

const PAGE_SIZE = 30;


const SORTS = [
  { value: "latest", label: "Latest" },
  { value: "oldest", label: "Oldest" },
  { value: "alpha", label: "A–Z" },
  { value: "questions", label: "Most Questions" },
] as const;

const QuizList = () => {
  const [searchParams] = useSearchParams();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  // ?q= lets the sitewide /search page deep-link to a specific quiz here.
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const requestedSubject = searchParams.get("subject");
  const hadUrlParam = !!(requestedSubject && DISCIPLINES.some(d => d.value === requestedSubject));
  const [activeSubject, setActiveSubject] = useState<string>(hadUrlParam ? requestedSubject! : "hrm");
  const [activeTopic, setActiveTopic] = useState("all");
  const [touched, setTouched] = useState(false);
  const [sort, setSort] = useState<(typeof SORTS)[number]["value"]>("latest");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    (async () => {
      const { data: quizData, error } = await supabase.from("quizzes").select("*").order("created_at", { ascending: false });
      if (error) { console.error("QuizList: failed to load quizzes", error); return; }
      // Drafts stay admin-only; rows predating the "published" column count as published.
      const published = (quizData ?? []).filter((q: any) => q.published !== false);
      setQuizzes(published);

      if (published.length > 0) {
        // Grouped server-side count (one small result set) with a fallback
        // to the old paged row-fetch when the RPC isn't applied yet.
        const quizIds = published.map((q: any) => q.id);
        const counts: Record<string, number> = {};
        const { data: grouped, error } = await (supabase.rpc as any)("quiz_question_counts", { _quiz_ids: quizIds });
        if (!error && grouped) {
          grouped.forEach((c: any) => { counts[c.quiz_id] = Number(c.question_count); });
        } else {
          const questions = await fetchAllRows<{ quiz_id: string }>(() =>
            supabase.from("quiz_questions").select("quiz_id").in("quiz_id", quizIds)
          );
          questions.forEach(q => { counts[q.quiz_id] = (counts[q.quiz_id] || 0) + 1; });
        }
        setQuestionCounts(counts);
      }
    })();
  }, []);

  // Single source of truth for "does this quiz belong to this discipline?"
  // (legacy quizzes were saved with subject = null before the column existed).
  const quizMatchesSubject = (q: any, value: string) =>
    value === "hrm" ? (!q.subject || q.subject === "hrm") : q.subject === value;

  const countFor = (value: string) => quizzes.filter(q => quizMatchesSubject(q, value)).length;

  // Content-first: if the visitor didn't request a subject and the default has no
  // quizzes, auto-select the first discipline that does, so they land on content.
  useEffect(() => {
    if (touched || hadUrlParam || quizzes.length === 0) return;
    if (countFor(activeSubject) > 0) return;
    const firstWithContent = DISCIPLINES.find(d => quizzes.some(q => quizMatchesSubject(q, d.value)));
    if (firstWithContent) setActiveSubject(firstWithContent.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizzes]);

  const filtered = useMemo(() => {
    const list = quizzes.filter(q => {
      if (search) {
        const term = search.toLowerCase();
        // Include the resolved topic label — a quiz's topic_slug shows up as
        // a badge on the card even when the title/description don't
        // literally contain that topic's name.
        const haystack = [q.title, q.description, q.topic, getTopicLabel(q.topic_slug)]
          .filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (!quizMatchesSubject(q, activeSubject)) return false;
      if (activeTopic !== "all" && q.topic_slug !== activeTopic) return false;
      return true;
    });
    const sorted = [...list];
    if (sort === "latest") sorted.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    if (sort === "oldest") sorted.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    if (sort === "alpha") sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    if (sort === "questions") sorted.sort((a, b) => (questionCounts[b.id] ?? 0) - (questionCounts[a.id] ?? 0));
    return sorted;
  }, [quizzes, search, activeSubject, activeTopic, sort, questionCounts]);

  // Reset pagination whenever the result set changes shape.
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search, activeSubject, activeTopic, sort]);
  const visible = filtered.slice(0, visibleCount);

  const activeDiscipline = DISCIPLINES.find(d => d.value === activeSubject);
  const subjectQuizzes = quizzes.filter(q => quizMatchesSubject(q, activeSubject));
  const topicsWithQuizzes = activeDiscipline
    ? activeDiscipline.topics.filter(t => subjectQuizzes.some(q => q.topic_slug === t.slug))
    : [];

  // ── Quiz renderers ───────────────────────────────────────────────────────
  const Badges = ({ quiz }: { quiz: any }) => (
    <>
      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
        {getDiscipline(quiz.subject || "hrm")?.short ?? "HRM"}
      </span>
      {quiz.topic_slug && (
        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent-deep">
          {getTopicLabel(quiz.topic_slug)}
        </span>
      )}
    </>
  );

  const Meta = ({ quiz }: { quiz: any }) => {
    const count = questionCounts[quiz.id] || 0;
    return (
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(quiz.created_at)}</span>
        <span>{count} question{count !== 1 ? "s" : ""}</span>
        {count > 0 && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> ~{count} min</span>}
      </span>
    );
  };

  const Actions = ({ quiz }: { quiz: any }) => (
    <div className="flex shrink-0 items-center gap-2">
      <Link to={`/quizzes/${quiz.id}`}
        className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground hover:brightness-110">
        Take Quiz <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );

  const CoverFallback = ({ size }: { size: "sm" | "lg" }) => (
    <div className={`flex h-full w-full items-center justify-center ${activeDiscipline?.iconBg ?? "bg-muted"}`}>
      <HelpCircle className={`${size === "lg" ? "h-10 w-10" : "h-5 w-5"} ${activeDiscipline?.iconColor ?? "text-muted-foreground"}`} />
    </div>
  );

  const ListRow = ({ quiz }: { quiz: any }) => (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-5 py-4 transition-shadow hover:shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <div className="hidden h-16 w-12 flex-shrink-0 overflow-hidden rounded border border-border sm:block">
          <CoverFallback size="sm" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold leading-snug text-foreground">{quiz.title}</h3>
            <Badges quiz={quiz} />
          </div>
          {quiz.description && <p className="mb-1.5 line-clamp-1 text-xs text-muted-foreground">{quiz.description}</p>}
          <Meta quiz={quiz} />
        </div>
      </div>
      <Actions quiz={quiz} />
    </div>
  );

  const GridCard = ({ quiz }: { quiz: any }) => (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md">
      <div className="relative h-40 w-full overflow-hidden border-b border-border">
        <CoverFallback size="lg" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-1.5 flex flex-wrap items-center gap-2"><Badges quiz={quiz} /></div>
        <h3 className="mb-1.5 text-base font-semibold leading-snug text-foreground">{quiz.title}</h3>
        {quiz.description && <p className="mb-3 line-clamp-2 flex-1 text-sm text-muted-foreground">{quiz.description}</p>}
        <div className="mb-3"><Meta quiz={quiz} /></div>
        <Actions quiz={quiz} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="MCQ Quizzes — HR & Management Assessment"
        description="Topic-wise MCQ quizzes for MBA, BBA, and UGC NET/JRF HR exam preparation. Instant results, detailed explanations, and progress tracking."
        path="/quizzes"
      />
      <Header />

      <main id="main-content" className="mx-auto max-w-6xl px-6 py-10">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "MCQs" }]} />
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">MCQs</h1>
            <p className="mt-1 text-muted-foreground">Pick your subject to practice topic-wise MCQs.</p>
          </div>
          <input
            type="text"
            aria-label="Search MCQs" placeholder="Search MCQs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:w-64"
          />
        </div>

        {/* Compact discipline selector */}
        <div className="mb-6 flex flex-wrap gap-2">
          {DISCIPLINES.map(d => {
            const Icon = d.icon;
            const count = countFor(d.value);
            const isActive = activeSubject === d.value;
            return (
              <button
                key={d.value}
                onClick={() => { setActiveSubject(d.value); setActiveTopic("all"); setTouched(true); }}
                aria-pressed={isActive}
                className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all ${
                  isActive ? d.activeColor + " shadow-sm" : count > 0 ? d.color + " hover:brightness-95" : "border-border bg-card text-muted-foreground/70 hover:bg-muted"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : count > 0 ? d.iconColor : ""}`} />
                <span className="whitespace-nowrap">{d.short}</span>
                {count > 0 && (
                  <span className={`rounded-full px-1.5 text-xs font-semibold ${isActive ? "bg-white/25 text-white" : "bg-white/80 text-foreground"}`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {activeDiscipline && (
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${activeDiscipline.color}`}>
                  <activeDiscipline.icon className={`h-5 w-5 ${activeDiscipline.iconColor}`} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{activeDiscipline.label}</h2>
                  <p className="text-sm text-muted-foreground">{activeDiscipline.description}</p>
                </div>
              </div>
              {/* Sort + view toggle */}
              <div className="flex items-center gap-2">
                <select value={sort} onChange={e => setSort(e.target.value as any)} aria-label="Sort MCQs"
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
                  {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <div className="flex overflow-hidden rounded-md border border-border">
                  <button onClick={() => setViewMode("list")} aria-label="List view" aria-pressed={viewMode === "list"}
                    className={`p-2 ${viewMode === "list" ? "bg-accent text-accent-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}>
                    <List className="h-4 w-4" />
                  </button>
                  <button onClick={() => setViewMode("grid")} aria-label="Grid view" aria-pressed={viewMode === "grid"}
                    className={`p-2 ${viewMode === "grid" ? "bg-accent text-accent-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}>
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Topic filter — only surface topics that actually have quizzes */}
            {topicsWithQuizzes.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveTopic("all")}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    activeTopic === "all" ? "bg-accent text-accent-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  All
                </button>
                {topicsWithQuizzes.map(t => (
                  <button
                    key={t.slug}
                    onClick={() => setActiveTopic(t.slug)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      activeTopic === t.slug ? "bg-accent text-accent-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {filtered.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 py-16 text-center">
                <HelpCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                {search.trim() ? (
                  <>
                    <p className="font-medium text-muted-foreground">No MCQs here match "{search}".</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This box only filters MCQs —{" "}
                      <Link to={`/search?q=${encodeURIComponent(search)}`} className="font-semibold text-accent-deep hover:underline">
                        search all of Karn HR Academy →
                      </Link>
                    </p>
                  </>
                ) : (
                  <>
                <p className="font-medium text-muted-foreground">No MCQs uploaded yet for {activeDiscipline.label}.</p>
                <p className="mt-1 text-sm text-muted-foreground">Check back soon — new material is added regularly.</p>
                  </>
                )}
              </div>
            ) : (
              <>
                <p className="mb-3 text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? "quiz" : "quizzes"}</p>
                {viewMode === "list" ? (
                  <div className="space-y-2.5">
                    {visible.map(quiz => <ListRow key={quiz.id} quiz={quiz} />)}
                  </div>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {visible.map(quiz => <GridCard key={quiz.id} quiz={quiz} />)}
                  </div>
                )}
                {visibleCount < filtered.length && (
                  <div className="mt-6 text-center">
                    <button onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                      className="rounded-md border border-border px-6 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
                      Load more ({filtered.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default QuizList;
