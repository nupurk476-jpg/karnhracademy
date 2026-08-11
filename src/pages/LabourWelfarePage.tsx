import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useToast } from "@/hooks/use-toast";
import { useLabourWelfareContent } from "@/hooks/use-labour-welfare-content";
import { useDownloadGate } from "@/hooks/use-download-gate";
import {
  ChevronRight, FileText, HelpCircle, ScrollText, Search, BookOpenCheck,
  Layers, BookOpen, FileCheck2,
} from "lucide-react";
import { getTopicLabel } from "@/lib/disciplines";
import { LW_UNITS, getUnitForTopicSlug, getUnitByNumber, unitRoman } from "@/lib/labourWelfareUnits";
import { getSignedFileUrl, isPdfFile } from "@/lib/signedFileUrl";
import { EmptyState, NoteRow, QuizCard, PYQCard } from "@/components/LabourWelfareShared";
import { formatDate } from "@/lib/format";
import ExamInfoSection from "@/components/ExamInfoSection";


// ── Page ──────────────────────────────────────────────────────────────────────
const LabourWelfarePage = () => {
  const { notes, quizzes, questionCounts, pyqs, loading } = useLabourWelfareContent();
  const { request, openFree, GateDialog } = useDownloadGate();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState<number | "all">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "notes" | "mcqs" | "pyq">("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState<number | "all">("all");

  const recordNoteView = (note: any) => {
    supabase.rpc("increment_note_views" as any, { _note_id: note.id }).then(({ error }) => {
      if (error) console.error("view count failed", error);
    });
  };

  const openNote = (note: any, mode: "view" | "download") => {
    if (!note.file_url) { toast({ title: "No file attached to this note." }); return; }
    // PDFs read in the branded in-app viewer; PPTs (which browsers can't
    // render inline) and downloads use a signed URL — downloads keep the
    // one-time email gate.
    if (mode === "view" && isPdfFile(note.file_url)) { navigate(`/notes/view/${note.id}`); return; }
    const open = mode === "download" ? request : openFree;
    open(() => getSignedFileUrl(note.file_url, "notes", mode === "download"), () => recordNoteView(note));
  };

  const allTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach(n => (n.tags ?? []).forEach((t: string) => set.add(t)));
    pyqs.forEach(p => (p.tags ?? []).forEach((t: string) => set.add(t)));
    return Array.from(set).sort();
  }, [notes, pyqs]);

  const allYears = useMemo(() => Array.from(new Set(pyqs.map(p => p.year))).sort((a, b) => b - a), [pyqs]);

  // Matches against everything actually shown on a card — not just the raw
  // title/description — so searching a topic or unit name still finds
  // items whose title doesn't literally contain that phrase but whose
  // topic_slug/unit_tags badge does show it.
  const matchesSearch = (...values: (string | undefined | null)[]) =>
    !search || values.some(v => v?.toLowerCase().includes(search.toLowerCase()));

  const filteredNotes = useMemo(() => notes.filter(n => {
    if (typeFilter !== "all" && typeFilter !== "notes") return false;
    if (!matchesSearch(n.title, n.description, getTopicLabel(n.topic_slug), ...(n.tags ?? []))) return false;
    if (tagFilter !== "all" && !(n.tags ?? []).includes(tagFilter)) return false;
    if (unitFilter !== "all" && getUnitForTopicSlug(n.topic_slug)?.number !== unitFilter) return false;
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [notes, search, tagFilter, unitFilter, typeFilter]);

  const filteredQuizzes = useMemo(() => quizzes.filter(q => {
    if (typeFilter !== "all" && typeFilter !== "mcqs") return false;
    if (!matchesSearch(q.title, q.description, getTopicLabel(q.topic_slug))) return false;
    if (unitFilter !== "all" && getUnitForTopicSlug(q.topic_slug)?.number !== unitFilter) return false;
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [quizzes, search, unitFilter, typeFilter]);

  const filteredPyqs = useMemo(() => pyqs.filter(p => {
    if (typeFilter !== "all" && typeFilter !== "pyq") return false;
    const unitTitles = (p.unit_tags ?? []).map((n: number) => getUnitByNumber(n)?.title);
    if (!matchesSearch(p.title, ...(p.tags ?? []), ...unitTitles)) return false;
    if (tagFilter !== "all" && !(p.tags ?? []).includes(tagFilter)) return false;
    if (yearFilter !== "all" && p.year !== yearFilter) return false;
    if (unitFilter !== "all" && !(p.unit_tags ?? []).includes(unitFilter)) return false;
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [pyqs, search, tagFilter, yearFilter, unitFilter, typeFilter]);

  const latest = useMemo(() => {
    const combined = [
      ...notes.map(n => ({ kind: "note" as const, item: n, created_at: n.created_at })),
      ...quizzes.map(q => ({ kind: "quiz" as const, item: q, created_at: q.created_at })),
      ...pyqs.map(p => ({ kind: "pyq" as const, item: p, created_at: p.created_at })),
    ];
    return combined.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 6);
  }, [notes, quizzes, pyqs]);

  const clearFilters = () => { setSearch(""); setUnitFilter("all"); setTypeFilter("all"); setTagFilter("all"); setYearFilter("all"); };
  const activeFilterCount = [unitFilter !== "all", typeFilter !== "all", tagFilter !== "all", yearFilter !== "all", search !== ""].filter(Boolean).length;

  // Content whose topic doesn't map to any unit (uploaded with "All Topics",
  // or with a non-Labour-Welfare topic). Surfaced in their own section below
  // the units rather than silently dropped — otherwise a note the admin just
  // uploaded can be "missing" from the public hub with no explanation.
  const unassignedNotes = useMemo(
    () => filteredNotes.filter(n => !getUnitForTopicSlug(n.topic_slug)),
    [filteredNotes],
  );
  const unassignedQuizzes = useMemo(
    () => filteredQuizzes.filter(q => !getUnitForTopicSlug(q.topic_slug)),
    [filteredQuizzes],
  );

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="UGC NET Labour Welfare Notes, MCQs & PYQs"
        description="Free UGC NET/JRF Labour Welfare (Code 55) study material — unit-wise notes, syllabus, MCQs and previous year question papers covering all 10 units."
        path="/ugc-net-labour-welfare"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Course",
          name: "UGC NET/JRF Labour Welfare (Subject Code 55) — Unit-wise Study Hub",
          description: "Free unit-wise preparation covering all 10 official units of UGC NET/JRF Paper II Labour Welfare / Personnel Management / Industrial Relations / HRM — study notes, MCQs, and previous year question papers.",
          provider: { "@type": "EducationalOrganization", name: "Karn HR Academy", url: "https://karnhracademy.com" },
          isAccessibleForFree: true,
          inLanguage: "en",
          offers: { "@type": "Offer", price: "0", priceCurrency: "INR", category: "Free" },
          hasCourseInstance: {
            "@type": "CourseInstance",
            courseMode: "online",
            courseWorkload: "PT10H",
          },
        }}
      />
      <Header />

      <main id="main-content">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="border-b border-border bg-white">
          <div className="mx-auto max-w-6xl px-6 py-10">
            <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "UGC NET/JRF" }, { label: "Code 55 Labour Welfare" }]} />

            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent-deep">UGC NET/JRF Paper II · Subject Code 55</p>
            <h1 className="mb-3 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
              UGC NET/JRF Labour Welfare — Unit-wise Study Hub
            </h1>
            <p className="mb-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Complete UGC NET/JRF Code 55 study resources organised unit-wise according to the official
              syllabus — including notes, MCQs and previous year questions for focused exam preparation.
            </p>
            <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Covers Labour Welfare, HRM, Industrial Relations, Labour Legislation, Wages, Social Security and
              related areas.
            </p>

            <div className="flex flex-wrap gap-4 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-slate-50 px-3 py-1.5"><FileText className="h-3.5 w-3.5 text-accent-deep" /><strong className="text-foreground">{notes.length}</strong>&nbsp;Notes</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-slate-50 px-3 py-1.5"><HelpCircle className="h-3.5 w-3.5 text-accent-deep" /><strong className="text-foreground">{quizzes.length}</strong>&nbsp;MCQ Sets</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-slate-50 px-3 py-1.5"><ScrollText className="h-3.5 w-3.5 text-accent-deep" /><strong className="text-foreground">{pyqs.length}</strong>&nbsp;Previous Year Papers</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-slate-50 px-3 py-1.5"><Layers className="h-3.5 w-3.5 text-accent-deep" /><strong className="text-foreground">10</strong>&nbsp;Units</span>
            </div>
          </div>
        </section>

        {/* ── Recommended Study Path ───────────────────────────────────── */}
        <section className="border-b border-border bg-slate-50 py-4" aria-label="Recommended study path">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex items-center gap-2 overflow-x-auto sm:flex-wrap sm:justify-center sm:overflow-visible">
              {[
                { icon: Layers, label: "Understand the Syllabus" },
                { icon: FileText, label: "Study Unit-wise Notes" },
                { icon: HelpCircle, label: "Practise MCQs" },
                { icon: ScrollText, label: "Solve PYQs" },
                { icon: BookOpen, label: "Revise High-Scoring Topics" },
              ].map((step, i, steps) => {
                const Icon = step.icon;
                return (
                  <div key={step.label} className="flex flex-shrink-0 items-center gap-2">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-xs font-semibold text-foreground">{step.label}</span>
                    </div>
                    {i < steps.length - 1 && <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-accent-deep" />}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Exam Essentials (admin-managed quick-reference cards) ─────── */}
        <ExamInfoSection />

        {/* ── Browse by Unit ────────────────────────────────────────────── */}
        <section className="border-b border-border bg-slate-50 py-10">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="mb-4 text-lg font-bold text-foreground">Browse by Unit</h2>
            {/* Single column below 380px — see ExamInfoSection for the same fix. */}
            <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              {LW_UNITS.map(u => {
                const noteCount = notes.filter(n => getUnitForTopicSlug(n.topic_slug)?.number === u.number).length;
                const quizCount = quizzes.filter(q => getUnitForTopicSlug(q.topic_slug)?.number === u.number).length;
                return (
                  <Link
                    key={u.number}
                    to={`/ugc-net-labour-welfare/unit-${u.number}`}
                    className="flex flex-col items-start gap-1 rounded-lg border border-border bg-white p-3 text-left transition-colors hover:border-accent/50"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wide text-accent-deep">Unit {unitRoman(u.number)}</span>
                    <span className="text-sm font-semibold leading-snug text-foreground">{u.title}</span>
                    <span className="mt-1 text-[11px] text-muted-foreground">{noteCount} notes · {quizCount} MCQ sets</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Search + filters (browse across every unit on one page) ────── */}
        <section className="border-b border-border bg-white py-6">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1 lg:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text" aria-label="Search this page" placeholder="Search topics, notes, MCQs or PYQs…"
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-md border border-border bg-slate-50 py-2 pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(["all", "notes", "mcqs", "pyq"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      typeFilter === t ? "bg-accent text-accent-foreground" : "border border-border bg-white text-muted-foreground hover:bg-slate-50"
                    }`}
                  >
                    {t === "all" ? "All Types" : t === "notes" ? "Notes" : t === "mcqs" ? "MCQs" : "PYQ"}
                  </button>
                ))}

                <select aria-label="Filter by unit" value={unitFilter} onChange={e => setUnitFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                  className="rounded-md border border-border bg-white px-2.5 py-1.5 text-xs text-foreground">
                  <option value="all">All Units</option>
                  {LW_UNITS.map(u => <option key={u.number} value={u.number}>Unit {unitRoman(u.number)}</option>)}
                </select>

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

                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="text-xs font-medium text-accent-deep hover:underline">Clear filters</button>
                )}
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="mx-auto max-w-6xl px-6 py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <>
            {/* ── Unit-wise Notes ──────────────────────────────────────── */}
            <section id="notes" className="border-b border-border bg-slate-50 py-10">
            <div className="mx-auto max-w-6xl px-6">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-accent-deep" />
                <h2 className="text-xl font-bold text-foreground">Unit-wise Notes</h2>
              </div>
              <div className="space-y-2.5">
                {LW_UNITS.filter(u => unitFilter === "all" || unitFilter === u.number).map(u => {
                  const unitNotes = filteredNotes.filter(n => getUnitForTopicSlug(n.topic_slug)?.number === u.number);
                  return (
                    <details key={u.number} open={unitFilter === u.number} className="group rounded-lg border border-border bg-white">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                        <span className="text-sm font-semibold text-foreground">Unit {unitRoman(u.number)}: {u.title}</span>
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          {unitNotes.length} note{unitNotes.length !== 1 ? "s" : ""}
                          <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                        </span>
                      </summary>
                      <div className="border-t border-border p-4 pt-3">
                        {unitNotes.length === 0 ? (
                          <EmptyState text={`No notes uploaded yet for Unit ${unitRoman(u.number)}: ${u.title}.`} />
                        ) : (
                          <div className="space-y-2.5">
                            {unitNotes.map(note => (
                              <NoteRow key={note.id} note={note} onView={() => openNote(note, "view")} onDownload={() => openNote(note, "download")} />
                            ))}
                          </div>
                        )}
                      </div>
                    </details>
                  );
                })}
                {unitFilter === "all" && unassignedNotes.length > 0 && (
                  <details className="group rounded-lg border border-border bg-white">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                      <span className="text-sm font-semibold text-foreground">General / Cross-Unit Resources</span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {unassignedNotes.length} note{unassignedNotes.length !== 1 ? "s" : ""}
                        <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                      </span>
                    </summary>
                    <div className="border-t border-border p-4 pt-3">
                      <p className="mb-3 text-xs text-muted-foreground">
                        Reference material spanning multiple units or the syllabus as a whole.
                      </p>
                      <div className="space-y-2.5">
                        {unassignedNotes.map(note => (
                          <NoteRow key={note.id} note={note} onView={() => openNote(note, "view")} onDownload={() => openNote(note, "download")} />
                        ))}
                      </div>
                    </div>
                  </details>
                )}
              </div>
            </div>
            </section>

            {/* ── Unit-wise MCQs ───────────────────────────────────────── */}
            <section id="mcqs" className="border-b border-border bg-white py-10">
            <div className="mx-auto max-w-6xl px-6">
              <div className="mb-4 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-accent-deep" />
                <h2 className="text-xl font-bold text-foreground">Unit-wise MCQs</h2>
              </div>
              <div className="space-y-2.5">
                {LW_UNITS.filter(u => unitFilter === "all" || unitFilter === u.number).map(u => {
                  const unitQuizzes = filteredQuizzes.filter(q => getUnitForTopicSlug(q.topic_slug)?.number === u.number);
                  return (
                    <details key={u.number} open={unitFilter === u.number} className="group rounded-lg border border-border bg-white">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                        <span className="text-sm font-semibold text-foreground">Unit {unitRoman(u.number)}: {u.title}</span>
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          {unitQuizzes.length} MCQ set{unitQuizzes.length !== 1 ? "s" : ""}
                          <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                        </span>
                      </summary>
                      <div className="border-t border-border p-4 pt-3">
                        {unitQuizzes.length === 0 ? (
                          <EmptyState text={`No MCQs uploaded yet for Unit ${unitRoman(u.number)}: ${u.title}.`} />
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {unitQuizzes.map(q => (
                              <QuizCard key={q.id} quiz={q} questionCount={questionCounts[q.id] || 0} />
                            ))}
                          </div>
                        )}
                      </div>
                    </details>
                  );
                })}
                {unitFilter === "all" && unassignedQuizzes.length > 0 && (
                  <details className="group rounded-lg border border-border bg-white">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                      <span className="text-sm font-semibold text-foreground">General / Cross-Unit Resources</span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {unassignedQuizzes.length} MCQ set{unassignedQuizzes.length !== 1 ? "s" : ""}
                        <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                      </span>
                    </summary>
                    <div className="border-t border-border p-4 pt-3">
                      <p className="mb-3 text-xs text-muted-foreground">
                        Practice sets spanning multiple units or the syllabus as a whole.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {unassignedQuizzes.map(q => (
                          <QuizCard key={q.id} quiz={q} questionCount={questionCounts[q.id] || 0} />
                        ))}
                      </div>
                    </div>
                  </details>
                )}
              </div>
            </div>
            </section>

            {/* ── Previous Year Questions ──────────────────────────────── */}
            <section id="pyq" className="border-b border-border bg-brand-cream py-10">
            <div className="mx-auto max-w-6xl px-6">
              <div className="mb-4 flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-accent-deep" />
                <h2 className="text-xl font-bold text-foreground">Previous Year Questions</h2>
              </div>
              {filteredPyqs.length === 0 ? (
                <EmptyState text="No previous year papers uploaded yet. Check back soon — new papers are added regularly." />
              ) : (
                <div className="space-y-6">
                  {Array.from(new Set(filteredPyqs.map(p => p.year))).sort((a, b) => b - a).map(year => (
                    <div key={year}>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{year}</p>
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {filteredPyqs.filter(p => p.year === year).map(pyq => (
                          <PYQCard key={pyq.id} pyq={pyq} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </section>

            {/* ── Latest uploads ───────────────────────────────────────── */}
            {latest.length > 0 && (
              <section className="bg-white py-10">
              <div className="mx-auto max-w-6xl px-6">
                <div className="mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-accent-deep" />
                  <h2 className="text-xl font-bold text-foreground">Latest Uploads</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {latest.map(({ kind, item }) => (
                    <div key={`${kind}-${item.id}`} className="flex flex-col gap-1.5 rounded-md border border-border p-4">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-accent-deep">
                        {kind === "note" ? "Note" : kind === "quiz" ? "MCQ Set" : "Previous Year Paper"}
                      </span>
                      <h3 className="text-sm font-semibold leading-snug text-foreground line-clamp-2">{item.title}</h3>
                      <span className="text-[11px] text-muted-foreground">{formatDate(item.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
              </section>
            )}
          </>
        )}
      </main>

      <GateDialog />
      <Footer />
    </div>
  );
};

export default LabourWelfarePage;
