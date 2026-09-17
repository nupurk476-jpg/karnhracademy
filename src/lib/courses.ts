import type { DisciplineValue } from "@/lib/disciplines";

/**
 * Catalog types and the pure logic behind /courses.
 *
 * Filtering, sorting and counting live here rather than in the page for
 * the same reason analyticsFormat does: they are the parts worth testing,
 * and they should not need React mounted to be tested.
 */

export type CourseItemKind = "note" | "quiz" | "lecture";

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

/** "12 lessons · 3 MCQ sets" — only the parts that are actually there. */
export function describeContents(course: CourseCard): string {
  const parts: string[] = [];
  if (course.note_count) parts.push(`${course.note_count} ${course.note_count === 1 ? "note" : "notes"}`);
  if (course.lecture_count) parts.push(`${course.lecture_count} ${course.lecture_count === 1 ? "lecture" : "lectures"}`);
  if (course.quiz_count) parts.push(`${course.quiz_count} MCQ ${course.quiz_count === 1 ? "set" : "sets"}`);
  return parts.join(" · ");
}

export type { DisciplineValue };
