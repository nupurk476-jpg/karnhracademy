import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

/**
 * Shown when a fetch FAILED — deliberately worded so it can never be read as
 * "there is nothing here yet".
 *
 * The site's Supabase key silently stopped being accepted once, and because
 * every listing page rendered its own "no notes uploaded yet" copy on failure
 * as well as on genuinely-empty, the whole site looked like an emptied
 * database rather than an outage. Distinguishing the two is the entire point
 * of this component, so keep the copy about *us* failing, never about the
 * shelf being bare.
 */
const ContentLoadError = ({
  what = "this content",
  compact = false,
}: {
  what?: string;
  compact?: boolean;
}) => (
  <div
    role="alert"
    className={`rounded-lg border border-dashed border-destructive/40 bg-destructive/5 text-center ${compact ? "py-8" : "py-16"}`}
  >
    <AlertTriangle className={`mx-auto mb-3 text-destructive/50 ${compact ? "h-7 w-7" : "h-10 w-10"}`} />
    <p className="font-medium text-foreground">Couldn't load {what}.</p>
    <p className="mt-1 text-sm text-muted-foreground">
      This is a problem on our end, not an empty shelf. Please refresh, or{" "}
      <Link to="/contact" className="font-semibold text-accent-deep hover:underline">
        tell us
      </Link>{" "}
      if it keeps happening.
    </p>
  </div>
);

export default ContentLoadError;
