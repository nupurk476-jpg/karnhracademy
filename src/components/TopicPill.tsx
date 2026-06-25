import { Link } from "react-router-dom";

interface Props {
  label: string;
  to: string;
  variant?: "default" | "accent";
}

export default function TopicPill({ label, to, variant = "default" }: Props) {
  if (variant === "accent") {
    return (
      <Link
        to={to}
        className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium border transition-all duration-150 hover:-translate-y-0.5"
        style={{
          backgroundColor: "hsl(var(--accent))",
          color: "hsl(var(--accent-foreground))",
          borderColor: "hsl(var(--accent))",
        }}
      >
        {label}
      </Link>
    );
  }

  return (
    <Link
      to={to}
      className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium border border-border bg-white text-foreground hover:border-transparent transition-all duration-150 hover:-translate-y-0.5"
      style={
        {
          "--tw-hover-bg": "hsl(var(--accent))",
        } as React.CSSProperties
      }
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
          "hsl(var(--accent) / 0.12)";
        (e.currentTarget as HTMLAnchorElement).style.color = "hsl(var(--accent))";
        (e.currentTarget as HTMLAnchorElement).style.borderColor =
          "hsl(var(--accent) / 0.4)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "";
        (e.currentTarget as HTMLAnchorElement).style.color = "";
        (e.currentTarget as HTMLAnchorElement).style.borderColor = "";
      }}
    >
      {label}
    </Link>
  );
}
