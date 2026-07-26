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
import { useBookmarks } from "@/hooks/use-bookmarks";
import { getSignedFileUrl } from "@/lib/signedFileUrl";
import { TagChip, EmptyState, NoteRow, QuizCard } from "@/components/LabourWelfareShared";
import { resolveLWTopicSlug, unitRoman } from "@/lib/labourWelfareUnits";
import { getHighScoringTopicBySlug, getUnitsForTopic, FREQUENCY_LABEL, PYQ_FREQUENCY_LABEL } from "@/lib/highScoringTopics";
import { ArrowLeft, FileText, HelpCircle, ScrollText, PlayCircle, BookOpenCheck, Bookmark, BookmarkCheck, Clock, FileCheck2 } from "lucide-react";

const LabourWelfareTopicPage = () => {
  const { topicSlug } = useParams();
  const topic = getHighScoringTopicBySlug(topicSlug);

  const { notes, quizzes, questionCounts, pyqs, lectures, loading } = useLabourWelfareContent();
  const { request, GateDialog } = useDownloadGate();
  const { isBookmarked, toggle } = useBookmarks();
  const { toast } = useToast();

  const recordNoteView = (note: any) => {
    supabase.rpc("increment_note_views" as any, { _note_id: note.id }).then(({ error }) => {
      if (error) console.error("view count failed", error);
    });
  };
  const openNote = (note: any, mode: "view" | "download") => {
    if (!note.file_url) { toast({ title: "No file attached to this note." }); return; }
    request(() => getSignedFileUrl(note.file_url, "notes", mode === "download"), () => recordNoteView(note));
  };

  const units = useMemo(() => (topic ? getUnitsForTopic(topic) : []), [topic]);
  const unitNumbers = useMemo(() => new Set(units.map(u => u.number)), [units]);

  const topicNotes = useMemo(
    () => topic ? notes.filter(n => topic.topicSlugs.includes(resolveLWTopicSlug(n.topic_slug))) : [],
    [notes, topic],
  );
  const topicQuizzes = useMemo(
    () => topic ? quizzes.filter(q => topic.topicSlugs.includes(resolveLWTopicSlug(q.topic_slug))) : [],
    [quizzes, topic],
  );
  const topicLectures = useMemo(
    () => topic ? lectures.filter((l: any) => topic.topicSlugs.includes(resolveLWTopicSlug(l.topic_slug))) : [],
    [lectures, topic],
  );
  const topicPyqs = useMemo(
    () => topic ? pyqs.filter((p: any) => (p.unit_tags ?? []).some((n: number) => unitNumbers.has(n))) : [],
    [pyqs, topic, unitNumbers],
  );

  if (!topic) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title="Topic Not Found" description="This high-scoring topic doesn't exist." path={`/ugc-net-labour-welfare/topic/${topicSlug}`} noindex />
        <Header />
        <main id="main-content" className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h1 className="mb-3 text-2xl font-bold text-foreground">Topic not found</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            This isn't one of the curated high-scoring topics. Browse the full hub instead.
          </p>
          <Link to="/ugc-net-labour-welfare" className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110">
            <ArrowLeft className="h-4 w-4" /> Back to UGC NET/JRF Labour Welfare
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const unitsLabel = units.map(u => `Unit ${unitRoman(u.number)}: ${u.title}`).join(" · ");
  const bookmarked = isBookmarked(topic.slug);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${topic.name} — UGC NET/JRF Labour Welfare Notes, MCQs & PYQs`}
        description={`${topic.name} — a ${topic.frequency}-frequency UGC NET/JRF Paper II Labour Welfare (Subject Code 55) topic${units.length ? ` covering ${unitsLabel}` : ""}. Study notes, MCQs, previous year questions and video lectures.`}
        path={`/ugc-net-labour-welfare/topic/${topic.slug}`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "LearningResource",
          name: `UGC NET/JRF Labour Welfare — ${topic.name}`,
          about: topic.name,
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
              { label: topic.name },
            ]} />

            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-accent">High-Scoring Topic · {FREQUENCY_LABEL[topic.frequency]}</p>
            </div>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl" style={{ fontFamily: "'Sora', sans-serif" }}>
                {topic.name}
              </h1>
              <button
                onClick={() => toggle(topic.slug)}
                aria-pressed={bookmarked}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-semibold transition-colors ${
                  bookmarked ? "border-accent/40 bg-accent/10 text-accent" : "border-border text-muted-foreground hover:bg-slate-50"
                }`}
              >
                {bookmarked ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                {bookmarked ? "Bookmarked" : "Bookmark"}
              </button>
            </div>
            <p className="mb-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Part of the UGC NET/JRF Paper II Labour Welfare syllabus (Subject Code 55). Notes, MCQs and previous
              year questions for this topic, pulled from every unit it touches.
            </p>

            <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {topic.readTimeMinutes} min read</span>
              <span>{PYQ_FREQUENCY_LABEL[topic.frequency]}</span>
            </div>

            {units.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {units.map(u => (
                  <Link
                    key={u.number}
                    to={`/ugc-net-labour-welfare/unit-${u.number}`}
                    className="rounded-full border border-border bg-slate-50 px-2.5 py-1 text-xs text-muted-foreground hover:border-accent/50 hover:text-accent"
                  >
                    Unit {unitRoman(u.number)}: {u.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {loading ? (
          <div className="mx-auto max-w-4xl px-6 py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="mx-auto max-w-4xl px-6 py-10 space-y-14">
            {/* ── Notes ─────────────────────────────────────────────────── */}
            <section id="notes">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-accent" />
                <h2 className="text-xl font-bold text-foreground">Notes</h2>
              </div>
              {topicNotes.length === 0 ? (
                <EmptyState text={`No notes uploaded yet for ${topic.name}.`} />
              ) : (
                <div className="space-y-2.5">
                  {topicNotes.map(note => (
                    <NoteRow key={note.id} note={note} onView={() => openNote(note, "view")} onDownload={() => openNote(note, "download")} />
                  ))}
                </div>
              )}
            </section>

            {/* ── MCQs ──────────────────────────────────────────────────── */}
            <section id="mcqs">
              <div className="mb-4 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-accent" />
                <h2 className="text-xl font-bold text-foreground">MCQs</h2>
              </div>
              {topicQuizzes.length === 0 ? (
                <EmptyState text={`No MCQs uploaded yet for ${topic.name}.`} />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {topicQuizzes.map(q => (
                    <QuizCard key={q.id} quiz={q} questionCount={questionCounts[q.id] || 0} />
                  ))}
                </div>
              )}
            </section>

            {/* ── PYQs ──────────────────────────────────────────────────── */}
            <section id="pyq">
              <div className="mb-4 flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-accent" />
                <h2 className="text-xl font-bold text-foreground">Previous Year Questions</h2>
              </div>
              {topicPyqs.length === 0 ? (
                <EmptyState text={`No previous year papers tagged to ${topic.name}'s unit(s) yet.`} />
              ) : (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {topicPyqs.map((pyq: any) => (
                    <div key={pyq.id} className="flex flex-col gap-2 rounded-md border border-border p-4">
                      <h3 className="text-sm font-semibold text-foreground">{pyq.title}</h3>
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
            {topicLectures.length > 0 && (
              <section id="lectures">
                <div className="mb-4 flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-accent" />
                  <h2 className="text-xl font-bold text-foreground">Video Lectures</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {topicLectures.map((lec: any) => (
                    <a
                      key={lec.id}
                      href={lec.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-md border border-border p-4 hover:border-accent/50"
                    >
                      <PlayCircle className="h-8 w-8 shrink-0 text-accent" />
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-foreground">{lec.title}</h3>
                        {lec.duration_minutes && <p className="text-xs text-muted-foreground">{lec.duration_minutes} min</p>}
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            <div className="border-t border-border pt-8 text-center">
              <Link to="/ugc-net-labour-welfare#high-scoring-topics" className="text-sm font-medium text-accent hover:underline">
                ← Back to all High-Scoring Topics
              </Link>
            </div>
          </div>
        )}
      </main>

      <GateDialog />
      <Footer />
    </div>
  );
};

export default LabourWelfareTopicPage;
