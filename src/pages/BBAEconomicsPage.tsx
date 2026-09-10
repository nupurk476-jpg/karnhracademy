import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useBBAEconomicsContent } from "@/hooks/use-bba-economics-content";
import { useDownloadGate } from "@/hooks/use-download-gate";
import { getSignedFileUrl, isPdfFile } from "@/lib/signedFileUrl";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EmptyState, NoteRow, QuizCard, PYQCard } from "@/components/LabourWelfareShared";
import { getBBAEcoUnitByNumber, getBBAEcoUnitForTopicSlug, BBA_ECO_UNITS, unitRoman } from "@/lib/economicsUnits";
import {
  TrendingUp, FileText, HelpCircle, PlayCircle, BookOpen,
  ChevronRight, ScrollText, GraduationCap,
} from "lucide-react";

const BBAEconomicsPage = () => {
  const { notes, quizzes, questionCounts, pyqs, lectures, loading } = useBBAEconomicsContent();
  const { request, openFree, GateDialog } = useDownloadGate();
  const { toast } = useToast();
  const navigate = useNavigate();

  const recordNoteView = (note: any) => {
    supabase.rpc("increment_note_views" as any, { _note_id: note.id }).then(({ error }) => {
      if (error) console.error("view count failed", error);
    });
  };

  const openNote = (note: any, mode: "view" | "download") => {
    if (!note.file_url) { toast({ title: "No file attached to this note." }); return; }
    if (mode === "view" && isPdfFile(note.file_url)) { navigate(`/notes/view/${note.id}`); return; }
    const open = mode === "download" ? request : openFree;
    open(() => getSignedFileUrl(note.file_url, "notes", mode === "download"), () => recordNoteView(note));
  };

  const notesForUnit = useMemo(() =>
    (n: number) => notes.filter(x => getBBAEcoUnitForTopicSlug(x.topic_slug)?.number === n),
    [notes],
  );
  const quizzesForUnit = useMemo(() =>
    (n: number) => quizzes.filter(x => getBBAEcoUnitForTopicSlug(x.topic_slug)?.number === n),
    [quizzes],
  );
  const pyqsForUnit = useMemo(() =>
    (n: number) => pyqs.filter((p: any) => (p.unit_tags ?? []).includes(n)),
    [pyqs],
  );
  const lecturesForUnit = useMemo(() =>
    (n: number) => lectures.filter((l: any) => getBBAEcoUnitForTopicSlug(l.topic_slug)?.number === n),
    [lectures],
  );

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="BBA Business Economics — Unit-wise Notes, MCQs & Video Lectures"
        description="Free unit-wise study resources for BBA Business Economics — demand & supply, market equilibrium, production & cost, market structures, national income and Indian economy. Notes, MCQ practice sets and video lectures."
        path="/bba-economics"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Course",
          name: "BBA Business Economics Study Hub",
          description: "Free notes, MCQ practice and video lectures across 5 units of BBA Business Economics.",
          provider: { "@type": "EducationalOrganization", name: "Karn HR Academy", url: "https://karnhracademy.com" },
          isAccessibleForFree: true,
          inLanguage: "en",
          hasCourseInstance: { "@type": "CourseInstance", courseMode: "online" },
        }}
      />
      <Header />

      <main id="main-content">
        {/* ── Hero ────────────────────────────────────────────────────── */}
        <section className="border-b border-border bg-white">
          <div className="mx-auto max-w-5xl px-6 py-10">
            <Breadcrumbs items={[
              { label: "Home", to: "/" },
              { label: "MBA / BBA Hub", to: "/mba-bba" },
              { label: "BBA Business Economics" },
            ]} />

            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent-deep">BBA · B.Com · Semester 1–2</p>
            <h1 className="mb-3 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
              BBA Business Economics Hub
            </h1>
            <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Five units covering demand &amp; supply, market equilibrium, production &amp; cost, market structures
              and national income — with study notes, topic-wise MCQ practice and video lectures, all free.
            </p>

            <div className="flex flex-wrap gap-4 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-slate-50 px-3 py-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-accent-deep" /><strong className="text-foreground">{BBA_ECO_UNITS.length}</strong>&nbsp;Units
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-slate-50 px-3 py-1.5">
                <FileText className="h-3.5 w-3.5 text-accent-deep" /><strong className="text-foreground">{loading ? "…" : notes.length}</strong>&nbsp;Notes
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-slate-50 px-3 py-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-accent-deep" /><strong className="text-foreground">{loading ? "…" : quizzes.length}</strong>&nbsp;MCQ Sets
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-slate-50 px-3 py-1.5">
                <PlayCircle className="h-3.5 w-3.5 text-accent-deep" /><strong className="text-foreground">{loading ? "…" : lectures.length}</strong>&nbsp;Video Lectures
              </span>
            </div>
          </div>
        </section>

        {/* ── Browse by Unit ──────────────────────────────────────────── */}
        <section className="border-b border-border bg-slate-50 py-10" aria-labelledby="units-heading">
          <div className="mx-auto max-w-5xl px-6">
            <h2 id="units-heading" className="mb-4 text-lg font-bold text-foreground">Browse by Unit</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {BBA_ECO_UNITS.map(unit => {
                const unitNotes = loading ? null : notesForUnit(unit.number).length;
                const unitQuizzes = loading ? null : quizzesForUnit(unit.number).length;
                return (
                  <Link
                    key={unit.number}
                    to={`/bba-economics/unit-${unit.number}`}
                    className="group flex flex-col gap-2 rounded-lg border border-border bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-700">
                        {unitRoman(unit.number)}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wide text-accent-deep">Unit {unit.number}</span>
                    </div>
                    <h3 className="text-sm font-bold leading-snug text-foreground">{unit.title}</h3>
                    <p className="text-[11px] text-muted-foreground">
                      {unitNotes === null ? "…" : `${unitNotes} note${unitNotes !== 1 ? "s" : ""}`} · {unitQuizzes === null ? "…" : `${unitQuizzes} MCQ set${unitQuizzes !== 1 ? "s" : ""}`}
                    </p>
                    <div className="mt-auto flex items-center gap-1 text-xs font-semibold text-accent-deep">
                      Study this unit <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {loading ? (
          <div className="mx-auto max-w-5xl px-6 py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="mx-auto max-w-5xl px-6 py-10 space-y-14">

            {/* ── Notes ───────────────────────────────────────────────── */}
            <section id="notes">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-accent-deep" />
                <h2 className="text-xl font-bold text-foreground">Notes</h2>
              </div>
              {notes.length === 0 ? (
                <EmptyState text="No notes uploaded yet for BBA Business Economics." />
              ) : (
                <div className="space-y-4">
                  {BBA_ECO_UNITS.map(unit => {
                    const unitNotes = notesForUnit(unit.number);
                    if (unitNotes.length === 0) return null;
                    return (
                      <details key={unit.number} open={unit.number === 1} className="group rounded-lg border border-border bg-white">
                        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-semibold text-sm text-foreground select-none">
                          <span className="flex items-center gap-2">
                            <span className="text-accent-deep">Unit {unitRoman(unit.number)}</span> — {unit.title}
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-muted-foreground">{unitNotes.length}</span>
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                        </summary>
                        <div className="space-y-2.5 border-t border-border px-5 py-4">
                          {unitNotes.map(note => (
                            <NoteRow key={note.id} note={note} onView={() => openNote(note, "view")} onDownload={() => openNote(note, "download")} />
                          ))}
                        </div>
                      </details>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── MCQs ────────────────────────────────────────────────── */}
            <section id="mcqs">
              <div className="mb-4 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-accent-deep" />
                <h2 className="text-xl font-bold text-foreground">MCQ Practice Sets</h2>
              </div>
              {quizzes.length === 0 ? (
                <EmptyState text="No MCQs uploaded yet for BBA Business Economics." />
              ) : (
                <div className="space-y-4">
                  {BBA_ECO_UNITS.map(unit => {
                    const unitQuizzes = quizzesForUnit(unit.number);
                    if (unitQuizzes.length === 0) return null;
                    return (
                      <details key={unit.number} open={unit.number === 1} className="group rounded-lg border border-border bg-white">
                        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-semibold text-sm text-foreground select-none">
                          <span className="flex items-center gap-2">
                            <span className="text-accent-deep">Unit {unitRoman(unit.number)}</span> — {unit.title}
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-muted-foreground">{unitQuizzes.length}</span>
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                        </summary>
                        <div className="grid gap-3 sm:grid-cols-2 border-t border-border px-5 py-4">
                          {unitQuizzes.map(q => (
                            <QuizCard key={q.id} quiz={q} questionCount={questionCounts[q.id] || 0} />
                          ))}
                        </div>
                      </details>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── PYQs ────────────────────────────────────────────────── */}
            {pyqs.length > 0 && (
              <section id="pyqs">
                <div className="mb-4 flex items-center gap-2">
                  <ScrollText className="h-5 w-5 text-accent-deep" />
                  <h2 className="text-xl font-bold text-foreground">Previous Year Questions</h2>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {pyqs.map((pyq: any) => (
                    <PYQCard key={pyq.id} pyq={pyq} />
                  ))}
                </div>
              </section>
            )}

            {/* ── Lectures ────────────────────────────────────────────── */}
            {lectures.length > 0 && (
              <section id="lectures">
                <div className="mb-4 flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-accent-deep" />
                  <h2 className="text-xl font-bold text-foreground">Video Lectures</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {lectures.map((lec: any) => (
                    <a
                      key={lec.id}
                      href={lec.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-md border border-border p-4 hover:border-accent/50"
                    >
                      <PlayCircle className="h-8 w-8 shrink-0 text-accent-deep" />
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-foreground">{lec.title}</h3>
                        {lec.duration_minutes && <p className="text-xs text-muted-foreground">{lec.duration_minutes} min</p>}
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ── CTA strip ───────────────────────────────────────────────── */}
        <section className="border-t border-border bg-slate-50 py-10">
          <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Looking for MBA Managerial Economics?</h2>
              <p className="text-sm text-muted-foreground">We have a deeper unit-wise hub for MBA students.</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link to="/mba-economics" className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:brightness-110">
                <TrendingUp className="h-4 w-4" /> MBA Economics Hub
              </Link>
              <Link to="/notes" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted">
                <BookOpen className="h-4 w-4" /> All Notes
              </Link>
            </div>
          </div>
        </section>
      </main>

      <GateDialog />
      <Footer />
    </div>
  );
};

export default BBAEconomicsPage;
