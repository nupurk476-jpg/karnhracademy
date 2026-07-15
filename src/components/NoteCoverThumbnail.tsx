import { topicGradient } from "@/lib/subjectGradients";
import { iconForTopic } from "@/lib/topicIcons";
import { getTopicLabel } from "@/lib/disciplines";

// Designed cover for every note (PDF or PPT) — instead of a plain file icon,
// or a real-but-inconsistent page-1 scan for PDFs only, every note gets the
// same poster-style gradient cover (same visual language as the quiz cards)
// tuned to the note itself: the gradient is seeded by the file's own URL
// (guaranteed unique — unlike topic, which many notes share, e.g. a dozen
// files all filed under "Motivation") so no two notes render identically,
// and the icon is matched against the note's title first, falling back to
// its topic name, so specific content (e.g. "Equity Theory") can pick a
// more on-point icon than the broad topic bucket it's filed under.
const GeneratedNoteCover = ({
  subject, topicSlug, title, fileUrl, fileTypeLabel, size,
}: {
  subject?: string | null;
  topicSlug?: string | null;
  title: string;
  fileUrl?: string | null;
  fileTypeLabel: string;
  size: "sm" | "lg";
}) => {
  const topicLabel = topicSlug ? getTopicLabel(topicSlug) : "";
  const [from, to] = topicGradient(subject, fileUrl || title);
  const Icon = iconForTopic(`${title} ${topicLabel}`);
  if (size === "sm") {
    return (
      <div className="flex h-full w-full items-center justify-center" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
        <Icon className="h-5 w-5 text-white/90" strokeWidth={1.75} />
      </div>
    );
  }
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
      <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle,#fff 1px,transparent 1px)", backgroundSize: "20px 20px" }} />
      <div className="absolute -right-5 -top-5 h-20 w-20 rotate-45 rounded-lg bg-white/10" />
      <div className="absolute right-10 top-16 h-8 w-8 rotate-45 rounded bg-white/15" />
      <Icon className="absolute -bottom-5 -right-5 h-28 w-28 text-white/10" strokeWidth={1.5} />
      <div className="relative z-10 flex h-full flex-col justify-between p-4">
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
          <Icon className="h-3 w-3" /> {fileTypeLabel}
        </span>
        <h3 className="text-sm font-bold leading-snug text-white line-clamp-3" style={{ fontFamily: "'Sora',sans-serif" }}>
          {title}
        </h3>
      </div>
    </div>
  );
};

type Props = {
  fileUrl?: string | null;
  title: string;
  /** Discipline value (e.g. "hrm", "ob") — the cover's base gradient family. */
  subject?: string | null;
  /** Topic slug — nudges the cover's gradient and picks its icon so notes on different topics look different. */
  topicSlug?: string | null;
  /** "sm" for tiny list-row thumbnails, "lg" for full cards. Defaults to "lg". */
  size?: "sm" | "lg";
  /** Sizing/rounding/overflow for the cover box. */
  className?: string;
  /** Shown only when the file type can't be determined from its URL. */
  children?: React.ReactNode;
};

const NoteCoverThumbnail = ({ fileUrl, title, subject, topicSlug, size = "lg", className, children }: Props) => {
  const isPdf = !!fileUrl && /\.pdf(\?|$)/i.test(fileUrl);
  const isPpt = !!fileUrl && /\.pptx?(\?|$)/i.test(fileUrl);

  return (
    <div className={className}>
      {isPdf || isPpt ? (
        <GeneratedNoteCover
          subject={subject}
          topicSlug={topicSlug}
          title={title}
          fileUrl={fileUrl}
          fileTypeLabel={isPdf ? "PDF" : "PPT"}
          size={size}
        />
      ) : (
        children
      )}
    </div>
  );
};

export default NoteCoverThumbnail;
