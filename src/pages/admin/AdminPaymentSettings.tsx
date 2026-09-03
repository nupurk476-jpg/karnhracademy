import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
const LABEL = "mb-1 block text-xs font-semibold text-foreground";

/**
 * The UPI handle and QR shown to students on the payment step.
 *
 * Everything on this page is deliberately world-readable — a payer has to
 * see it to pay. That is exactly why it must never hold an account number,
 * IFSC, or anything else that isn't already printed on a QR code you'd
 * hand across a counter.
 */
const AdminPaymentSettings = () => {
  const [upiId, setUpiId] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [payee, setPayee] = useState("");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (supabase.from("payment_settings" as any) as any)
      .select("*").maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setUpiId(data.upi_id ?? "");
          setQrUrl(data.upi_qr_url ?? "");
          setPayee(data.payee_label ?? "");
          setInstructions(data.instructions ?? "");
        }
        setLoading(false);
      });
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await (supabase.from("payment_settings" as any) as any)
      .update({
        upi_id: upiId.trim() || null,
        upi_qr_url: qrUrl.trim() || null,
        payee_label: payee.trim() || null,
        instructions: instructions.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save payment settings", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Payment settings saved" });
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-3xl font-bold text-foreground">Payment settings</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        What students see on the payment step when registering for a programme.
      </p>

      <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          These details are shown publicly on the registration page. Put only your UPI ID and
          QR code here — never a bank account number or IFSC code.
        </p>
      </div>

      <form onSubmit={save} className="space-y-4 rounded-lg border border-border bg-card p-5">
        <div>
          <label className={LABEL} htmlFor="upi-id">UPI ID</label>
          <input id="upi-id" className={FIELD} value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@okbank" />
          <p className="mt-1 text-xs text-muted-foreground">
            Until this is set, the registration form can't be submitted.
          </p>
        </div>
        <div>
          <label className={LABEL} htmlFor="payee">Payee name</label>
          <input id="payee" className={FIELD} value={payee} onChange={e => setPayee(e.target.value)} placeholder="Karn HR Academy" />
          <p className="mt-1 text-xs text-muted-foreground">
            Shown in the student's UPI app. Should match the name on your account.
          </p>
        </div>
        <div>
          <label className={LABEL} htmlFor="qr">UPI QR image URL</label>
          <input id="qr" className={FIELD} value={qrUrl} onChange={e => setQrUrl(e.target.value)} placeholder="https://…" />
          <p className="mt-1 text-xs text-muted-foreground">
            Optional. Upload the QR image somewhere public and paste its link here.
          </p>
          {qrUrl && (
            <img
              src={qrUrl}
              alt="Preview of the UPI QR code"
              className="mt-3 h-40 w-40 rounded border border-border bg-background object-contain p-2"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
        </div>
        <div>
          <label className={LABEL} htmlFor="instructions">Payment instructions</label>
          <textarea id="instructions" rows={3} className={FIELD} value={instructions} onChange={e => setInstructions(e.target.value)} />
        </div>
        <button type="submit" disabled={saving} className="rounded-md bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50">
          {saving ? "Saving…" : "Save settings"}
        </button>
      </form>
    </div>
  );
};

export default AdminPaymentSettings;
