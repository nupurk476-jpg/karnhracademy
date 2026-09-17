import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import ContentLoadError from "@/components/ContentLoadError";
import CourseCardTile, { CourseCardSkeleton } from "@/components/CourseCard";
import CourseFilters from "@/components/CourseFilters";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  SORTS, filterCourses, sortCourses, filtersFromParams, paramsFromFilters,
  type CourseCard, type CourseCategory, type Filters, type SortValue,
} from "@/lib/courses";
import { SlidersHorizontal, Search } from "lucide-react";

const PAGE_SIZE = 24;

/**
 * The course catalog: category rail on the left, cards on the right.
 *
 * Two decisions worth knowing about.
 *
 * ONE ROUTE, NO PER-SUBJECT FILES. Everything is driven by the
 * course_categories table, so adding a subject — Economics, say — is a row
 * in the database, not a new route, a new page component and a deploy.
 * That matters here specifically: the site already carries seven
 * near-identical topic page components because the old pattern needed one
 * per subject.
 *
 * FILTERING HAPPENS IN THE BROWSER. The whole published catalog is one
 * request, and ticking a box re-filters in memory rather than round-
 * tripping to the server. At this size that is both faster and simpler —
 * the catalogs this is modelled on reload the entire page to tick a
 * checkbox. Past a few hundred courses this inverts and the filtering
 * should move into SQL; the filter helpers are already pure functions in
 * src/lib/courses.ts, so that change stays in one place.
 */
const CoursesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState<CourseCard[] | null>(null);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [failed, setFailed] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // The URL is the state. Back/forward, sharing and bookmarking then work
  // without any of it being handled specially.
  const filters = useMemo(() => filtersFromParams(searchParams), [searchParams]);
  const setFilters = (next: Filters) => setSearchParams(paramsFromFilters(next), { replace: true });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: cats, error: catError }, { data: rows, error }] = await Promise.all([
        (supabase.from("course_categories" as any) as any)
          .select("*").eq("is_published", true).order("display_order", { ascending: true }),
        (supabase.from("course_cards" as any) as any)
          .select("*").eq("is_published", true),
      ]);
      if (cancelled) return;
      // A failed request must not render as "no courses yet" — that tells
      // a student the catalog is empty when it is only unreachable.
      if (error || catError) {
        console.error("CoursesPage: failed to load catalog", error ?? catError);
        setFailed(true);
        return;
      }
      setCourses(rows ?? []);
      setCategories(cats ?? []);
    })();
    return () => { cancelled = true; };
  }, []);

  // Memoised, not `courses ?? []` inline: a fresh array literal on every
  // render would be a new dependency each time and defeat every useMemo
  // below it, re-filtering and re-counting the whole catalog on each
  // keystroke in the search box.
  const all = useMemo(() => courses ?? [], [courses]);
  const results = useMemo(
    () => sortCourses(filterCourses(all, filters), filters.sort),
    [all, filters],
  );

  // A changed result set starts from the top of the page again.
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [searchParams]);
  const visible = results.slice(0, visibleCount);

  // Only categories that exist in the catalog reach the sidebar, so a
  // subject whose row exists but whose notes are still being written does
  // not advertise itself as an empty section.
  const sidebarCategories = useMemo(
    () => categories.filter(c => all.some(course => course.category_slug === c.slug)),
    [categories, all],
  );

  const activeCount = filters.categories.length + filters.types.length;

  const sidebar = (
    <CourseFilters
      categories={sidebarCategories}
      courses={all}
      filters={filters}
      onChange={next => { setFilters(next); setFiltersOpen(false); }}
    />
  );

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Courses"
        description="Free, structured courses from Karn HR Academy — HRM, Organisational Behaviour, Strategic Management, Economics and UGC NET Labour Welfare, built from notes, lectures and MCQ practice."
        path="/courses"
      />
      <Header />

      {/* max-w-7xl rather than the max-w-6xl the listing-page convention in
          Breadcrumbs.tsx calls for: the 240px filter rail is a case that
          convention predates, and at 6xl it squeezes the three-column grid
          to ~250px cards. The grid itself gets roughly a 6xl of room. */}
      <main id="main-content" className="mx-auto max-w-7xl px-6 py-10">
        <Breadcrumbs items={[{ label: "Courses" }]} />

        <div className="mt-4 mb-8">
          <h1 className="text-4xl font-bold text-foreground">Courses</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Every topic, put in order — notes to read, lectures to watch and MCQs to test
            yourself with, in one path instead of scattered across the site. Free to use.
          </p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Desktop rail. Sticky so the filters stay reachable however far
              down the grid the student has scrolled. */}
          <aside className="hidden w-60 shrink-0 lg:block">
            <div className="sticky top-24">{sidebar}</div>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={filters.search}
                  onChange={e => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search courses…"
                  aria-label="Search courses"
                  className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeCount > 0 && (
                  <span className="rounded-full bg-accent px-1.5 text-xs font-bold text-accent-foreground">
                    {activeCount}
                  </span>
                )}
              </button>

              <select
                value={filters.sort}
                onChange={e => setFilters({ ...filters, sort: e.target.value as SortValue })}
                aria-label="Sort courses"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            {failed ? (
              <ContentLoadError what="the course catalog" />
            ) : courses === null ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <CourseCardSkeleton key={i} />)}
              </div>
            ) : results.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
                <p className="font-medium text-foreground">
                  {all.length === 0 ? "No courses published yet" : "Nothing matches those filters"}
                </p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  {all.length === 0
                    ? "Courses are being put together from the notes, lectures and MCQs already on the site. Check back shortly."
                    : "Try removing a filter — or clear them all to see everything."}
                </p>
                {all.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilters({ ...filters, categories: [], types: [], search: "" })}
                    className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <p className="mb-4 text-sm text-muted-foreground">
                  {results.length} {results.length === 1 ? "course" : "courses"}
                </p>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {visible.map(course => <CourseCardTile key={course.id} course={course} />)}
                </div>
                {visibleCount < results.length && (
                  <div className="mt-8 text-center">
                    <button
                      type="button"
                      onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                      className="rounded-md border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
                    >
                      Show more ({results.length - visibleCount} left)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Mobile filters. The site has no sheet primitive, and the existing
          dialog does the job — it already traps focus and closes on Esc. */}
      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
          </DialogHeader>
          {sidebar}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default CoursesPage;
