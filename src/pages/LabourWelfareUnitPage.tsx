import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useToast } from "@/hooks/use-toast";
import { useLabourWelfareContent } from "@/hooks/use-labour-welfare-content";
import { useDownloadGate } from "@/hooks/use-download-gate";
import { getSignedFileUrl } from "@/lib/signedFileUrl";
import { TagChip, EmptyState, NoteRow, QuizCard } from "@/components/LabourWelfareShared";
import { getUnitByNumber, getUnitForTopicSlug, unitRoman } from "@/lib/labourWelfareUnits";
import { ArrowLeft, ArrowRight, FileText, HelpCircle, ScrollText, PlayCircle, BookOpenCheck, FileCheck2 } from "lucide-react";

const LabourWelfareUnitPage = () => {
  // Route param is the whole segment ("unit-2") — parse the number out; any
  // other segment under /ugc-net-labour-welfare falls into the not-found
  // branch below.
  const { unitSlug } = useParams();
  const unitNumber = /^unit-(\d+)$/.exec(unitSlug ?? "")?.[1];
  const n = Number(unitNumber);
  const unit = unitNumber ? getUnitByNumber(n) : undefined;

  const { notes, quizzes, questionCounts, pyqs, lectures, loading } = useLabourWelfareContent();
  const { request, openFree, GateDialog } = useDownloadGate();
  const { toast } = useToast();

  const recordNoteView = (note: any) => {
    supabase.rpc("increment_note_views" as any, { _note_id: note.id }).then(({ error }) => {
      if (error) console.error("view count failed", error);
    });
  };
  const openNote = (note: any, mode: "view" | "download") => {
    if (!note.file_url) { toast({ title: "No file attached to this note." }); return; }
    // Viewing stays friction-free; the email ask applies to downloads only.
    const open = mode === "download" ? request : openFree;
    open(() => getSignedFileUrl(note.file_url, "notes", mode === "download"), () => recordNoteView(note));
  };

  const unitNotes = useMemo(
    () => unit ? notes.filter(x => getUnitForTopicSlug(x.topic_slug)?.number === unit.number) : [],
    [notes, unit],
  );
  const unitQuizzes = useMemo(
    () => unit ? quizzes.filter(x => getUnitForTopicSlug(x.topic_slug)?.number === unit.number) : [],
    [quizzes, unit],
  );
  const unitPyqs = useMemo(
    () => unit ? pyqs.filter(p => (p.unit_tags ?? []).includes(unit.number)) : [],
    [pyqs, unit],
  );
  const unitLectures = useMemo(
    () => unit ? lectures.filter(l => getUnitForTopicSlug(l.topic_slug)?.number === unit.number) : [],
    [lectures, unit],
  );

  if (!unit) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title="Unit Not Found" description="This Labour Welfare unit doesn't exist." path={`/ugc-net-labour-welfare/unit-${unitNumber}`} noindex />
        <Header />
        <main id="main-content" className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h1 className="mb-3 text-2xl font-bold text-foreground">Unit not found</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            UGC NET/JRF Labour Welfare only has Units I through X. Check the unit number in the URL, or browse the full hub.
          </p>
          <Link to="/ugc-net-labour-welfare" className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110">
            <ArrowLeft className="h-4 w-4" /> Back to UGC NET/JRF Labour Welfare
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const prevUnit = getUnitByNumber(unit.number - 1);
  const nextUnit = getUnitByNumber(unit.number + 1);
  const roman = unitRoman(unit.number);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`UGC NET/JRF Labour Welfare Unit ${roman}: ${unit.title} — Notes, MCQs & PYQs`}
        description={`Unit ${roman} of the UGC NET/JRF Paper II Labour Welfare syllabus (Subject Code 55) — ${unit.title}. Study notes, MCQs, previous year questions and video lectures covering: ${unit.topics.map(t => t.label).join(", ")}.`}
        path={`/ugc-net-labour-welfare/unit-${unit.number}`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "LearningResource",
          name: `UGC NET/JRF Labour Welfare — Unit ${roman}: ${unit.title}`,
          description: `Unit ${roman} of the UGC NET/JRF Paper II Labour Welfare syllabus — ${unit.topics.map(t => t.label).join(", ")}.`,
          about: unit.title,
          isPartOf: { "@type": "Course", name: "UGC NET/JRF Labour Welfare (Subject Code 55) — Unit-wise Study Hub", url: "https://karnhracademy.com/ugc-net-labour-welfare" },
          provider: { "@type": "EducationalOrganization", name: "Karn HR Academy", url: "https://karnhracademy.com" },
          isAccessibleForFree: true,
          inLanguage: "en",
        }}
      />
      <Header />

      <main id="main-content">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="border-b border-border bg-white">
          <div className="mx-auto max-w-4xl px-6 py-10">
            <Breadcrumbs items={[
              { label: "Home", to: "/" },
              { label: "UGC NET/JRF Labour Welfare", to: "/ugc-net-labour-welfare" },
              { label: `Unit ${roman}` },
            ]} />

            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent-deep">UGC NET/JRF Paper II · Subject Code 55 · Unit {roman} of X</p>
            <h1 className="mb-3 text-3xl font-bold leading-tight text-foreground sm:text-4xl" style={{ fontFamily: "'Sora', sans-serif" }}>
              Unit {roman}: {unit.title}
            </h1>
            <p className="mb-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Notes, MCQs, previous year questions and video lectures for this unit of the UGC NET/JRF Labour Welfare
              syllabus, organised by topic below.
            </p>

            <div className="flex flex-wrap gap-1.5">
              {unit.topics.map(t => (
                <span key={t.slug} className="rounded-full border border-border bg-slate-50 px-2.5 py-1 text-xs text-muted-foreground">{t.label}</span>
              ))}
            </div>
          </div>
        </section>

        {loading ? (
          <div className="mx-auto max-w-4xl px-6 py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="mx-auto max-w-4xl px-6 py-10 space-y-14">
            {/* ── Notes ─────────────────────────────────────────────────── */}
            <section id="notes">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-accent-deep" />
                <h2 className="text-xl font-bold text-foreground">Unit {roman} Notes</h2>
              </div>
              {unitNotes.length === 0 ? (
                <EmptyState text={`No notes uploaded yet for Unit ${roman}: ${unit.title}.`} />
              ) : (
                <div className="space-y-2.5">
                  {unitNotes.map(note => (
                    <NoteRow key={note.id} note={note} onView={() => openNote(note, "view")} onDownload={() => openNote(note, "download")} />
                  ))}
                </div>
              )}
            </section>

            {/* ── MCQs ──────────────────────────────────────────────────── */}
            <section id="mcqs">
              <div className="mb-4 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-accent-deep" />
                <h2 className="text-xl font-bold text-foreground">Unit {roman} MCQs</h2>
              </div>
              {unitQuizzes.length === 0 ? (
                <EmptyState text={`No MCQs uploaded yet for Unit ${roman}: ${unit.title}.`} />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {unitQuizzes.map(q => (
                    <QuizCard key={q.id} quiz={q} questionCount={questionCounts[q.id] || 0} />
                  ))}
                </div>
              )}
            </section>

            {/* ── PYQs ──────────────────────────────────────────────────── */}
            <section id="pyq">
              <div className="mb-4 flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-accent-deep" />
                <h2 className="text-xl font-bold text-foreground">Unit {roman} Previous Year Questions</h2>
              </div>
              {unitPyqs.length === 0 ? (
                <EmptyState text={`No previous year papers tagged to Unit ${roman} yet.`} />
              ) : (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {unitPyqs.map(pyq => (
                    <div key={pyq.id} className="flex flex-col gap-2 rounded-md border border-border p-4">
                      <h3 className="text-sm font-semibold text-foreground">
                        <Link to={`/pyqs/paper/${pyq.id}`} className="hover:text-accent-deep hover:underline">{pyq.title}</Link>
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{pyq.year}</span>
                        {(pyq.tags ?? []).map((t: string) => <TagChip key={t} tag={t} />)}
                        {pyq.answer_key_url && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            <FileCheck2 className="h-3 w-3" /> Answer key included
                          </span>
                        )}
                      </div>
                      <Link to={`/pyqs/view/${pyq.id}`} className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:brightness-110">
                        <BookOpenCheck className="h-3.5 w-3.5" /> View Online
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Related video lectures ────────────────────────────────── */}
            {unitLectures.length > 0 && (
              <section id="lectures">
                <div className="mb-4 flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-accent-deep" />
                  <h2 className="text-xl font-bold text-foreground">Unit {roman} Video Lectures</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {unitLectures.map((lec: any) => (
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

            {/* ── Prev / Next unit ──────────────────────────────────────── */}
            <nav className="flex items-center justify-between gap-3 border-t border-border pt-8">
              {prevUnit ? (
                <Link to={`/ugc-net-labour-welfare/unit-${prevUnit.number}`} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-accent-deep">
                  <ArrowLeft className="h-4 w-4" /> Unit {unitRoman(prevUnit.number)}: {prevUnit.title}
                </Link>
              ) : <span />}
              <Link to="/ugc-net-labour-welfare" className="text-sm font-medium text-accent-deep hover:underline">
                All Units
              </Link>
              {nextUnit ? (
                <Link to={`/ugc-net-labour-welfare/unit-${nextUnit.number}`} className="flex items-center gap-2 text-right text-sm font-medium text-muted-foreground hover:text-accent-deep">
                  Unit {unitRoman(nextUnit.number)}: {nextUnit.title} <ArrowRight className="h-4 w-4" />
                </Link>
              ) : <span />}
            </nav>
          </div>
        )}
      </main>

      <GateDialog />
      <Footer />
    </div>
  );
};

export default LabourWelfareUnitPage;
