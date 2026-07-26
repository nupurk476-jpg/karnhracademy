import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import { TagChip, EmptyState } from "@/components/LabourWelfareShared";
import { DISCIPLINES } from "@/lib/disciplines";
import { getUnitByNumber, unitRoman } from "@/lib/labourWelfareUnits";
import { ScrollText, BookOpenCheck, Eye } from "lucide-react";

// General, all-subjects Previous Year Question paper browser. The Labour
// Welfare hub (and its per-unit subpages) already show LW's own papers
// inline for people studying that syllabus specifically — this page is the
// other half: a real, indexable home for PYQs across every subject, since
// previously the only public PYQ surface on the whole site was hardcoded to
// subject="lw", leaving MBA/BBA-discipline papers with no page to live on.
const PYQsPage = () => {
  const [searchParams] = useSearchParams();
  const [pyqs, setPyqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const requestedSubject = searchParams.get("subject");
  const hadUrlParam = !!(requestedSubject && DISCIPLINES.some(d => d.value === requestedSubject));
  const [activeSubject, setActiveSubject] = useState<string>(hadUrlParam ? requestedSubject! : "lw");
  const [touched, setTouched] = useState(false);
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [tagFilter, setTagFilter] = useState("all");

  useEffect(() => {
    (supabase.from("pyq_papers" as any) as any)
      .select("*")
      .order("year", { ascending: false })
      .then(({ data, error }: any) => {
        if (error) { console.error("PYQsPage: failed to load papers", error); setLoading(false); return; }
        setPyqs(data ?? []);
        setLoading(false);
      });
  }, []);

  const countFor = (value: string) => pyqs.filter(p => p.subject === value).length;

  // Content-first: land on whichever subject actually has papers if the
  // default (Labour Welfare, today's only real source) turns out empty.
  useEffect(() => {
    if (touched || hadUrlParam || loading) return;
    if (countFor(activeSubject) > 0) return;
    const firstWithContent = DISCIPLINES.find(d => pyqs.some(p => p.subject === d.value));
    if (firstWithContent) setActiveSubject(firstWithContent.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pyqs, loading]);

  const subjectPyqs = useMemo(() => pyqs.filter(p => p.subject === activeSubject), [pyqs, activeSubject]);

  const allYears = useMemo(() => Array.from(new Set(subjectPyqs.map(p => p.year))).sort((a, b) => b - a), [subjectPyqs]);
  const allTags = useMemo(() => {
    const set = new Set<string>();
    subjectPyqs.forEach(p => (p.tags ?? []).forEach((t: string) => set.add(t)));
    return Array.from(set).sort();
  }, [subjectPyqs]);

  const filtered = useMemo(() => subjectPyqs.filter(p => {
    if (search) {
      const term = search.toLowerCase();
      const haystack = [p.title, String(p.year), ...(p.tags ?? [])].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    if (yearFilter !== "all" && p.year !== yearFilter) return false;
    if (tagFilter !== "all" && !(p.tags ?? []).includes(tagFilter)) return false;
    return true;
  }), [subjectPyqs, search, yearFilter, tagFilter]);

  const activeDiscipline = DISCIPLINES.find(d => d.value === activeSubject);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Previous Year Question Papers"
        description="Previous year question papers for UGC NET/JRF Labour Welfare and MBA/BBA HR, Organisational Behaviour, Strategic Management and other disciplines — organised by subject and year."
        path="/pyqs"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Previous Year Question Papers — Karn HR Academy",
          description: "Previous year question papers across UGC NET/JRF Labour Welfare and MBA/BBA HR disciplines, organised by subject and year.",
          isAccessibleForFree: true,
        }}
      />
      <Header />

      <main id="main-content" className="mx-auto max-w-6xl px-6 py-10">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Previous Year Questions" }]} />
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Previous Year Questions</h1>
            <p className="mt-1 text-muted-foreground">Real exam papers, organised by subject and year — pick a subject to browse.</p>
          </div>
          <input
            type="text"
            placeholder="Search papers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:w-64"
          />
        </div>

        {/* Subject selector */}
        <div className="mb-6 flex flex-wrap gap-2">
          {DISCIPLINES.map(d => {
            const Icon = d.icon;
            const count = countFor(d.value);
            const isActive = activeSubject === d.value;
            return (
              <button
                key={d.value}
                onClick={() => { setActiveSubject(d.value); setTouched(true); setYearFilter("all"); setTagFilter("all"); }}
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

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : activeDiscipline && (
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${activeDiscipline.color}`}>
                  <ScrollText className={`h-5 w-5 ${activeDiscipline.iconColor}`} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{activeDiscipline.label} — Previous Year Questions</h2>
                  <p className="text-sm text-muted-foreground">{subjectPyqs.length} paper{subjectPyqs.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {allYears.length > 0 && (
                  <select value={yearFilter} onChange={e => setYearFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                    className="rounded-md border border-border bg-white px-2.5 py-1.5 text-xs text-foreground">
                    <option value="all">All Years</option>
                    {allYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                )}
                {allTags.length > 0 && (
                  <select value={tagFilter} onChange={e => setTagFilter(e.target.value)}
                    className="rounded-md border border-border bg-white px-2.5 py-1.5 text-xs text-foreground">
                    <option value="all">All Tags</option>
                    {allTags.map(t => <option key={t} value={t}>#{t}</option>)}
                  </select>
                )}
              </div>
            </div>

            {filtered.length === 0 ? (
              <EmptyState text={`No previous year papers uploaded yet for ${activeDiscipline.label}. Check back soon.`} />
            ) : (
              <div className="space-y-6">
                {Array.from(new Set(filtered.map(p => p.year))).sort((a, b) => b - a).map(year => (
                  <div key={year}>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{year}</p>
                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                      {filtered.filter(p => p.year === year).map(pyq => (
                        <div key={pyq.id} className="flex flex-col gap-2 rounded-md border border-border bg-card p-4">
                          <h3 className="text-sm font-semibold text-foreground">{pyq.title}</h3>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {(pyq.unit_tags ?? []).map((n: number) => (
                              <span key={n} className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                                Unit {unitRoman(n)}{getUnitByNumber(n) ? `: ${getUnitByNumber(n)!.title}` : ""}
                              </span>
                            ))}
                            {(pyq.tags ?? []).map((t: string) => <TagChip key={t} tag={t} />)}
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            {(pyq.view_count ?? 0) > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Eye className="h-3 w-3" /> {pyq.view_count} views</span>
                            ) : <span />}
                            <Link to={`/pyqs/view/${pyq.id}`} className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:brightness-110">
                              <BookOpenCheck className="h-3.5 w-3.5" /> View Online
                            </Link>
                          </div>
                        </div>
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
