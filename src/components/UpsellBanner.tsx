import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/**
 * One quiet line at the foot of a free page. The free notes, MCQs, PYQs and
 * lectures are what earn the audience in the first place, so this stays a
 * single understated row — never an interstitial, never above the content,
 * never repeated down the page.
 */
const UpsellBanner = ({ className = "" }: { className?: string }) => (
  <aside
    className={`mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-5 py-4 ${className}`}
  >
    <p className="text-sm text-muted-foreground">
      Want the complete unit pack with test series?
    </p>
    <Link
      to="/programmes"
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-deep hover:underline"
    >
      See programmes
      <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
    </Link>
  </aside>
);

export default UpsellBanner;
