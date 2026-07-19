import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import { DISCIPLINES, getDiscipline, getTopicLabel } from "@/lib/disciplines";
import { Search, FileText, HelpCircle, Newspaper, BookOpen, ChevronRight } from "lucide-react";

// Route prefix for each discipline's static topic pages (lw has no per-topic
// pages — its content lives on the unit-wise hub instead).
const TOPIC_ROUTE_PREFIX: Record<string, string> = {
  hrm: "hr", ob: "ob", sm: "sm", pom: "pom", bc: "bc", odcm: "odcm", ghr: "ghr",
};

type Result = {
  kind: "note" | "quiz" | "blog" | "topic";
  title: string;
  description?: string;
  badge?: string;
  to: string;
  score: number;
};

// Relevance: a hit in the title far outweighs one buried in the description,
// and a title that *starts* with the query outranks one that merely contains
// it. Every query word must appear somewhere or the item is dropped.
function scoreItem(term: string, title: string, secondary: string, body: string): number {
  const words = term.toLowerCase().split(/\s+/).filter(Boolean);
  const t = (title || "").toLowerCase();
  const s = (secondary || "").toLowerCase();
  const b = (body || "").toLowerCase();
  let score = 0;
  for (const w of words) {
    if (t.includes(w)) score += 5;
    else if (s.includes(w)) score += 3;
    else if (b.includes(w)) score += 1;
    else return 0; // every word must match somewhere
  }
  if (t.startsWith(words[0] || "")) score += 2;
  if (t === term.toLowerCase()) score += 4;
  return score;
}

const KIND_META = {
  note:  { label: "Study Notes",  icon: FileText },
  quiz:  { label: "MCQ Quizzes",  icon: HelpCircle },
  blog:  { label: "Articles",     icon: Newspaper },
  topic: { label: "Topic Pages",  icon: BookOpen },
} as const;

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [input, setInput] = useState(q);
  const [notes, setNotes] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setInput(q); }, [q]);

  useEffect(() => {
    Promise.all([
      supabase.from("notes").select("id, title, description, subject, topic_slug, tags"),
      supabase.from("quizzes").select("id, title, topic, description, subject, topic_slug, published"),
      supabase.from("blog_posts").select("id, title, excerpt, slug, category, published"),
    ]).then(([n, qz, b]) => {
      if (n.data) setNotes(n.data);
      if (qz.data) setQuizzes(qz.data.filter((x: any) => x.published !== false));
      if (b.data) setBlogs(b.data.filter((x: any) => x.published !== false));
      setLoading(false);
    });
  }, []);

  const results = useMemo<Result[]>(() => {
    const term = q.trim();
    if (!term) return [];
    const out: Result[] = [];

    for (const n of notes) {
      const score = scoreItem(term, n.title,
        [getTopicLabel(n.topic_slug), ...(n.tags ?? [])].filter(Boolean).join(" "),
        n.description || "");
      if (score > 0) {
        const subj = n.subject || "hrm";
        out.push({
          kind: "note", title: n.title, description: n.description,
          badge: getDiscipline(subj)?.short,
          to: `/notes?subject=${subj}&q=${encodeURIComponent(n.title)}`,
          score,
        });
      }
    }

    for (const qz of quizzes) {
      const score = scoreItem(term, qz.title,
        [qz.topic, getTopicLabel(qz.topic_slug)].filter(Boolean).join(" "),
        qz.description || "");
      if (score > 0) out.push({
        kind: "quiz", title: qz.title, description: qz.description,
        badge: qz.subject ? getDiscipline(qz.subject)?.short : undefined,
        to: `/quizzes/${qz.id}`, score,
      });
    }

    for (const b of blogs) {
      const score = scoreItem(term, b.title, b.category || "", b.excerpt || "");
      if (score > 0) out.push({
        kind: "blog", title: b.title, description: b.excerpt, badge: b.category,
        to: b.slug ? `/blogs/${b.slug}` : "/blogs", score,
      });
    }

    for (const d of DISCIPLINES) {
      const prefix = TOPIC_ROUTE_PREFIX[d.value];
      if (!prefix) continue;
      for (const t of d.topics) {
        const score = scoreItem(term, t.label, d.label, "");
        if (score > 0) out.push({
          kind: "topic", title: t.label, badge: d.short,
          to: `/${prefix}/${t.slug}`, score,
        });
      }
    }

    return out.sort((a, b) => b.score - a.score);
  }, [q, notes, quizzes, blogs]);

  const grouped = useMemo(() => {
    const g: Partial<Record<Result["kind"], Result[]>> = {};
    for (const r of results) (g[r.kind] ??= []).push(r);
    return g;
  }, [results]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(input.trim() ? { q: input.trim() } : {});
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Search" description="Search study notes, MCQ quizzes, articles, and topic pages across Karn HR Academy." path="/search" noindex />
      <Header />
      <main id="main-content" className="mx-auto max-w-4xl px-6 py-10">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Search" }]} />
        <h1 className="mb-4 text-3xl font-bold text-foreground">Search</h1>

        <form onSubmit={submit} className="relative mb-8 max-w-xl">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Search notes, quizzes, topics, articles…"
            className="w-full rounded-xl border border-border bg-slate-50 py-3 pl-11 pr-24 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground hover:brightness-110">
            Search
          </button>
        </form>

        {!q.trim() ? (
          <p className="text-muted-foreground">Type what you're studying — an act, a theory, a committee, a topic — and we'll find every note, quiz, and article on it.</p>
        ) : loading ? (
          <p className="text-muted-foreground">Searching…</p>
        ) : results.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 py-14 text-center">
            <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">No results for "{q}"</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a shorter or more general term — e.g. "motivation" instead of a full sentence.</p>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-muted-foreground">{results.length} result{results.length === 1 ? "" : "s"} for <strong className="text-foreground">"{q}"</strong></p>
            {(Object.keys(KIND_META) as Array<keyof typeof KIND_META>).map(kind => {
              const items = grouped[kind];
              if (!items || items.length === 0) return null;
              const { label, icon: Icon } = KIND_META[kind];
              return (
                <section key={kind} className="mb-8">
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                    <Icon className="h-4 w-4 text-accent" /> {label}
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium">{items.length}</span>
                  </h2>
                  <div className="space-y-2">
                    {items.slice(0, 10).map((r, i) => (
                      <Link key={`${r.to}-${i}`} to={r.to} className="group flex items-start justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-shadow hover:shadow-sm">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">{r.title}</p>
                          {r.description && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{r.description}</p>}
                        </div>
                        <span className="flex shrink-0 items-center gap-2">
                          {r.badge && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{r.badge}</span>}
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent" />
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default SearchPage;
