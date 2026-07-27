import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ChevronRight } from "lucide-react";

const SITE_URL = "https://karnhracademy.com";

export interface Crumb {
  label: string;
  /** Route path; omit on the final (current-page) crumb. */
  to?: string;
}

// Visible breadcrumb trail + schema.org BreadcrumbList in one place, so the
// markup Google reads always matches what the visitor sees. Styling mirrors
// the hand-rolled trails that already existed on the quiz and Labour Welfare
// pages (text-xs muted with chevrons) — this just makes it shared and adds
// the structured data.
//
// Almost every page below the homepage renders this as its first element,
// which makes it as good a place as any to note the page-container-width
// convention new pages should follow (`mx-auto max-w-_xl px-…` on the
// element wrapping this component):
//   max-w-7xl — full marketing pages (homepage, blog index)
//   max-w-6xl — listing/hub pages (notes, quizzes, PYQs, LW hub, MBA hub)
//   max-w-4xl — single-item reading/detail pages (unit, topic, paper, profile)
// Narrower widths (max-w-3xl and below) are for long-form article bodies
// only, where shorter line length aids reading.
const Breadcrumbs = ({ items }: { items: Crumb[] }) => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.to ? { item: `${SITE_URL}${c.to}` } : {}),
    })),
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {items.map((c, i) => (
          <span key={`${c.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3 w-3" />}
            {c.to ? (
              <Link to={c.to} className="hover:text-accent-deep transition-colors">{c.label}</Link>
            ) : (
              <span className="font-medium text-foreground">{c.label}</span>
            )}
          </span>
        ))}
      </nav>
    </>
  );
};

export default Breadcrumbs;
