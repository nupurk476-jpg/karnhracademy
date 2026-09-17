import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import ContentLoadError from "@/components/ContentLoadError";
import { Badge } from "@/components/ui/badge";
import { useDownloadGate } from "@/hooks/use-download-gate";
import { useToast } from "@/hooks/use-toast";
import { getSignedFileUrl, isPdfFile } from "@/lib/signedFileUrl";
import { categoryStyle } from "@/lib/courseCategoryStyle";
import { iconForTopic } from "@/lib/topicIcons";
import { describeContents, type CourseCard, type CourseItemKind } from "@/lib/courses";
import { FileText, HelpCircle, PlayCircle, Download, ArrowRight, Layers } from "lucide-react";

/**
 * One course: its lessons, in order.
 *
 * Every lesson is a POINTER to content that already exists — a note, a
 * lecture or an MCQ set — so opening one hands off to the same viewer,
 * player and email gate the rest of the site uses. Nothing is duplicated
 * here, which is what keeps a course from drifting out of sync with the
 * material it is made of.
 */

type Item = {
  id: string;
  kind: CourseItemKind;
  ref_id: string;
  position: number;
};

type Resolved = Item & { title: string; description: string | null; file_url?: string | null; video_url?: string | null };

const KIND_META: Record<CourseItemKind, { icon: typeof FileText; label: string }> = {
  note: { icon: FileText, label: "Note" },
  lecture: { icon: PlayCircle, label: "Lecture" },
  quiz: { icon: HelpCircle, label: "MCQs" },
};

const CourseDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { request, openFree, GateDialog } = useDownloadGate();

  const [course, setCourse] = useState<CourseCard | null>(null);
  const [items, setItems] = useState<Resolved[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: rows, error } = await (supabase.from("course_cards" as any) as any)
        .select("*").eq("slug", slug).eq("is_published", true).limit(1);
      if (cancelled) return;
      if (error) { console.error("CourseDetailPage: failed to load course", error); setFailed(true); setLoading(false); return; }
      const found: CourseCard | undefined = (rows ?? [])[0];
      if (!found) { setNotFound(true); setLoading(false); return; }
      setCourse(found);

      const { data: itemRows, error: itemError } = await (supabase.from("course_items" as any) as any)
        .select("id, kind, ref_id, position").eq("course_id", found.id).order("position", { ascending: true });
      if (cancelled) return;
      if (itemError) { console.error("CourseDetailPage: failed to load lessons", itemError); setFailed(true); setLoading(false); return; }

      const list: Item[] = itemRows ?? [];
      const idsOf = (kind: CourseItemKind) => list.filter(i => i.kind === kind).map(i => i.ref_id);

      // Three queries for the whole lesson list, not one per lesson.
      const [notes, lectures, quizzes] = await Promise.all([
        idsOf("note").length
          ? supabase.from("notes").select("id, title, description, file_url, video_url").in("id", idsOf("note"))
          : Promise.resolve({ data: [] as any[] }),
        idsOf("lecture").length
          ? supabase.from("lectures").select("id, title, description, video_url").in("id", idsOf("lecture"))
          : Promise.resolve({ data: [] as any[] }),
        idsOf("quiz").length
          ? supabase.from("quizzes").select("id, title, description").in("id", idsOf("quiz"))
          : Promise.resolve({ data: [] as any[] }),
      ]);
      if (cancelled) return;

      const byId = new Map<string, any>();
      [...(notes.data ?? []), ...(lectures.data ?? []), ...(quizzes.data ?? [])].forEach(r => byId.set(r.id, r));

      setItems(
        list
          // An item whose target has been deleted since the last sync is
          // dropped rather than rendered as a lesson that goes nowhere.
          .filter(i => byId.has(i.ref_id))
          .map(i => ({ ...i, ...byId.get(i.ref_id) })),
      );
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const style = categoryStyle(course?.category_slug);
  const TopicIcon = iconForTopic(course?.title);
  const grouped = useMemo(() => ({
    note: items.filter(i => i.kind === "note"),
    lecture: items.filter(i => i.kind === "lecture"),
    quiz: items.filter(i => i.kind === "quiz"),
  }), [items]);

  const openNote = (item: Resolved, mode: "view" | "download") => {
    if (!item.file_url) { toast({ title: "No file attached to this note." }); return; }
    // PDFs read in the branded in-app viewer; everything else is a signed
    // URL, and downloads keep the shared one-time email gate.
    if (mode === "view" && isPdfFile(item.file_url)) { navigate(`/notes/view/${item.ref_id}`); return; }
    const open = mode === "download" ? request : openFree;
    open(() => getSignedFileUrl(item.file_url!, "notes", mode === "download"), () => {});
  };

  if (failed) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-4xl px-6 py-16"><ContentLoadError what="this course" /></main>
        <Footer />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title="Course not found" description="This course is not available." path={`/courses/${slug}`} noindex />
        <Header />
        <main className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground">Course not found</h1>
          <p className="mt-2 text-muted-foreground">It may have been renamed or is not published yet.</p>
          <Link to="/courses" className="mt-6 inline-flex items-center gap-1 font-semibold text-accent-deep hover:underline">
            Browse all courses <ArrowRight className="h-4 w-4" />
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {course && (
        <SEO
          title={course.title}
          description={course.summary ?? `${course.title} — ${course.lesson_count} free lessons covering notes, lectures and MCQ practice from Karn HR Academy.`}
          path={`/courses/${course.slug}`}
          jsonLd={{
            "@context": "https://schema.org",
            "@type": "Course",
            name: course.title,
            description: course.summary ?? undefined,
            provider: { "@type": "Organization", name: "Karn HR Academy", sameAs: "https://karnhracademy.com" },
            isAccessibleForFree: course.is_free,
          }}
        />
      )}
      <Header />

      <main id="main-content" className="mx-auto max-w-4xl px-6 py-10">
        <Breadcrumbs
          items={[
            { label: "Courses", to: "/courses" },
            ...(course ? [{ label: course.category_label, to: `/courses?category=${course.category_slug}` }] : []),
            { label: course?.title ?? "Course" },
          ]}
        />

        {loading || !course ? (
          <div className="mt-6 space-y-4">
            <div className="h-40 animate-pulse rounded-xl bg-muted" />
            <div className="h-6 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
          </div>
        ) : (
          <>
            <header className="mt-4">
              <div
                className="flex items-center gap-4 rounded-xl p-6"
                style={{ background: `linear-gradient(135deg, ${style.gradient[0]} 0%, ${style.gradient[1]} 100%)` }}
              >
                <TopicIcon className="h-10 w-10 shrink-0 text-white/90" strokeWidth={1.5} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{course.category_label}</p>
                  <h1 className="mt-0.5 text-2xl font-bold text-white sm:text-3xl">{course.title}</h1>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Badge variant="success" size="sm">{course.is_free ? "Free" : "Paid"}</Badge>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Layers className="h-4 w-4" />
                  {course.lesson_count} {course.lesson_count === 1 ? "lesson" : "lessons"}
                  {describeContents(course) && ` · ${describeContents(course)}`}
                </span>
              </div>

              {course.summary && <p className="mt-4 text-muted-foreground">{course.summary}</p>}
            </header>

            {items.length === 0 ? (
              <p className="mt-10 rounded-lg border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
                The lessons for this course are still being added.
              </p>
            ) : (
              <div className="mt-10 space-y-8">
                {(["note", "lecture", "quiz"] as CourseItemKind[]).map(kind => {
                  const group = grouped[kind];
                  if (group.length === 0) return null;
                  const { icon: Icon, label } = KIND_META[kind];
                  return (
                    <section key={kind}>
                      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-foreground">
                        <Icon className="h-4 w-4 text-accent-deep" />
                        {kind === "note" ? "Read" : kind === "lecture" ? "Watch" : "Test yourself"}
                        <span className="text-sm font-normal text-muted-foreground">({group.length})</span>
                      </h2>
                      <ol className="divide-y divide-border rounded-lg border border-border bg-card">
                        {group.map((item, index) => (
                          <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                            <span className="w-6 shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">
                              {index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground">{item.title}</p>
                              {item.description && (
                                <p className="line-clamp-1 text-xs text-muted-foreground">{item.description}</p>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {kind === "note" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openNote(item, "view")}
                                    className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:brightness-110"
                                  >
                                    Read
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openNote(item, "download")}
                                    aria-label={`Download ${item.title}`}
                                    className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted"
                                  >
                                    <Download className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              {kind === "lecture" && item.video_url && (
                                <a
                                  href={item.video_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:brightness-110"
                                >
                                  Watch
                                </a>
                              )}
                              {kind === "quiz" && (
                                <Link
                                  to={`/quizzes/${item.ref_id}`}
                                  className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:brightness-110"
                                >
                                  Start
                                </Link>
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>
                    </section>
                  );
                })}
              </div>
            )}

            <div className="mt-10 border-t border-border pt-6">
              <Link to="/courses" className="inline-flex items-center gap-1 text-sm font-semibold text-accent-deep hover:underline">
                Browse all courses <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </>
        )}
      </main>

      <GateDialog />
      <Footer />
    </div>
  );
};

export default CourseDetailPage;
