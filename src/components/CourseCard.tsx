import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { topicGradient } from "@/lib/subjectGradients";
import { iconForTopic } from "@/lib/topicIcons";
import { describeContents, describeShape, type CourseCard as Course } from "@/lib/courses";
import { isUnitBasedSubject } from "@/lib/subjectUnits";
import { Layers } from "lucide-react";

/**
 * One catalog card.
 *
 * The cover is drawn, not downloaded. A grid of photographic headers is
 * the entire weight of a catalog page like this one, and the site already
 * has a generated-cover system (subjectGradients + topicIcons) that every
 * quiz card and PPT thumbnail uses — so the grid costs no image requests
 * at all and still reads as one designed system. cover_url exists for the
 * day a course earns a real photograph; until then this is better.
 *
 * Deliberately absent: a star rating and a student count. The catalog this
 * is modelled on prints "0.0 / 0 Rating" and "3 Students" on every card,
 * which is not neutral — it tells every visitor that nobody has taken it.
 * Those belong here once the numbers argue for the course rather than
 * against it.
 */
const CourseCardTile = ({ course }: { course: Course }) => {
  // The subject sets the family; the course's own slug nudges the hue, so a
  // grid of twenty HRM cards reads as twenty distinct covers rather than one
  // repeated tile — while still being recognisably HRM. Same helper the note
  // and quiz covers already use.
  const [from, to] = topicGradient(course.category_slug, course.slug);
  const TopicIcon = iconForTopic(course.title);
  const contents = describeContents(course);

  return (
    <Link
      to={`/courses/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {/* Fixed aspect ratio so cards never resize as the grid loads —
          the layout is settled before any content arrives. */}
      <div
        className="relative flex aspect-[16/9] items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
      >
        <TopicIcon className="h-12 w-12 text-white/90 transition-transform duration-300 group-hover:scale-110" strokeWidth={1.5} />
        {course.is_free && (
          <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#17181C]">
            Free
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Badge variant="subject" size="sm" className="w-fit">{course.category_label}</Badge>

        <h3 className="font-bold leading-snug text-foreground group-hover:text-accent-deep">
          {course.title}
        </h3>

        {course.summary && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{course.summary}</p>
        )}

        <div className="mt-auto flex items-center gap-1.5 pt-2 text-xs text-muted-foreground">
          <Layers className="h-3.5 w-3.5" />
          {/* Modules first: a course now covers a whole subject, so how it
              is organised says more than a bare lesson tally. */}
          <span>
            {describeShape(course, isUnitBasedSubject(course.category_slug) ? "unit" : "module")}
            {contents && <span className="text-muted-foreground/70"> · {contents}</span>}
          </span>
        </div>
      </div>
    </Link>
  );
};

/** Matches the tile's real dimensions, so nothing shifts when data lands. */
export const CourseCardSkeleton = () => (
  <div className="overflow-hidden rounded-xl border border-border bg-card">
    <div className="aspect-[16/9] animate-pulse bg-muted" />
    <div className="space-y-3 p-4">
      <div className="h-4 w-20 animate-pulse rounded-full bg-muted" />
      <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
    </div>
  </div>
);

export default CourseCardTile;
