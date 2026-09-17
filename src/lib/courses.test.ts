import { describe, it, expect } from "vitest";
import {
  filtersFromParams, paramsFromFilters, toggle, filterCourses, sortCourses,
  categoryCounts, typeCounts, describeContents, isMissingTableError, EMPTY_FILTERS,
  type CourseCard,
} from "./courses";

const card = (over: Partial<CourseCard>): CourseCard => ({
  id: over.slug ?? "id", slug: "c", category_slug: "hrm", category_label: "HRM",
  category_order: 0, topic_slug: "t", title: "Course", summary: null, cover_url: null,
  level: null, is_free: true, price_paise: 0, is_published: true, display_order: 0,
  created_at: "2026-01-01T00:00:00Z", lesson_count: 0, note_count: 0, quiz_count: 0,
  lecture_count: 0, ...over,
});

const CATALOG = [
  card({ slug: "comp", title: "Compensation", category_slug: "hrm", category_label: "HRM",
         category_order: 0, note_count: 3, lesson_count: 3, created_at: "2026-03-01T00:00:00Z" }),
  card({ slug: "moti", title: "Motivation", category_slug: "ob", category_label: "Organisational Behaviour",
         category_order: 1, note_count: 2, quiz_count: 1, lecture_count: 1, lesson_count: 4,
         created_at: "2026-05-01T00:00:00Z" }),
  card({ slug: "elas", title: "Elasticity", category_slug: "mba-eco", category_label: "Managerial Economics",
         category_order: 2, note_count: 1, quiz_count: 1, lesson_count: 2,
         created_at: "2026-02-01T00:00:00Z" }),
];

describe("filter state in the URL", () => {
  it("round-trips through the query string", () => {
    const filters = { categories: ["hrm", "ob"], types: ["quiz" as const], search: "pay", sort: "newest" as const };
    expect(filtersFromParams(paramsFromFilters(filters))).toEqual(filters);
  });

  it("leaves the plain catalog at a clean /courses", () => {
    expect(paramsFromFilters(EMPTY_FILTERS).toString()).toBe("");
  });

  it("ignores junk rather than rendering an empty catalog", () => {
    const f = filtersFromParams(new URLSearchParams("category=hrm,,hrm&type=note,bogus&sort=chaos"));
    expect(f.categories).toEqual(["hrm"]);   // blank and duplicate dropped
    expect(f.types).toEqual(["note"]);       // unknown kind dropped
    expect(f.sort).toBe("featured");         // unknown sort falls back
  });

  it("toggles a value on and off", () => {
    expect(toggle(["hrm"], "ob")).toEqual(["hrm", "ob"]);
    expect(toggle(["hrm", "ob"], "hrm")).toEqual(["ob"]);
  });
});

describe("filtering", () => {
  it("treats several categories as OR — the sidebar widens the result", () => {
    const got = filterCourses(CATALOG, { ...EMPTY_FILTERS, categories: ["hrm", "ob"] });
    expect(got.map(c => c.slug)).toEqual(["comp", "moti"]);
  });

  it("treats several content types as AND — 'has notes and MCQs'", () => {
    const got = filterCourses(CATALOG, { ...EMPTY_FILTERS, types: ["note", "quiz"] });
    expect(got.map(c => c.slug)).toEqual(["moti", "elas"]);
  });

  it("searches title and category label", () => {
    expect(filterCourses(CATALOG, { ...EMPTY_FILTERS, search: "motiv" }).map(c => c.slug)).toEqual(["moti"]);
    expect(filterCourses(CATALOG, { ...EMPTY_FILTERS, search: "HRM" }).map(c => c.slug)).toEqual(["comp"]);
  });
});

describe("sorting", () => {
  it("orders by newest, lessons and title", () => {
    expect(sortCourses(CATALOG, "newest").map(c => c.slug)).toEqual(["moti", "comp", "elas"]);
    expect(sortCourses(CATALOG, "lessons").map(c => c.slug)).toEqual(["moti", "comp", "elas"]);
    expect(sortCourses(CATALOG, "alpha").map(c => c.slug)).toEqual(["comp", "elas", "moti"]);
  });

  it("puts featured in the order the admin set, and never mutates the input", () => {
    const before = CATALOG.map(c => c.slug);
    expect(sortCourses(CATALOG, "featured").map(c => c.slug)).toEqual(["comp", "moti", "elas"]);
    expect(CATALOG.map(c => c.slug)).toEqual(before);
  });
});

describe("sidebar counts", () => {
  /**
   * The whole point of showing counts is that a student can never click
   * into an empty page. That only holds if the number beside a box is what
   * ticking it would actually produce.
   */
  it("shows what ticking each box would yield, given the other filters", () => {
    const counts = categoryCounts(CATALOG, { ...EMPTY_FILTERS, types: ["quiz"] });
    expect(counts).toEqual({ ob: 1, "mba-eco": 1 }); // hrm has no MCQs: absent, so rendered as 0
  });

  it("does not zero out the other boxes once one category is ticked", () => {
    const counts = categoryCounts(CATALOG, { ...EMPTY_FILTERS, categories: ["hrm"] });
    expect(counts).toEqual({ hrm: 1, ob: 1, "mba-eco": 1 });
  });

  it("counts each content type against the rest of the filters", () => {
    expect(typeCounts(CATALOG, EMPTY_FILTERS)).toEqual({ note: 3, quiz: 2, lecture: 1 });
    expect(typeCounts(CATALOG, { ...EMPTY_FILTERS, categories: ["ob"] })).toEqual({ note: 1, quiz: 1, lecture: 1 });
  });

  it("every count matches what the filter actually returns", () => {
    const filters = { ...EMPTY_FILTERS, types: ["note" as const] };
    for (const [slug, n] of Object.entries(categoryCounts(CATALOG, filters))) {
      expect(filterCourses(CATALOG, { ...filters, categories: [slug] })).toHaveLength(n);
    }
  });
});

describe("card wording", () => {
  it("names only the parts a course actually has, with singulars", () => {
    expect(describeContents(CATALOG[1])).toBe("2 notes · 1 lecture · 1 MCQ set");
    expect(describeContents(CATALOG[2])).toBe("1 note · 1 MCQ set");
    expect(describeContents(card({}))).toBe("");
  });
});

describe("telling 'not set up yet' from 'broken'", () => {
  /**
   * The catalog can deploy before its migrations are run. In that window a
   * visitor following the Courses nav link should see an empty catalog, not
   * a red "problem on our end" box.
   */
  it("recognises PostgREST's unknown-table error", () => {
    expect(isMissingTableError({ code: "PGRST205", message: "Could not find the table 'public.course_cards' in the schema cache" })).toBe(true);
    expect(isMissingTableError({ message: "Could not find the table in the schema cache" })).toBe(true);
  });

  it("does not swallow a real failure as an empty shelf", () => {
    expect(isMissingTableError({ code: "500", message: "Internal Server Error" })).toBe(false);
    expect(isMissingTableError({ code: "42501", message: "permission denied for table courses" })).toBe(false);
    expect(isMissingTableError({ message: "NetworkError when attempting to fetch resource" })).toBe(false);
    expect(isMissingTableError(null)).toBe(false);
    expect(isMissingTableError(undefined)).toBe(false);
  });
});
