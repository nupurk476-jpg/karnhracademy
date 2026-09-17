import type { DisciplineValue } from "@/lib/disciplines";

/**
 * Catalog types and the pure logic behind /courses.
 *
 * Filtering, sorting and counting live here rather than in the page for
 * the same reason analyticsFormat does: they are the parts worth testing,
 * and they should not need React mounted to be tested.
 */

export type CourseItemKind = "note" | "quiz" | "lecture";

/**
 * Is this error "the courses tables aren't there yet" rather than "the
 * request failed"?
 *
 * The catalog ships in the same deploy as the migrations that back it, and
 * a deploy can land before someone runs the SQL. In that window the nav
 * carries a Courses link, and without this the visitor who follows it gets
 * "this is a problem on our end" in a red box — alarming, and not really
 * true: the catalog simply isn't set up yet. PostgREST answers PGRST205
 * for an unknown table, so that specific case reads as the ordinary "no
 * courses yet" empty state instead.
 *
 * Narrow on purpose. A genuine outage — a 500, a dropped connection, RLS
 * refusing the read — still surfaces as the error it is, because hiding
 * one of those behind "nothing here yet" is exactly the failure this
 * codebase already goes out of its way to avoid elsewhere.
 */
export function isMissingTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "PGRST205" || /schema cache/i.test(error.message ?? "");
}

/** A row of the course_cards view — everything one card needs. */
export type CourseCard = {
  id: string;
  slug: string;
  category_slug: string;
  category_label: string;
  category_order: number;
  topic_slug: string | null;
  title: string;
  summary: string | null;
  cover_url: string | null;
  level: string | null;
  is_free: boolean;
  price_paise: number;
  is_published: boolean;
  display_order: number;
  created_at: string;
  lesson_count: number;
  note_count: number;
  quiz_count: number;
  lecture_count: number;
  module_count: number;
};

export type CourseCategory = {
  slug: string;
  label: string;
  description: string | null;
  display_order: number;
  is_published: boolean;
};

export const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest first" },
  { value: "lessons", label: "Most lessons" },
  { value: "alpha", label: "A–Z" },
] as const;

export type SortValue = (typeof SORTS)[number]["value"];

export const CONTENT_TYPES: { value: CourseItemKind; label: string }[] = [
  { value: "note", label: "Notes" },
  { value: "quiz", label: "MCQs" },
  { value: "lecture", label: "Lectures" },
];

export type Filters = {
  categories: string[];
  types: CourseItemKind[];
  search: string;
  sort: SortValue;
};

export const EMPTY_FILTERS: Filters = { categories: [], types: [], search: "", sort: "featured" };

const isSort = (v: string): v is SortValue => SORTS.some(s => s.value === v);
const isKind = (v: string): v is CourseItemKind => CONTENT_TYPES.some(t => t.value === v);

/** `?category=hrm,ob` → ["hrm","ob"]. Blank and duplicate entries dropped. */
function parseList(raw: string | null): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(",").map(s => s.trim()).filter(Boolean))];
}

/**
 * The URL is the single source of truth for what the page is showing, so a
 * filtered catalog can be shared, bookmarked, and walked back through with
 * the browser's own back button.
 */
export function filtersFromParams(params: URLSearchParams): Filters {
  const sort = params.get("sort") ?? "";
  return {
    categories: parseList(params.get("category")),
    types: parseList(params.get("type")).filter(isKind),
    search: params.get("q") ?? "",
    sort: isSort(sort) ? sort : "featured",
  };
}

/**
 * Only non-default values are written, so the plain catalog stays at a
 * clean /courses instead of carrying a tail of empty parameters the way
 * the plugin-generated catalogs this is modelled on do.
 */
export function paramsFromFilters(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.categories.length) params.set("category", filters.categories.join(","));
  if (filters.types.length) params.set("type", filters.types.join(","));
  if (filters.search.trim()) params.set("q", filters.search.trim());
  if (filters.sort !== "featured") params.set("sort", filters.sort);
  return params;
}

/** Add or remove one value — what a checkbox does. */
export function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter(v => v !== value) : [...list, value];
}

export function hasType(course: CourseCard, kind: CourseItemKind): boolean {
  if (kind === "note") return course.note_count > 0;
  if (kind === "quiz") return course.quiz_count > 0;
  return course.lecture_count > 0;
}

/**
 * Category and content-type behave differently on purpose. Ticking two
 * categories widens the result (HR *or* OB — that is what a sidebar of
 * subjects means), while ticking two content types narrows it (courses
 * with notes *and* MCQs), because that is a student asking for a course
 * that has both.
 */
export function filterCourses(courses: CourseCard[], filters: Filters): CourseCard[] {
  const term = filters.search.trim().toLowerCase();
  return courses.filter(course => {
    if (filters.categories.length && !filters.categories.includes(course.category_slug)) return false;
    if (filters.types.length && !filters.types.every(kind => hasType(course, kind))) return false;
    if (term) {
      const haystack = `${course.title} ${course.summary ?? ""} ${course.category_label}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });
}

export function sortCourses(courses: CourseCard[], sort: SortValue): CourseCard[] {
  const list = [...courses];
  if (sort === "newest") list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  if (sort === "lessons") list.sort((a, b) => b.lesson_count - a.lesson_count);
  if (sort === "alpha") list.sort((a, b) => a.title.localeCompare(b.title));
  // "featured" is the order the admin set: category order, then the
  // course's own display_order, then title as a stable tiebreak so the grid
  // never reshuffles between loads.
  if (sort === "featured") {
    list.sort((a, b) =>
      a.category_order - b.category_order ||
      a.display_order - b.display_order ||
      a.title.localeCompare(b.title));
  }
  return list;
}

/**
 * How many courses each category would contribute *given the other filters*
 * — so the number beside a checkbox is what ticking it actually yields.
 * The category's own selection is excluded from its count, otherwise every
 * unticked box would read 0 as soon as one box was ticked.
 */
export function categoryCounts(courses: CourseCard[], filters: Filters): Record<string, number> {
  const base = filterCourses(courses, { ...filters, categories: [] });
  const counts: Record<string, number> = {};
  for (const course of base) {
    counts[course.category_slug] = (counts[course.category_slug] ?? 0) + 1;
  }
  return counts;
}

export function typeCounts(courses: CourseCard[], filters: Filters): Record<CourseItemKind, number> {
  const base = filterCourses(courses, { ...filters, types: [] });
  return {
    note: base.filter(c => hasType(c, "note")).length,
    quiz: base.filter(c => hasType(c, "quiz")).length,
    lecture: base.filter(c => hasType(c, "lecture")).length,
  };
}

/** "4 notes · 1 lecture · 1 MCQ set" — only the parts that are there. */
export function describeContents(course: CourseCard): string {
  const parts: string[] = [];
  if (course.note_count) parts.push(`${course.note_count} ${course.note_count === 1 ? "note" : "notes"}`);
  if (course.lecture_count) parts.push(`${course.lecture_count} ${course.lecture_count === 1 ? "lecture" : "lectures"}`);
  if (course.quiz_count) parts.push(`${course.quiz_count} MCQ ${course.quiz_count === 1 ? "set" : "sets"}`);
  return parts.join(" · ");
}

/**
 * "12 modules · 47 lessons" — the headline for a subject-level course.
 *
 * A course now spans a whole subject, so the module count is what conveys
 * its shape; a bare lesson count says nothing about how it is organised.
 * The module part is dropped when there is only one, because "1 module"
 * describes a topic, not a course, and is better left unsaid.
 */
export function describeShape(course: CourseCard): string {
  const lessons = `${course.lesson_count} ${course.lesson_count === 1 ? "lesson" : "lessons"}`;
  if (course.module_count > 1) return `${course.module_count} modules · ${lessons}`;
  return lessons;
}

/**
 * Lessons grouped into the modules a course page renders, in syllabus
 * order.
 *
 * The order comes from `topicOrder` — the caller passes the subject's
 * topic slugs as disciplines.ts lists them, which is the syllabus sequence
 * a student studies in. Postgres has no view of that file, so the sync can
 * only order items alphabetically by topic; this is where that becomes
 * Unit 1 before Unit 2. Any topic not in the list (content filed under a
 * topic added to the data but not yet to disciplines.ts) sorts last rather
 * than disappearing.
 */
export function groupIntoModules<T extends { topic_slug: string | null; position: number }>(
  items: T[],
  topicOrder: string[],
  labelFor: (slug: string) => string,
): { slug: string; label: string; items: T[] }[] {
  const rank = new Map(topicOrder.map((slug, i) => [slug, i]));
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = item.topic_slug ?? "";
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }
  return [...groups.entries()]
    .map(([slug, group]) => ({
      slug,
      label: labelFor(slug),
      items: [...group].sort((a, b) => a.position - b.position),
    }))
    .sort((a, b) =>
      (rank.get(a.slug) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.slug) ?? Number.MAX_SAFE_INTEGER) ||
      a.label.localeCompare(b.label));
}

export type { DisciplineValue };
