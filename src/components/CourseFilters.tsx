import { Checkbox } from "@/components/ui/checkbox";
import {
  CONTENT_TYPES, categoryCounts, typeCounts, toggle,
  type CourseCard, type CourseCategory, type Filters,
} from "@/lib/courses";

/**
 * The catalog sidebar.
 *
 * One component for both layouts — the desktop rail and the mobile filter
 * sheet render this same thing, so the two can never drift into offering
 * different filters.
 *
 * Every box carries the number of courses it would actually yield given
 * the *other* filters, and an empty one is disabled rather than hidden:
 * that makes a zero-result page unreachable by clicking, while still
 * showing the student the shape of the catalog. Hiding empties instead
 * makes the sidebar jump around as boxes are ticked.
 */
const CourseFilters = ({
  categories, courses, filters, onChange,
}: {
  categories: CourseCategory[];
  courses: CourseCard[];
  filters: Filters;
  onChange: (next: Filters) => void;
}) => {
  const catCounts = categoryCounts(courses, filters);
  const kindCounts = typeCounts(courses, filters);
  const hasAny = filters.categories.length > 0 || filters.types.length > 0 || !!filters.search;

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-foreground">Category</h2>
          {hasAny && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, categories: [], types: [], search: "" })}
              className="text-xs font-medium text-accent-deep hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="space-y-0.5">
          {categories.map(category => {
            const count = catCounts[category.slug] ?? 0;
            const checked = filters.categories.includes(category.slug);
            return (
              <Checkbox
                key={category.slug}
                label={category.label}
                count={count}
                // A ticked box stays clickable even at zero, or there would
                // be no way to untick your way back out of a dead end.
                disabled={count === 0 && !checked}
                checked={checked}
                onChange={() => onChange({ ...filters, categories: toggle(filters.categories, category.slug) })}
              />
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-bold text-foreground">Includes</h2>
        {/* The catalog this is modelled on filters by "Level", which is a
            field this content does not have. This is the same idea against
            data that actually exists. */}
        <p className="mb-3 text-xs text-muted-foreground">Courses containing all of what you tick.</p>
        <div className="space-y-0.5">
          {CONTENT_TYPES.map(type => {
            const count = kindCounts[type.value];
            const checked = filters.types.includes(type.value);
            return (
              <Checkbox
                key={type.value}
                label={type.label}
                count={count}
                disabled={count === 0 && !checked}
                checked={checked}
                onChange={() => onChange({ ...filters, types: toggle(filters.types, type.value) })}
              />
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-bold text-foreground">Price</h2>
        <p className="text-sm text-muted-foreground">
          Every course is free while we build these out.
        </p>
      </section>
    </div>
  );
};

export default CourseFilters;
