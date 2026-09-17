import { BookOpen, type LucideIcon } from "lucide-react";
import { DISCIPLINES } from "@/lib/disciplines";
import { subjectGradient } from "@/lib/subjectGradients";

/**
 * The half of a category that cannot live in the database.
 *
 * course_categories holds everything that changes — label, description,
 * order, published — so adding a subject is a row, not a deploy. But an
 * icon is a React component, and Tailwind purges any class it cannot see
 * literally in the source, so a colour class read from Postgres renders as
 * nothing at all. Both stay here, keyed by slug.
 *
 * The important part is the fallback: a category with no entry here still
 * renders, in the brand's neutral navy, looking deliberate rather than
 * broken. A new subject is live the moment its row exists; giving it a
 * palette of its own is a later, optional deploy that nothing waits on.
 */

export type CategoryStyle = {
  icon: LucideIcon;
  /** Card cover gradient, as [from, to] hex. */
  gradient: [string, string];
  /** Sidebar/badge tint — a literal class string so Tailwind can see it. */
  tint: string;
};

const DEFAULT_STYLE: CategoryStyle = {
  icon: BookOpen,
  gradient: subjectGradient(null),
  tint: "bg-muted text-muted-foreground",
};

/**
 * Built from DISCIPLINES so the catalog, the notes pages and the MCQ pages
 * agree on what a subject looks like. A category that exists only in the
 * database — Economics added through the admin screen before anyone
 * touches disciplines.ts — simply falls through to the default.
 */
const STYLES: Record<string, CategoryStyle> = Object.fromEntries(
  DISCIPLINES.map(d => [
    d.value,
    { icon: d.icon as LucideIcon, gradient: subjectGradient(d.value), tint: d.color },
  ]),
);

export function categoryStyle(slug: string | null | undefined): CategoryStyle {
  return STYLES[slug ?? ""] ?? DEFAULT_STYLE;
}

/** Whether a slug has a hand-picked palette — surfaced in the admin list. */
export function hasCustomStyle(slug: string): boolean {
  return slug in STYLES;
}
