import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import SubjectCover from "@/components/SubjectCover";
import { EmptyState, NoteRow, QuizCard } from "@/components/LabourWelfareShared";
import { getDiscipline } from "@/lib/disciplines";
import { getSubjectHub } from "@/lib/subjectHubs";
import { getSubjectMeta } from "@/lib/subjectMeta";
import { getSignedFileUrl, isPdfFile } from "@/lib/signedFileUrl";
import { useSubjectContent } from "@/hooks/use-subject-content";
import { useDownloadGate } from "@/hooks/use-download-gate";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BRAND } from "@/lib/brand";
import { FileText, HelpCircle, PlayCircle, Layers, ChevronRight, ArrowRight, BookOpen } from "lucide-react";

const SubjectHubPage = ({ subject }: { subject: string }) => {
  const hub = getSubjectHub(subject)!;
  const discipline = getDiscipline(subject)!;
  const meta = getSubjectMeta(subject);
  const { notes, quizzes, questionCounts, lectures, loading } = useSubjectContent(subject);
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

  const perTopic = useMemo(() => {
    const m: Record<string, { notes: number; quizzes: number; lectures: number }> = {};
    const bump = (slug: string | null, k: "notes" | "quizzes" | "lectures") => {
      if (!slug) return;
      (m[slug] ??= { notes: 0, quizzes: 0, lectures: 0 })[k]++;
    };
    notes.forEach((n: any) => bump(n.topic_slug, "notes"));
    quizzes.forEach((q: any) => bump(q.topic_slug, "quizzes"));
    lectures.forEach((l: any) => bump(l.topic_slug, "lectures"));
    return m;
  }, [notes, quizzes, lectures]);

  const latestNotes = notes.slice(0, 6);
  const path = `/${hub.prefix}`;
  const title = discipline.label;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${title} — Notes, MCQs & Video Lectures for ${meta.exams.join(", ")}`}
        description={`Free ${title} study hub: ${hub.topics.length} topics with structured notes, MCQ practice sets and video lectures for ${meta.exams.join(", ")} students. ${discipline.description}.`}
        path={path}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Course",
          name: `${title} Study Hub`,
          description: `Free notes, MCQ practice and video lectures across ${hub.topics.length} topics of ${title}.`,
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
          <div className="mx-auto max-w-6xl px-6 py-10">
            <Breadcrumbs items={[
              { label: "Home", to: "/" },
              { label: "MBA / BBA Hub", to: "/mba-bba" },
              { label: discipline.short },
            ]} />
            <div className="grid items-center gap-8 lg:grid-cols-[1fr_360px]">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent-deep">{hub.strap}</p>
                <h1 className="mb-3 text-3xl font-bold leading-tight text-foreground sm:text-4xl">{title}</h1>
                <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{hub.intro}</p>
                <div className="flex flex-wrap gap-3 text-sm">
                  {[
                    { icon: Layers,     v: hub.topics.length, l: "Topics", to: "#topics" },
                    { icon: FileText,   v: loading ? "…" : notes.length, l: "Notes", to: "#notes" },
                    { icon: HelpCircle, v: loading ? "…" : quizzes.length, l: "MCQ Sets", to: "#mcqs" },
                    { icon: PlayCircle, v: loading ? "…" : lectures.length, l: "Video Lectures", to: lectures.length > 0 ? "#lectures" : "/lectures" },
                  ].map(c => {
                    const I = c.icon;
                    return (
                      <a key={c.l} href={c.to} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-slate-50 px-3 py-1.5 transition-colors hover:border-accent/60 hover:bg-white hover:text-accent-deep">
                        <I className="h-3.5 w-3.5 text-accent-deep" /><strong className="text-foreground">{c.v}</strong>&nbsp;{c.l}
                      </a>
                    );
                  })}
                  <span className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-white" style={{ background: BRAND.gold }}>Free</span>
                </div>
              </div>
              <SubjectCover id={subject} code={meta.code} caption={meta.exams.join(" · ")} icon={discipline.icon} image={meta.image} className="hidden rounded-2xl border border-slate-200 lg:block" />
            </div>
          </div>
        </section>

        {/* ── Topics ──────────────────────────────────────────────────── */}
        <section id="topics" className="scroll-mt-24 border-b border-border bg-slate-50 py-10" aria-labelledby="topics-heading">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 id="topics-heading" className="text-lg font-bold text-foreground">Browse by Topic</h2>
                <p className="text-xs text-muted-foreground">In syllabus order — start at the top, or jump to what your exam needs.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {hub.topics.map((t, i) => {
                const c = perTopic[t.slug] ?? { notes: 0, quizzes: 0, lectures: 0 };
                const Icon = t.icon;
                return (
                  <Link
                    key={t.slug}
                    to={`/${hub.prefix}/${t.slug}`}
                    className="group flex flex-col gap-3 rounded-xl border border-border bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${discipline.iconBg}`}>
                        <Icon className={`h-5 w-5 ${discipline.iconColor}`} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-accent-deep">Topic {String(i + 1).padStart(2, "0")}</p>
                        <h3 className="text-sm font-bold leading-snug text-foreground">{t.label}</h3>
                      </div>
                    </div>
                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{t.desc}</p>
                    <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-muted-foreground">
                      <span className="tabular-nums">
                        {loading ? "…" : `${c.notes} note${c.notes !== 1 ? "s" : ""} · ${c.quizzes} MCQ set${c.quizzes !== 1 ? "s" : ""}${c.lectures ? ` · ${c.lectures} lecture${c.lectures !== 1 ? "s" : ""}` : ""}`}
                      </span>
                      <span className="inline-flex items-center gap-0.5 font-semibold text-accent-deep">
                        Study <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {loading ? (
          <div className="mx-auto max-w-6xl px-6 py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="mx-auto max-w-6xl px-6 py-10 space-y-14">
            {/* ── Latest notes ───────────────────────────────────────── */}
            <section id="notes" className="scroll-mt-24">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-accent-deep" />
                  <h2 className="text-xl font-bold text-foreground">Latest Notes</h2>
                </div>
                {notes.length > latestNotes.length && (
                  <Link to={`/notes?subject=${subject}`} className="text-sm font-semibold text-accent-deep hover:underline">All {notes.length} notes →</Link>
                )}
              </div>
              {latestNotes.length === 0 ? (
                <EmptyState text={`No notes uploaded yet for ${title}.`} />
              ) : (
                <div className="space-y-2.5">
                  {latestNotes.map((note: any) => (
                    <NoteRow key={note.id} note={note} onView={() => openNote(note, "view")} onDownload={() => openNote(note, "download")} />
                  ))}
                </div>
              )}
            </section>

            {/* ── MCQs ───────────────────────────────────────────────── */}
            <section id="mcqs" className="scroll-mt-24">
              <div className="mb-4 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-accent-deep" />
                <h2 className="text-xl font-bold text-foreground">MCQ Practice Sets</h2>
              </div>
              {quizzes.length === 0 ? (
                <EmptyState text={`No MCQ sets uploaded yet for ${title}.`} />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {quizzes.map((q: any) => (
                    <QuizCard key={q.id} quiz={q} questionCount={questionCounts[q.id] || 0} />
                  ))}
                </div>
              )}
            </section>

            {/* ── Lectures ───────────────────────────────────────────── */}
            {lectures.length > 0 && (
              <section id="lectures" className="scroll-mt-24">
                <div className="mb-4 flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-accent-deep" />
                  <h2 className="text-xl font-bold text-foreground">Video Lectures</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {lectures.map((lec: any) => (
                    <a key={lec.id} href={lec.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-md border border-border p-4 hover:border-accent/50">
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

        {/* ── CTA ─────────────────────────────────────────────────────── */}
        <section className="border-t border-border bg-slate-50 py-10">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Studying more than one subject?</h2>
              <p className="text-sm text-muted-foreground">See which subject lands in which semester, and browse all ten.</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link to="/mba-bba" className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:brightness-110">
                <BookOpen className="h-4 w-4" /> MBA / BBA Hub <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link to={`/quizzes?subject=${subject}`} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted">
                <HelpCircle className="h-4 w-4" /> Practice MCQs
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

export default SubjectHubPage;
