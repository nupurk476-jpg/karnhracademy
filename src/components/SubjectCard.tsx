import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface Props {
  icon: React.ElementType;
  title: string;
  description: string;
  slug: string;
  color: string;
  iconColor: string;
  count?: number;
}

export default function SubjectCard({
  icon: Icon,
  title,
  description,
  slug,
  color,
  iconColor,
  count,
}: Props) {
  return (
    <Link
      to={slug}
      className="group flex flex-col gap-4 bg-white border border-border rounded-xl p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between">
        <div className={`${color} rounded-lg p-2.5 w-fit`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {count !== undefined && (
          <span className="text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5">
            {count} resources
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold text-foreground text-base leading-snug" style={{ fontFamily: "Sora, sans-serif" }}>
          {title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <div className="flex items-center gap-1 text-sm font-medium mt-auto opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "hsl(var(--accent))" }}>
        Explore <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </Link>
  );
}
