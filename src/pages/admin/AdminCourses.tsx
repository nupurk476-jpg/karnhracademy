import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DISCIPLINES } from "@/lib/disciplines";
import { hasCustomStyle } from "@/lib/courseCategoryStyle";
import { describeContents, describeShape, type CourseCard } from "@/lib/courses";
import { isUnitBasedSubject } from "@/lib/subjectUnits";
import { RefreshCw, Eye, EyeOff, ExternalLink, Palette, Pencil } from "lucide-react";
import { formatRupees } from "@/lib/programmes";
import { useConfirm } from "@/hooks/use-confirm";

/**
 * Where the catalog is built and published.
 *
 * Courses are not typed in here. sync_courses_from_content() assembles them
 * from the notes, lectures and MCQs that already exist — one course per
 * (subject, topic) that has content — and this screen is where that is
 * triggered and where the results are reviewed before students see them.
 *
 * The labels come from DISCIPLINES, which is the site's single source of
 * truth for what a subject and a topic are called. They are sent to the
 * database rather than duplicated into it, so the two can never disagree.
 * Everything else about a category lives in course_categories, which is
 * what makes adding a subject a row rather than a deploy.
 */

const CATEGORY_PAYLOAD = Object.fromEntries(
  DISCIPLINES.map((d, index) => [d.value, { label: d.label, description: d.description, order: index }]),
);
const TOPIC_PAYLOAD = Object.fromEntries(
  DISCIPLINES.flatMap(d => d.topics.map(t => [t.slug, t.label])),
);

type SyncResult = {
  categories_added: number; courses_added: number;
  items_added: number; items_removed: number;
  /** Per-topic courses from the first cut, removed in favour of subject-level ones. */
  topic_courses_retired?: number;
  courses_total: number; courses_published: number;
};

const AdminCourses = () => {
  const { toast } = useToast();
  const [courses, setCourses] = useState<CourseCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();
  // Inline price editor: one course at a time.
  const [pricingId, setPricingId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [lockNotes, setLockNotes] = useState(true);
  const [savingPrice, setSavingPrice] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    // No is_published filter: an admin needs to see the drafts, which is
    // the whole point of this screen.
    const { data, error } = await (supabase.from("course_cards" as any) as any)
      .select("*").order("category_order", { ascending: true }).order("title", { ascending: true });
    setLoading(false);
    if (error) {
      toast({ title: "Couldn't load courses", description: error.message, variant: "destructive" });
      return;
    }
    setCourses(data ?? []);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const sync = async () => {
    setSyncing(true);
    const { data, error } = await (supabase.rpc as any)("sync_courses_from_content", {
      _categories: CATEGORY_PAYLOAD,
      _topics: TOPIC_PAYLOAD,
    });
    setSyncing(false);
    if (error) {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
      return;
    }
    setLastSync(data as SyncResult);
    toast({
      title: "Catalog synced",
      description: `${data.courses_added} new course(s), ${data.items_added} lesson(s) added, ${data.items_removed} removed.`
        + (data.topic_courses_retired ? ` ${data.topic_courses_retired} old per-topic course(s) retired.` : ""),
    });
    load();
  };

  const togglePublished = async (course: CourseCard) => {
    const next = !course.is_published;
    // Optimistic: the toggle is the whole interaction, and waiting on a
    // round trip to move a switch feels broken.
    setCourses(list => list.map(c => (c.id === course.id ? { ...c, is_published: next } : c)));
    const { error } = await (supabase.from("courses" as any) as any)
      .update({ is_published: next }).eq("id", course.id);
    if (error) {
      setCourses(list => list.map(c => (c.id === course.id ? { ...c, is_published: !next } : c)));
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
    }
  };

  const startPricing = (course: CourseCard) => {
    setPricingId(course.id);
    setPriceInput(course.is_free ? "" : String(course.price_paise / 100));
    setLockNotes(true);
  };

  // Empty or 0 makes the course free again. Making it free does NOT unlock
  // its notes: a note may also be sold on its own, so that stays a per-note
  // decision in Admin → Notes.
  const savePrice = async (course: CourseCard) => {
    const paise = Math.round((parseFloat(priceInput) || 0) * 100);
    if (paise > 0 && paise < 100) {
      toast({ title: "The lowest price you can charge online is ₹1", variant: "destructive" });
      return;
    }
    const paid = paise > 0;
    if (paid && lockNotes) {
      const ok = await confirm({
        title: `Lock the notes in "${course.title}"?`,
        description: `Its ${course.note_count} note(s) will become paid everywhere on the site, not just inside this course. Students who buy the course (${formatRupees(paise)}) unlock all of them. MCQs and lectures stay free.`,
      });
      if (!ok) return;
    }
    setSavingPrice(true);
    const { error } = await (supabase.from("courses" as any) as any)
      .update({ is_free: !paid, price_paise: paid ? paise : 0 }).eq("id", course.id);
    let lockError: any = null;
    if (!error && paid && lockNotes) {
      const { data: items } = await (supabase.from("course_items" as any) as any)
        .select("ref_id").eq("course_id", course.id).eq("kind", "note");
      const ids = (items ?? []).map((i: any) => i.ref_id);
      if (ids.length) {
        ({ error: lockError } = await (supabase.from("notes") as any)
          .update({ is_free: false }).in("id", ids).eq("is_free", true));
      }
    }
    setSavingPrice(false);
    if (error || lockError) {
      toast({ title: "Couldn't save the price", description: (error ?? lockError).message, variant: "destructive" });
      return;
    }
    toast({ title: paid ? `Price set to ${formatRupees(paise)}` : "Course is free again" });
    setPricingId(null);
    load();
  };

  const published = courses.filter(c => c.is_published).length;
  const emptyCourses = courses.filter(c => c.lesson_count === 0).length;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-foreground">Courses</h1>
        <div className="flex items-center gap-2">
          <Link
            to="/courses"
            target="_blank"
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            <ExternalLink className="h-4 w-4" /> View catalog
          </Link>
          <button
            type="button"
            onClick={sync}
            disabled={syncing}
            className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync from content"}
          </button>
        </div>
      </div>

      <p className="mb-6 max-w-3xl text-sm text-muted-foreground">
        Courses are assembled from the notes, lectures and MCQs already on the site — one course per
        subject, with its topics as modules. Sync after adding material; new courses arrive as drafts
        and appear to students only once you publish them. Editing a course's title or summary is
        safe: a later sync never overwrites it.
      </p>

      {lastSync && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4 text-sm">
          <p className="font-medium text-foreground">Last sync</p>
          <p className="mt-1 text-muted-foreground">
            {lastSync.categories_added} new categor{lastSync.categories_added === 1 ? "y" : "ies"} ·{" "}
            {lastSync.courses_added} new course{lastSync.courses_added === 1 ? "" : "s"} ·{" "}
            {lastSync.items_added} lesson{lastSync.items_added === 1 ? "" : "s"} added ·{" "}
            {lastSync.items_removed} removed
            {!!lastSync.topic_courses_retired && ` · ${lastSync.topic_courses_retired} old per-topic course(s) retired`}
          </p>
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Courses</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{courses.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Published</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{published}</p>
          <p className="mt-1 text-xs text-muted-foreground">{courses.length - published} draft</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Empty</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{emptyCourses}</p>
          <p className="mt-1 text-xs text-muted-foreground">no lessons — don't publish these</p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : courses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="font-medium text-foreground">No courses yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Press “Sync from content” to build the catalog from your existing notes, lectures and MCQs.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Course</th>
                <th className="px-3 py-2 text-left font-medium">Category</th>
                <th className="px-3 py-2 text-right font-medium">Modules</th>
                <th className="px-3 py-2 text-right font-medium">Topics</th>
                <th className="px-3 py-2 text-right font-medium">Lessons</th>
                <th className="px-3 py-2 text-right font-medium">Price</th>
                <th className="px-3 py-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {courses.map(course => (
                <tr key={course.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <p className="font-medium text-foreground">{course.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {describeShape(course, isUnitBasedSubject(course.category_slug) ? "unit" : "module")}
                      {describeContents(course) && ` · ${describeContents(course)}`}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      {course.category_label}
                      {/* A category with no palette in courseCategoryStyle
                          still works — it renders in the neutral default.
                          This just flags the ones worth styling later. */}
                      {!hasCustomStyle(course.category_slug) && (
                        <Palette className="h-3.5 w-3.5 text-muted-foreground/60" aria-label="using default styling" />
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{course.module_count}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{course.topic_count}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{course.lesson_count}</td>
                  <td className="px-3 py-2 text-right">
                    {pricingId === course.id ? (
                      <div className="ml-auto flex w-56 flex-col items-end gap-1.5">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">₹</span>
                          <input
                            type="number" min="0" step="1" autoFocus value={priceInput}
                            onChange={e => setPriceInput(e.target.value)} placeholder="0 = free"
                            aria-label={`Price for ${course.title} in rupees`}
                            className="w-20 rounded-md border border-input bg-background px-2 py-1 text-right text-sm"
                          />
                          <button type="button" onClick={() => savePrice(course)} disabled={savingPrice}
                            className="rounded-md bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground disabled:opacity-50">
                            Save
                          </button>
                          <button type="button" onClick={() => setPricingId(null)} className="px-1 text-xs text-muted-foreground hover:underline">
                            Cancel
                          </button>
                        </div>
                        {(parseFloat(priceInput) || 0) > 0 && course.note_count > 0 && (
                          <label className="flex items-center gap-1.5 text-left text-[11px] text-muted-foreground">
                            <input type="checkbox" checked={lockNotes} onChange={e => setLockNotes(e.target.checked)} />
                            Also lock its {course.note_count} note(s)
                          </label>
                        )}
                      </div>
                    ) : (
                      <button type="button" onClick={() => startPricing(course)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-foreground hover:bg-muted">
                        {course.is_free ? "Free" : formatRupees(course.price_paise)}
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => togglePublished(course)}
                      disabled={!course.is_published && course.lesson_count === 0}
                      title={!course.is_published && course.lesson_count === 0 ? "A course with no lessons cannot be published" : undefined}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        course.is_published
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-muted text-muted-foreground hover:bg-muted/70"
                      }`}
                    >
                      {course.is_published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      {course.is_published ? "Live" : "Draft"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
};

export default AdminCourses;
