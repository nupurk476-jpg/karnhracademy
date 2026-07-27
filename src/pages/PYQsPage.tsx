import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import { EmptyState, PYQCard } from "@/components/LabourWelfareShared";
import { getDiscipline } from "@/lib/disciplines";
import { ScrollText, BookOpenCheck, Eye, History } from "lucide-react";

// General Previous Year Question paper browser — every paper, across every
// subject, in one flat list grouped by year. Not split into per-subject
// tabs: with one subject actually having content at a time, tabs just
// produced a wall of empty "0 papers" states. Each card still carries its
// own subject badge, so a mix of disciplines stays easy to tell apart once
// more than one has real papers.
const PYQsPage = () => {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [progress, setProgress] = useState<any[]>([]);

  // Cached sitewide — the same list backs search and the paper pages.
  const { data: pyqData, isPending: loading } = useQuery({
    queryKey: ["pyq-papers-all"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase.from("pyq_papers" as any) as any)
        .select("*").order("year", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const pyqs = useMemo(() => pyqData ?? [], [pyqData]);

  useEffect(() => {
    // Signed-in readers get a "continue where you left off" strip. RLS
    // already scopes rows to the current user; signed-out visitors just
    // get an empty result and no strip.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      (supabase.from("pyq_reading_progress" as any) as any)
        .select("pyq_id, last_page, total_pages, updated_at")
        .order("updated_at", { ascending: false })
        .limit(3)
        .then(({ data }: any) => { if (data) setProgress(data); });
    });
  }, []);

  // Only show papers that are genuinely mid-read — a finished paper (or a
  // one-page glance) isn't worth resurfacing.
  const continueReading = useMemo(
    () =>
      progress
        .map(pr => ({ ...pr, paper: pyqs.find(p => p.id === pr.pyq_id) }))
        .filter(pr => pr.paper && pr.last_page > 1 && (!pr.total_pages || pr.last_page < pr.total_pages)),
    [progress, pyqs],
  );

  const allYears = useMemo(() => Array.from(new Set(pyqs.map(p => p.year))).sort((a, b) => b - a), [pyqs]);
  const allTags = useMemo(() => {
    const set = new Set<string>();
    pyqs.forEach(p => (p.tags ?? []).forEach((t: string) => set.add(t)));
    return Array.from(set).sort();
  }, [pyqs]);

  const filtered = useMemo(() => pyqs.filter(p => {
    if (search) {
      const term = search.toLowerCase();
      const haystack = [p.title, String(p.year), ...(p.tags ?? [])].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    if (yearFilter !== "all" && p.year !== yearFilter) return false;
    if (tagFilter !== "all" && !(p.tags ?? []).includes(tagFilter)) return false;
    return true;
  }), [pyqs, search, yearFilter, tagFilter]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Previous Year Question Papers"
        description="Previous year question papers for UGC NET/JRF Labour Welfare, MBA/BBA HR, Organisational Behaviour, Strategic Management and other disciplines — organised by year."
        path="/pyqs"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Previous Year Question Papers — Karn HR Academy",
          description: "Previous year question papers across UGC NET/JRF Labour Welfare and MBA/BBA HR disciplines, organised by year.",
          isAccessibleForFree: true,
        }}
      />
      <Header />

      <main id="main-content" className="mx-auto max-w-6xl px-6 py-10">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Previous Year Questions" }]} />
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Previous Year Questions</h1>
            <p className="mt-1 text-muted-foreground">Real exam papers, organised by year.</p>
          </div>
          <input
            type="text"
            aria-label="Search papers" placeholder="Search papers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:w-64"
          />
        </div>

        {continueReading.length > 0 && (
          <section aria-labelledby="continue-reading-heading" className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <History className="h-4 w-4 text-accent-deep" />
              <h2 id="continue-reading-heading" className="text-sm font-bold uppercase tracking-wide text-foreground">Continue where you left off</h2>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {continueReading.map(pr => {
                const pct = pr.total_pages ? Math.round((pr.last_page / pr.total_pages) * 100) : null;
                return (
                  <Link
                    key={pr.pyq_id}
                    to={`/pyqs/view/${pr.pyq_id}`}
                    className="group flex flex-col gap-2 rounded-md border border-accent/40 bg-accent/5 p-4 transition-all hover:border-accent hover:shadow-sm"
                  >
                    <h3 className="text-sm font-semibold text-foreground line-clamp-1">{pr.paper.title}</h3>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-accent/15">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${pct ?? 15}%` }} />
                      </div>
                      <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                        Page {pr.last_page}{pr.total_pages ? ` of ${pr.total_pages}` : ""}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent-deep">
                      <BookOpenCheck className="h-3.5 w-3.5" /> Resume reading
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-accent/10 p-2">
                  <ScrollText className="h-5 w-5 text-accent-deep" />
                </div>
                <p className="text-sm text-muted-foreground">{filtered.length} paper{filtered.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {allYears.length > 0 && (
                  <select aria-label="Filter by year" value={yearFilter} onChange={e => setYearFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                    className="rounded-md border border-border bg-white px-2.5 py-1.5 text-xs text-foreground">
                    <option value="all">All Years</option>
                    {allYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                )}
                {allTags.length > 0 && (
                  <select aria-label="Filter by tag" value={tagFilter} onChange={e => setTagFilter(e.target.value)}
                    className="rounded-md border border-border bg-white px-2.5 py-1.5 text-xs text-foreground">
                    <option value="all">All Tags</option>
                    {allTags.map(t => <option key={t} value={t}>#{t}</option>)}
                  </select>
                )}
              </div>
            </div>

            {filtered.length === 0 ? (
              <EmptyState text="No previous year papers uploaded yet. Check back soon." />
            ) : (
              <div className="space-y-6">
                {Array.from(new Set(filtered.map(p => p.year))).sort((a, b) => b - a).map(year => (
                  <div key={year}>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{year}</p>
                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                      {filtered.filter(p => p.year === year).map(pyq => (
                        <PYQCard key={pyq.id} pyq={pyq} showSubject showViews />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default PYQsPage;
