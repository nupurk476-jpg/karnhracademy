import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  const [submitting, setSubmitting] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const pending = useRef<{ resolveUrl: () => Promise<string | null>; onOpened: () => void } | null>(null);

  const request = (resolveUrl: () => Promise<string | null>, onOpened: () => void) => {
    const saved = localStorage.getItem(EMAIL_KEY);
    if (saved) {
      const win = window.open("", "_blank"); // synchronous within the click — popup-safe
      resolveUrl().then((url) => {
        if (!url) { win?.close(); return; }
        onOpened();
        if (win) win.location.href = url; else window.open(url, "_blank");
      });
      return;
    }
    pending.current = { resolveUrl, onOpened };
    setGateOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !pending.current) return;
    const { resolveUrl, onOpened } = pending.current;
    const win = window.open("", "_blank");
    setSubmitting(true);
    await supabase.from("email_subscribers").upsert({ email: email.trim() }, { onConflict: "email" });
    setSubmitting(false);
    localStorage.setItem(EMAIL_KEY, email.trim());
    setGateOpen(false);
    setEmail("");
    pending.current = null;
    const url = win ? await resolveUrl() : null;
    if (url && win) { onOpened(); win.location.href = url; } else win?.close();
  };

  const GateDialog = () => (
    <Dialog open={gateOpen} onOpenChange={(open) => { if (!open) { setGateOpen(false); pending.current = null; } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter your email to continue</DialogTitle>
          <DialogDescription>One-time step — we'll remember you on this device and send occasional updates about new study materials.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="email" required autoFocus placeholder="your@email.com"
            value={email} onChange={e => setEmail(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50">
              {submitting ? "..." : "Continue"}
            </button>
            <button type="button" onClick={() => { setGateOpen(false); pending.current = null; }} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted">
              Cancel
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link to="/privacy-policy" className="text-accent hover:underline">Privacy Policy</Link>.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );

  return { request, GateDialog };
}
