import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  action?: { label: string; to: string };
}

export default function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "left",
  action,
}: Props) {
  const isCenter = align === "center";

  return (
    <div
      className={`flex flex-col gap-2 ${isCenter ? "items-center text-center" : "items-start"}`}
    >
      <div
        className={`flex items-start ${isCenter ? "justify-center" : "justify-between"} w-full gap-4`}
      >
        <div className={`flex flex-col gap-2 ${isCenter ? "items-center" : "items-start"}`}>
          {eyebrow && (
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "hsl(var(--accent))" }}
            >
              {eyebrow}
            </span>
          )}
          <h2
            className="text-2xl md:text-3xl font-bold text-foreground"
            style={{ fontFamily: "Sora, sans-serif" }}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-muted-foreground text-base max-w-xl mt-1">{subtitle}</p>
          )}
        </div>
        {action && !isCenter && (
          <Link
            to={action.to}
            className="hidden md:flex items-center gap-1 text-sm font-medium shrink-0 mt-1 hover:underline"
            style={{ color: "hsl(var(--accent))" }}
          >
            {action.label}
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>
      {action && isCenter && (
        <Link
          to={action.to}
          className="flex items-center gap-1 text-sm font-medium mt-2 hover:underline"
          style={{ color: "hsl(var(--accent))" }}
        >
          {action.label}
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
