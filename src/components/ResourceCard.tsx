import { Link } from "react-router-dom";
import { FileText, Video, BookOpen, ArrowRight } from "lucide-react";

interface Props {
  type: "note" | "video" | "blog";
  title: string;
  subject?: string;
  description?: string;
  to: string;
  date?: string;
  isNew?: boolean;
}

const typeConfig = {
  note: {
    icon: FileText,
    label: "Note",
    color: "bg-blue-50 text-blue-600",
    cta: "Read more",
  },
  video: {
    icon: Video,
    label: "Video",
    color: "bg-violet-50 text-violet-600",
    cta: "Watch",
  },
  blog: {
    icon: BookOpen,
    label: "Blog",
    color: "bg-emerald-50 text-emerald-600",
    cta: "Read more",
  },
};

export default function ResourceCard({
  type,
  title,
  subject,
  description,
  to,
  date,
  isNew,
}: Props) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className="group flex flex-col bg-white border border-border rounded-xl p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-3">
        <div className={`${config.color} rounded-lg p-2 w-fit`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-2">
          {isNew && (
            <span
              className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: "hsl(var(--accent) / 0.15)",
                color: "hsl(var(--accent))",
              }}
            >
              New
            </span>
          )}
          <span className="text-xs text-muted-foreground">{config.label}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 flex-1">
        <h3
          className="font-semibold text-foreground text-base leading-snug line-clamp-2"
          style={{ fontFamily: "Sora, sans-serif" }}
        >
          {title}
        </h3>
        {subject && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 w-fit">
            {subject}
          </span>
        )}
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        {date && <span className="text-xs text-muted-foreground">{date}</span>}
        <Link
          to={to}
          className="flex items-center gap-1 text-sm font-medium ml-auto"
          style={{ color: "hsl(var(--accent))" }}
        >
          {config.cta} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
