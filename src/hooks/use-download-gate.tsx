import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { track, EVENTS } from "@/lib/analytics";
import { openGateView, resolveGateView } from "@/lib/gateAnalytics";
import { getSignedFileUrl, isPdfFile } from "@/lib/signedFileUrl";
import PdfPreview from "@/components/PdfPreview";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

const EMAIL_KEY = "khr_subscriber_email";

// Same deliberately loose shape capture_download_email checks server-side;
// this only exists to answer a typo instantly instead of after a round trip.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ERR_INVALID = "That email address doesn't look right — please check it and try again.";
const ERR_FAILED = "We couldn't save your email just now. Please try again.";

/** What is being downloaded — the gate's headline is built from this. */
export type GateResource = {
  title: string;
  isPdf: boolean;
  /**
   * A signed *view* URL for the PDF. When given, the visitor first sees the
   * cover and first two pages, and the headline gets the real page count.
   */
  previewUrl?: () => Promise<string | null>;
  /** Page count, when the caller already has the document open. */
  pages?: number | null;
};

type Pending = { resolveUrl: () => Promise<string | null>; onOpened: () => void };
type Step = "closed" | "preview" | "form" | "success";

function hasSavedEmail(): boolean {
  try {
    return !!localStorage.getItem(EMAIL_KEY);
  } catch {
    return false;
  }
}

/** Someone who already gave us an address, on this device or by signing in. */
async function isKnownVisitor(): Promise<boolean> {
  if (hasSavedEmail()) return true;
  try {
    const { data } = await supabase.auth.getSession();
    return !!data.session?.user?.email;
  } catch {
    return false;
  }
}

export function gateHeadline(resource: GateResource | null, pages: number | null): string {
  if (!resource) return "Get your free download";
  if (!resource.isPdf) return `${resource.title} — free download`;
  return pages ? `${resource.title} — full ${pages}-page PDF, free` : `${resource.title} — full PDF, free`;
}

// One-time email gate for Notes/PYQ downloads, shared by every page that
// lists downloads. `request` takes an async URL resolver (a fresh signed
// URL, not a stored permanent one) rather than a plain string — see
// src/lib/signedFileUrl.ts, which every caller uses.
//
// Returns `gateDialog` as an element, not a component. It used to return a
// component defined inside this hook, which is a new component type on
// every render: typing one character re-rendered the page, React threw the
// whole dialog away and mounted a fresh one, and focus jumped out of the
// email box. On a phone that made the only field hard to type into.
export function useDownloadGate() {
  const [step, setStep] = useState<Step>("closed");
  const [resource, setResource] = useState<GateResource | null>(null);
  const [pages, setPages] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<Pending | null>(null);
  // What the success screen's "Download again" re-runs.
  const lastDownload = useRef<Pending | null>(null);
  // The gate_views row this dialog opened. The row -- not this ref -- is
  // what gets resolved: gateAnalytics keeps its own module-scope copy, so
  // an exit that unmounts this hook is still recorded.
  const viewId = useRef<string | null>(null);

  // The actual open, with no tracking of its own. Every entry point below
  // funnels through here, so a download that skips the gate cannot also be
  // counted as a view.
  const doOpen = (resolveUrl: () => Promise<string | null>, onOpened: () => void) => {
    // Navigating the current tab to a downloading URL starts the download
    // without leaving the page, so there's no blank tab to strand, and
    // nothing for a popup blocker to stop either (which is what used to
    // break downloads in the Instagram/WhatsApp in-app browsers a lot of
    // this audience arrives through).
    resolveUrl().then((url) => {
      if (!url) return;
      onOpened();
      window.location.href = url;
    });
  };

  /**
   * Ungated open — used for in-browser *viewing*, which stays friction-free
   * for first-time visitors; the email ask is reserved for downloads.
   *
   * Instrumented here rather than at the call sites that share this hook:
   * one place means uniform coverage. The `path` column every event
   * already carries supplies the section context.
   */
  const openFree = (resolveUrl: () => Promise<string | null>, onOpened: () => void) => {
    track(EVENTS.CONTENT_OPEN, { mode: "view" });
    doOpen(resolveUrl, onOpened);
  };

  /**
   * The gate itself going on screen. This -- not the preview -- is what
   * "gate shown" counts, so the dashboard's shown = gave email + walked
   * away + unresolved still holds: every row opened here is resolved by
   * submit, close, or the exit beacon.
   */
  const showForm = () => {
    viewId.current = openGateView();
    setError(null);
    setStep("form");
  };

  const request = (
    resolveUrl: () => Promise<string | null>,
    onOpened: () => void,
    res?: GateResource,
  ) => {
    // Checked synchronously first so the common returning-visitor case
    // starts the download inside the click, with no async hop at all.
    if (hasSavedEmail()) {
      track(EVENTS.CONTENT_OPEN, { mode: "download" });
      doOpen(resolveUrl, onOpened);
      return;
    }
    void isKnownVisitor().then((known) => {
      if (known) {
        track(EVENTS.CONTENT_OPEN, { mode: "download" });
        doOpen(resolveUrl, onOpened);
        return;
      }
      pending.current = { resolveUrl, onOpened };
      setResource(res ?? null);
      setPages(res?.pages ?? null);
      setEmail("");
      setNewsletter(false);
      if (res?.previewUrl) {
        setError(null);
        setStep("preview");
      } else {
        showForm();
      }
    });
  };

  /**
   * The Download button on every page that lists notes. PDFs get the
   * cover + first-pages preview; decks and other files go straight to the
   * form, since there is nothing a browser can preview.
   */
  const downloadNote = (fileUrl: string, title: string, onOpened: () => void) => {
    const isPdf = isPdfFile(fileUrl);
    request(() => getSignedFileUrl(fileUrl, "notes", true), onOpened, {
      title,
      isPdf,
      previewUrl: isPdf ? () => getSignedFileUrl(fileUrl, "notes", false) : undefined,
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const job = pending.current;
    if (!job || submitting) return;
    const clean = email.trim();
    if (!EMAIL_RE.test(clean)) {
      setError(ERR_INVALID);
      return;
    }

    setSubmitting(true);
    setError(null);
    let failure: string | null = null;
    try {
      const { error: rpcError } = await (supabase.rpc as any)("capture_download_email", {
        _email: clean,
        _newsletter: newsletter,
        _path: window.location.pathname.slice(0, 500),
      });
      if (rpcError) failure = /invalid email/i.test(rpcError.message ?? "") ? ERR_INVALID : ERR_FAILED;
    } catch {
      failure = ERR_FAILED;
    }
    setSubmitting(false);

    // Nothing is recorded until the address is actually stored: the gate
    // stays open, the gate_views row stays 'shown', and the visitor can
    // retry. Closing from here is an ordinary walk-away.
    if (failure) {
      setError(failure);
      return;
    }

    try {
      localStorage.setItem(EMAIL_KEY, clean);
    } catch {
      // Private mode: they'll see the gate again next visit, nothing worse.
    }
    // Closed while the request was in flight: already counted as a
    // walk-away, and starting a download they backed out of would be rude.
    if (pending.current !== job) return;

    // The address goes to download_emails (and email_subscribers only if
    // the box was ticked); this records only that the gate converted.
    // Clearing `pending` first is what stops a close from also counting
    // this as an abandon.
    pending.current = null;
    resolveGateView(viewId.current, "email_given");
    viewId.current = null;
    if (newsletter) track(EVENTS.NEWSLETTER_SUBSCRIBE, { where: "download_gate" });
    track(EVENTS.CONTENT_OPEN, { mode: "download" });

    lastDownload.current = job;
    setStep("success");
    doOpen(job.resolveUrl, job.onOpened);
  };

  const downloadAgain = () => {
    // The view was already counted on the first go.
    if (lastDownload.current) doOpen(lastDownload.current.resolveUrl, () => {});
  };

  /**
   * Every way out of the dialog (the X, Esc, clicking away, "Done").
   * A walk-away is only recorded while the form is up and unanswered --
   * closing the preview never opened a gate view, and closing the success
   * screen follows a conversion. Tab close, app switch and swipe-back are
   * handled by the visibilitychange/pagehide beacon in gateAnalytics.
   */
  const close = () => {
    if (pending.current && viewId.current) resolveGateView(viewId.current, "walked_away");
    viewId.current = null;
    pending.current = null;
    setStep("closed");
    setError(null);
    setSubmitting(false);
  };

  const title = resource?.title ?? "";
  const headline = gateHeadline(resource, pages);

  const gateDialog = (
    <Dialog open={step !== "closed"} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className="max-h-[92dvh] w-[calc(100%-2rem)] gap-4 overflow-y-auto rounded-xl p-5 sm:max-w-md sm:p-6">
        {step === "preview" && resource?.previewUrl && (
          <>
            <DialogHeader className="pr-8 text-left">
              <DialogTitle className="text-lg leading-snug">{title}</DialogTitle>
              <DialogDescription>
                {pages ? `Preview — the first ${Math.min(3, pages)} of ${pages} pages.` : "Preview — the cover and first 2 pages."}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[55dvh] overflow-y-auto rounded-lg">
              <PdfPreview resolveUrl={resource.previewUrl} onPageCount={setPages} />
            </div>
            <button
              type="button"
              onClick={showForm}
              className="h-12 w-full rounded-lg bg-accent px-4 text-base font-semibold text-accent-foreground hover:brightness-110"
            >
              Get the full PDF free
            </button>
          </>
        )}

        {step === "form" && (
          <>
            <DialogHeader className="pr-8 text-left">
              <DialogTitle className="text-lg leading-snug">{headline}</DialogTitle>
              <DialogDescription>Enter your email and the download starts straight away.</DialogDescription>
            </DialogHeader>
            {/* noValidate: our own message, shown the same way in every
                browser, instead of Safari's native bubble. */}
            <form onSubmit={submit} noValidate className="space-y-3">
              <input
                type="email"
                name="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                autoFocus
                placeholder="your@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
                aria-label="Email address"
                aria-invalid={!!error}
                aria-describedby={error ? "gate-error" : undefined}
                // text-base (16px): anything smaller and iOS Safari zooms
                // the page when the field is focused.
                className="h-12 w-full rounded-lg border border-input bg-background px-4 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={newsletter}
                  onChange={(e) => setNewsletter(e.target.checked)}
                  className="h-5 w-5 shrink-0 accent-[hsl(var(--accent))]"
                />
                Send me new notes and exam updates.
              </label>
              {error && (
                <p id="gate-error" role="alert" className="text-sm font-medium text-destructive">{error}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-base font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-60"
              >
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : resource?.isPdf === false ? "Get the file" : "Get the PDF"}
              </button>
              <p className="text-center text-sm text-muted-foreground">No spam. One click to unsubscribe.</p>
              <p className="text-center text-xs text-muted-foreground">
                By continuing, you agree to our{" "}
                <Link to="/privacy-policy" className="text-accent-deep hover:underline">Privacy Policy</Link>.
              </p>
            </form>
          </>
        )}

        {step === "success" && (
          <>
            <DialogHeader className="pr-8 text-left">
              <DialogTitle className="flex items-center gap-2 text-lg leading-snug">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" /> Your download has started
              </DialogTitle>
              <DialogDescription>{title || "Your file"} is on its way to your device.</DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Nothing happened?{" "}
              <button
                type="button"
                onClick={downloadAgain}
                className="inline-flex min-h-11 items-center font-semibold text-accent-deep underline underline-offset-2"
              >
                Download again
              </button>
            </p>
            <button
              type="button"
              onClick={close}
              className="h-12 w-full rounded-lg border border-border px-4 text-base font-semibold text-foreground hover:bg-muted"
            >
              Done
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );

  return { request, openFree, downloadNote, gateDialog };
}
