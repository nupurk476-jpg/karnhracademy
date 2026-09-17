import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { track, EVENTS } from "@/lib/analytics";
import { openGateView, resolveGateView } from "@/lib/gateAnalytics";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

const EMAIL_KEY = "khr_subscriber_email";

// One-time email gate for Notes/PYQ downloads, shared by the Labour Welfare
// hub and its per-unit subpages. `request` takes an async URL resolver (a
// fresh signed URL, not a stored permanent one) rather than a plain string
// — see src/lib/signedFileUrl.ts, which both callers use.
export function useDownloadGate() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const pending = useRef<{ resolveUrl: () => Promise<string | null>; onOpened: () => void } | null>(null);
  // The gate_views row this dialog opened. The row -- not this ref -- is
  // what gets resolved: gateAnalytics keeps its own module-scope copy, so
  // an exit that unmounts this hook is still recorded.
  const viewId = useRef<string | null>(null);

  // The actual open, with no tracking of its own. Both entry points below
  // funnel through here, so a download that skips the gate cannot also be
  // counted as a view.
  const doOpen = (resolveUrl: () => Promise<string | null>, onOpened: () => void) => {
    // Every file that reaches this hook is one the browser downloads rather
    // than renders. PDFs never get here — the listing pages route those to
    // the in-app viewer at /notes/view/:id — so what's left is .ppt/.pptx
    // decks, which no browser can display, and attachment downloads.
    //
    // This used to open a tab up front and point it at the file. For a
    // download that tab has nothing to navigate to: it sits on about:blank
    // forever while the file saves behind it, which is what "View" on a
    // slide deck looked like — a blank screen and a mystery download.
    //
    // Navigating the current tab to a downloading URL starts the download
    // without leaving the page, so there's no tab to strand, and nothing
    // for a popup blocker to stop either (which is what used to break
    // downloads in the Instagram/WhatsApp in-app browsers a lot of this
    // audience arrives through).
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
   * Instrumented here rather than at the six call sites that share this
   * hook: one place means uniform coverage, with no chance of a page being
   * silently left out and understating the totals. The `path` column every
   * event already carries supplies the section context, so no caller has
   * to change.
   */
  const openFree = (resolveUrl: () => Promise<string | null>, onOpened: () => void) => {
    track(EVENTS.CONTENT_OPEN, { mode: "view" });
    doOpen(resolveUrl, onOpened);
  };

  const request = (resolveUrl: () => Promise<string | null>, onOpened: () => void) => {
    const saved = localStorage.getItem(EMAIL_KEY);
    if (saved) {
      track(EVENTS.CONTENT_OPEN, { mode: "download" });
      doOpen(resolveUrl, onOpened);
      return;
    }
    pending.current = { resolveUrl, onOpened };
    viewId.current = openGateView();
    setGateOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !pending.current) return;
    const { resolveUrl, onOpened } = pending.current;
    setSubmitting(true);
    // Name is optional: the gate already asks for something in exchange
    // for a download, and making it two required fields costs conversions
    // on the most-used capture point on the site.
    await (supabase.rpc as any)("subscribe_email", { _email: email.trim(), _name: name.trim() || null });
    setSubmitting(false);
    localStorage.setItem(EMAIL_KEY, email.trim());
    // The address goes to email_subscribers and nowhere else; this records
    // only that the gate converted. Clearing `pending` first is what stops
    // dismissGate from also counting this as an abandon.
    pending.current = null;
    resolveGateView(viewId.current, "email_given");
    viewId.current = null;
    setGateOpen(false);
    setEmail("");
    setName("");
    track(EVENTS.CONTENT_OPEN, { mode: "download" });
    // See doOpen for why this is a same-tab navigation and not a popup.
    const url = await resolveUrl();
    if (!url) return;
    onOpened();
    window.location.href = url;
  };

  /**
   * The *deliberate* ways out of the dialog (Cancel, the X, Esc, clicking
   * away). Guarded on `pending`, which a successful submit has already
   * cleared, so an abandon is only ever counted when the visitor really
   * did leave without giving an address.
   *
   * The ways out this cannot see -- closing the tab, switching apps,
   * swiping back -- are handled by the visibilitychange/pagehide beacon in
   * gateAnalytics, which is what used to make "shown" bigger than its two
   * outcomes put together. Resolving twice is harmless: the RPC only ever
   * touches a row still in 'shown'.
   */
  const dismissGate = () => {
    if (pending.current) resolveGateView(viewId.current, "walked_away");
    viewId.current = null;
    setGateOpen(false);
    pending.current = null;
  };

  const GateDialog = () => (
    <Dialog open={gateOpen} onOpenChange={(open) => { if (!open) dismissGate(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Almost there</DialogTitle>
          <DialogDescription>One-time step — we'll remember you on this device and send occasional updates about new study materials.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="text" autoFocus placeholder="First name (optional)"
            value={name} onChange={e => setName(e.target.value)}
            maxLength={80} aria-label="First name (optional)"
            className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="email" required placeholder="your@email.com"
            value={email} onChange={e => setEmail(e.target.value)}
            aria-label="Email address"
            className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50">
              {submitting ? "..." : "Continue"}
            </button>
            <button type="button" onClick={dismissGate} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted">
              Cancel
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link to="/privacy-policy" className="text-accent-deep hover:underline">Privacy Policy</Link>.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );

  return { request, openFree, GateDialog };
}
