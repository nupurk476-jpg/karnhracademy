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
import {
  describeShape, groupIntoModules, isMissingTableError,
  type CourseCard, type CourseItemKind,
} from "@/lib/courses";
import { getDiscipline, getTopicLabel } from "@/lib/disciplines";
import { getUnitsForSubject, getUnitForSubjectSlug, unitRoman } from "@/lib/subjectUnits";
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
  /** The topic this lesson belongs to — what groups it into a module. */
  topic_slug: string | null;
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
      if (error) {
        console.error("CourseDetailPage: failed to load course", error);
        // Same deploy-before-migrate window as the catalog: a bookmarked
        // course URL reads as "not found", which is what it is.
        if (isMissingTableError(error)) { setNotFound(true); setLoading(false); return; }
        setFailed(true); setLoading(false); return;
      }
      const found: CourseCard | undefined = (rows ?? [])[0];
      if (!found) { setNotFound(true); setLoading(false); return; }
      setCourse(found);

      const { data: itemRows, error: itemError } = await (supabase.from("course_items" as any) as any)
        .select("id, kind, ref_id, position, topic_slug").eq("course_id", found.id).order("position", { ascending: true });
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
  /**
   * The course's modules, in syllabus order.
   *
   * A course now spans a whole subject, so its topics are its modules. The
   * order comes from disciplines.ts — Unit 1 before Unit 2 — which the
   * database cannot know, so the sync orders items alphabetically by topic
   * and this is where that becomes the sequence a student studies in.
   */
  const subject = course?.category_slug ?? "";
  const units = getUnitsForSubject(subject);

  const modules = useMemo(() => {
    // Unit-based subjects (Labour Welfare, the two Economics papers) group by
    // UNIT: ten units read as a course, where the 55 topics underneath them
    // read as a syllabus dump. Everything else groups by topic, which is all
    // the depth those subjects have.
    if (units) {
      return groupIntoModules(
        items,
        units.map(u => `u${u.number}`),
        key => {
          const found = units.find(u => `u${u.number}` === key);
          return found ? `Unit ${unitRoman(found.number)} — ${found.title}` : "Other material";
        },
        item => {
          const unit = getUnitForSubjectSlug(subject, item.topic_slug);
          // A topic whose unit can't be resolved keeps its own key rather
          // than being swept into whichever unit happens to sort first.
          return unit ? `u${unit.number}` : (item.topic_slug ?? "");
        },
      );
    }
    const topicOrder = getDiscipline(subject)?.topics.map(t => t.slug) ?? [];
    return groupIntoModules(items, topicOrder, slugValue =>
      slugValue ? getTopicLabel(slugValue) : "Other material");
  }, [items, subject, units]);

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
          // Deliberately out of the index, and this is the whole reason the
          // catalog is safe to add: a course is the same material as the
          // subject and topic pages that already rank (/hr, /hr/:slug and
          // friends). Indexed, the two would compete for the same queries
          // and split what the topic pages have already earned — a site
          // cannibalising its own rankings is the usual way a catalog like
          // this quietly costs traffic instead of adding it.
          //
          // `follow` keeps the lessons crawlable, so this still feeds
          // internal links to the notes and MCQs. No cross-page canonical
          // to go with it: noindex plus a canonical pointing somewhere else
          // is a contradiction, and Google is explicit about not mixing
          // them. The topic page stays canonical for itself.
          //
          // The catalog page at /courses IS indexed — it is a real landing
          // page with content of its own, and it is in public/sitemap.xml.
          noindex
          follow
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
        {/* The category crumb is dropped when it repeats the title, which
            it now usually does: a subject-level course IS its category, and
            "Courses › Strategic Management › Strategic Management" reads
            like a bug. It still earns its place for a topic-level course. */}
        <Breadcrumbs
          items={[
            { label: "Courses", to: "/courses" },
            ...(course && course.category_label !== course.title
              ? [{ label: course.category_label, to: `/courses?category=${course.category_slug}` }]
              : []),
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
                  {describeShape(course, units ? "unit" : "module")}
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
                {modules.map((module, moduleIndex) => (
                  <section key={module.slug || "other"}>
                    <h2 className="mb-1 text-lg font-bold text-foreground">
                      {/* A unit label already carries its own number
                          ("Unit III — ..."), so prefixing "Module 2 ·"
                          would number the same thing twice, differently. */}
                      {!units && <span className="text-muted-foreground">Module {moduleIndex + 1} · </span>}
                      {module.label}
                    </h2>
                    <p className="mb-3 text-xs text-muted-foreground">
                      {module.items.length} {module.items.length === 1 ? "lesson" : "lessons"}
                    </p>
                    <ol className="divide-y divide-border rounded-lg border border-border bg-card">
                      {module.items.map((item, index) => {
                        const { icon: Icon, label } = KIND_META[item.kind];
                        return (
                          <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                            <span className="w-6 shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">
                              {index + 1}
                            </span>
                            <Icon className="h-4 w-4 shrink-0 text-accent-deep" aria-label={label} />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground">{item.title}</p>
                              {/* Only for unit-based subjects: a unit spans
                                  several topics, so the lesson title alone
                                  doesn't say where in the syllabus it sits.
                                  On a flat subject the module heading IS the
                                  topic, and repeating it on every row is
                                  noise. Suppressed too when a note's title
                                  already IS its topic's name, which happens
                                  often and reads as a rendering bug. */}
                              {units && item.topic_slug && getTopicLabel(item.topic_slug) !== item.title && (
                                <p className="text-[11px] font-medium text-accent-deep">{getTopicLabel(item.topic_slug)}</p>
                              )}
                              {item.description && (
                                <p className="line-clamp-1 text-xs text-muted-foreground">{item.description}</p>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {item.kind === "note" && (
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
                              {item.kind === "lecture" && item.video_url && (
                                <a
                                  href={item.video_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:brightness-110"
                                >
                                  Watch
                                </a>
                              )}
                              {item.kind === "quiz" && (
                                <Link
                                  to={`/quizzes/${item.ref_id}`}
                                  className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:brightness-110"
                                >
                                  Start
                                </Link>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                ))}
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
