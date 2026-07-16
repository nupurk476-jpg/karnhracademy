import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronRight, FileText, HelpCircle, ScrollText, Search, Eye, Download,
  Calendar, Clock, Layers, BookOpen,
} from "lucide-react";
import { getTopicLabel } from "@/lib/disciplines";
import { LW_UNITS, getUnitForTopicSlug, getUnitByNumber, unitRoman } from "@/lib/labourWelfareUnits";

const SUBJECT = "lw";
const EMAIL_KEY = "khr_subscriber_email";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

// ── Content loading ──────────────────────────────────────────────────────────
function useLabourWelfareContent() {
  const [notes, setNotes] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [pyqs, setPyqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: noteData }, { data: quizData }, { data: pyqData }] = await Promise.all([
        supabase.from("notes").select("*").eq("subject", SUBJECT).order("created_at", { ascending: false }),
        (supabase.from("quizzes") as any).select("*").eq("subject", SUBJECT).order("created_at", { ascending: false }),
        (supabase.from("pyq_papers" as any) as any).select("*").eq("subject", SUBJECT).order("year", { ascending: false }),
      ]);
      if (cancelled) return;
      const publishedQuizzes = (quizData ?? []).filter((q: any) => q.published !== false);
      setNotes(noteData ?? []);
      setQuizzes(publishedQuizzes);
      setPyqs(pyqData ?? []);

      if (publishedQuizzes.length > 0) {
        const { data: questions } = await supabase
          .from("quiz_questions")
          .select("quiz_id")
          .in("quiz_id", publishedQuizzes.map((q: any) => q.id));
        if (!cancelled && questions) {
          const counts: Record<string, number> = {};
          questions.forEach((q: any) => { counts[q.quiz_id] = (counts[q.quiz_id] || 0) + 1; });
          setQuestionCounts(counts);
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return { notes, quizzes, questionCounts, pyqs, loading };
}

// ── Email gate (view/download), same one-time-ask pattern as /notes ─────────
function useDownloadGate() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const pending = useRef<{ url: string; onOpened: () => void } | null>(null);

  const request = (url: string | null | undefined, onOpened: () => void) => {
    if (!url) return;
    const saved = localStorage.getItem(EMAIL_KEY);
    if (saved) { onOpened(); window.open(url, "_blank"); return; }
    pending.current = { url, onOpened };
    setGateOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !pending.current) return;
    const { url, onOpened } = pending.current;
    const win = window.open("", "_blank");
    setSubmitting(true);
    await supabase.from("email_subscribers").upsert({ email: email.trim() }, { onConflict: "email" });
    setSubmitting(false);
    localStorage.setItem(EMAIL_KEY, email.trim());
    setGateOpen(false);
    setEmail("");
    pending.current = null;
    if (win) { onOpened(); win.location.href = url; } else { onOpened(); window.open(url, "_blank"); }
  };

  const GateDialog = () => (
    <Dialog open={gateOpen} onOpenChange={(open) => { if (!open) { setGateOpen(false); pending.current = null; } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter your email to continue</DialogTitle>
          <DialogDescription>One-time step — we'll remember you on this device and send occasional updates about new study materials.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="email" required autoFocus placeholder="your@email.com"
            value={email} onChange={e => setEmail(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50">
              {submitting ? "..." : "Continue"}
            </button>
            <button type="button" onClick={() => { setGateOpen(false); pending.current = null; }} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted">
              Cancel
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link to="/privacy-policy" className="text-accent hover:underline">Privacy Policy</Link>.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );

  return { request, GateDialog };
}

// ── Small shared bits ────────────────────────────────────────────────────────
const TagChip = ({ tag }: { tag: string }) => (
  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">#{tag}</span>
);

const EmptyState = ({ text }: { text: string }) => (
  <div className="rounded-lg border border-dashed border-border bg-muted/30 py-8 text-center">
    <p className="text-sm text-muted-foreground">{text}</p>
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────
const LabourWelfarePage = () => {
  const { notes, quizzes, questionCounts, pyqs, loading } = useLabourWelfareContent();
  const { request, GateDialog } = useDownloadGate();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState<number | "all">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "notes" | "mcqs" | "pyq">("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState<number | "all">("all");

  const unitSectionRef = useRef<HTMLDivElement>(null);

  const recordNoteView = (note: any) => {
    supabase.rpc("increment_note_views" as any, { _note_id: note.id }).then(({ error }) => {
      if (error) console.error("view count failed", error);
    });
  };
  const recordPyqView = (pyq: any) => {
    supabase.rpc("increment_pyq_views" as any, { _pyq_id: pyq.id }).then(({ error }: any) => {
      if (error) console.error("view count failed", error);
    });
  };

  const openNote = (note: any, mode: "view" | "download") => {
    if (!note.file_url) { toast({ title: "No file attached to this note." }); return; }
    const url = mode === "download" ? `${note.file_url}?download` : note.file_url;
    request(url, () => recordNoteView(note));
  };
  const openPyq = (pyq: any) => {
    if (!pyq.file_url) { toast({ title: "No file attached to this paper." }); return; }
    request(`${pyq.file_url}?download`, () => recordPyqView(pyq));
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

  const jumpToUnit = (n: number) => {
    setUnitFilter(n);
    unitSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const clearFilters = () => { setSearch(""); setUnitFilter("all"); setTypeFilter("all"); setTagFilter("all"); setYearFilter("all"); };
  const activeFilterCount = [unitFilter !== "all", typeFilter !== "all", tagFilter !== "all", yearFilter !== "all", search !== ""].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="UGC NET Labour Welfare — Unit-wise Notes, MCQs & PYQs"
        description="UGC NET Paper II Labour Welfare / Personnel Management / Industrial Relations / Labour & Social Welfare / HRM (Subject Code 55) — unit-wise study notes, MCQs and previous year question papers, organised across Units I–X."
        path="/ugc-net-labour-welfare"
      />
      <Header />

      <main>
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="border-b border-border bg-white">
          <div className="mx-auto max-w-6xl px-6 py-10">
            <nav className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Link to="/" className="hover:text-accent transition-colors">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-medium">UGC NET Labour Welfare</span>
            </nav>

            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">UGC NET Paper II · Subject Code 55</p>
            <h1 className="mb-3 text-3xl font-bold leading-tight text-foreground sm:text-4xl" style={{ fontFamily: "'Sora', sans-serif" }}>
              UGC NET Labour Welfare — Unit-wise Study Hub
            </h1>
            <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Labour Welfare / Personnel Management / Industrial Relations / Labour &amp; Social Welfare / Human Resource
              Management — structured strictly by the official syllabus, Units I through X. Notes, MCQs and previous
              year question papers are all organised unit-by-unit for focused exam preparation.
            </p>

            <div className="flex flex-wrap gap-4 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-slate-50 px-3 py-1.5"><FileText className="h-3.5 w-3.5 text-accent" /><strong className="text-foreground">{notes.length}</strong>&nbsp;Notes</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-slate-50 px-3 py-1.5"><HelpCircle className="h-3.5 w-3.5 text-accent" /><strong className="text-foreground">{quizzes.length}</strong>&nbsp;MCQ Sets</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-slate-50 px-3 py-1.5"><ScrollText className="h-3.5 w-3.5 text-accent" /><strong className="text-foreground">{pyqs.length}</strong>&nbsp;Previous Year Papers</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-slate-50 px-3 py-1.5"><Layers className="h-3.5 w-3.5 text-accent" /><strong className="text-foreground">10</strong>&nbsp;Units</span>
            </div>
          </div>
        </section>

        {/* ── Browse by Unit ────────────────────────────────────────────── */}
        <section className="border-b border-border bg-slate-50 py-10">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="mb-4 text-lg font-bold text-foreground">Browse by Unit</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {LW_UNITS.map(u => {
                const noteCount = notes.filter(n => getUnitForTopicSlug(n.topic_slug)?.number === u.number).length;
                const quizCount = quizzes.filter(q => getUnitForTopicSlug(q.topic_slug)?.number === u.number).length;
                const active = unitFilter === u.number;
                return (
                  <button
                    key={u.number}
                    onClick={() => jumpToUnit(u.number)}
                    className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors ${
                      active ? "border-accent bg-accent/5" : "border-border bg-white hover:border-accent/50"
                    }`}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wide text-accent">Unit {unitRoman(u.number)}</span>
                    <span className="text-sm font-semibold leading-snug text-foreground">{u.title}</span>
                    <span className="mt-1 text-[11px] text-muted-foreground">{noteCount} notes · {quizCount} MCQ sets</span>
                  </button>
                );
              })}
            </div>
            {unitFilter !== "all" && (
              <button onClick={() => setUnitFilter("all")} className="mt-3 text-xs font-medium text-accent hover:underline">
                Clear unit filter — show all units
              </button>
            )}
          </div>
        </section>

        {/* ── Search + filters ──────────────────────────────────────────── */}
        <section className="border-b border-border bg-white py-6">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1 lg:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text" placeholder="Search notes, MCQs, papers…"
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

                <select value={unitFilter} onChange={e => setUnitFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                  className="rounded-md border border-border bg-white px-2.5 py-1.5 text-xs text-foreground">
                  <option value="all">All Units</option>
                  {LW_UNITS.map(u => <option key={u.number} value={u.number}>Unit {unitRoman(u.number)}</option>)}
                </select>

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

                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="text-xs font-medium text-accent hover:underline">Clear filters</button>
                )}
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="mx-auto max-w-6xl px-6 py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div ref={unitSectionRef} className="mx-auto max-w-6xl px-6 py-10 space-y-14">

            {/* ── Unit-wise Notes ──────────────────────────────────────── */}
            <section id="notes">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-accent" />
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
                              <div key={note.id} className="flex flex-col gap-2 rounded-md border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                                    <h3 className="text-sm font-semibold text-foreground">{note.title}</h3>
                                    {note.topic_slug && (
                                      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                                        {getTopicLabel(note.topic_slug)}
                                      </span>
                                    )}
                                  </div>
                                  {note.description && <p className="mb-1 line-clamp-1 text-xs text-muted-foreground">{note.description}</p>}
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                    <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(note.created_at)}</span>
                                    {(note.tags ?? []).map((t: string) => <TagChip key={t} tag={t} />)}
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <button onClick={() => openNote(note, "view")} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted">
                                    <Eye className="h-3.5 w-3.5" /> View Notes
                                  </button>
                                  <button onClick={() => openNote(note, "download")} className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:brightness-110">
                                    <Download className="h-3.5 w-3.5" /> Download
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            </section>

            {/* ── Unit-wise MCQs ───────────────────────────────────────── */}
            <section id="mcqs">
              <div className="mb-4 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-accent" />
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
                              <div key={q.id} className="flex flex-col gap-2 rounded-md border border-border p-4">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <h3 className="text-sm font-semibold text-foreground">{q.title}</h3>
                                  {q.topic_slug && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">{getTopicLabel(q.topic_slug)}</span>}
                                </div>
                                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" /> {questionCounts[q.id] || 0} questions
                                </p>
                                <Link to={`/quizzes/${q.id}`} className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:brightness-110">
                                  Take Quiz <ChevronRight className="h-3.5 w-3.5" />
                                </Link>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            </section>

            {/* ── Previous Year Questions ──────────────────────────────── */}
            <section id="pyq">
              <div className="mb-4 flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-accent" />
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
                          <div key={pyq.id} className="flex flex-col gap-2 rounded-md border border-border p-4">
                            <h3 className="text-sm font-semibold text-foreground">{pyq.title}</h3>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {(pyq.unit_tags ?? []).map((n: number) => (
                                <span key={n} className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">Unit {unitRoman(n)}</span>
                              ))}
                              {(pyq.tags ?? []).map((t: string) => <TagChip key={t} tag={t} />)}
                            </div>
                            <button onClick={() => openPyq(pyq)} className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:brightness-110">
                              <Download className="h-3.5 w-3.5" /> Download Paper
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Latest uploads ───────────────────────────────────────── */}
            {latest.length > 0 && (
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-accent" />
                  <h2 className="text-xl font-bold text-foreground">Latest Uploads</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {latest.map(({ kind, item }) => (
                    <div key={`${kind}-${item.id}`} className="flex flex-col gap-1.5 rounded-md border border-border p-4">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-accent">
                        {kind === "note" ? "Note" : kind === "quiz" ? "MCQ Set" : "Previous Year Paper"}
                      </span>
                      <h3 className="text-sm font-semibold leading-snug text-foreground line-clamp-2">{item.title}</h3>
                      <span className="text-[11px] text-muted-foreground">{formatDate(item.created_at)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <GateDialog />
      <Footer />
    </div>
  );
};

export default LabourWelfarePage;
