import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useHoneypot } from "@/hooks/use-honeypot";
import { useToast } from "@/hooks/use-toast";
import {
  formatDate, formatDateRange, formatRupees, isCohortOpen, seatsLeft,
  type Cohort, type Programme,
} from "@/lib/programmes";
import { CalendarDays, CheckCircle2, Clock, Copy, Smartphone, Users } from "lucide-react";

/**
 * Register-and-pay-by-UPI for a dated cohort, verified by hand against a bank
 * statement.
 *
 * This is the only path that can take money until Razorpay KYC clears, so it
 * stays exactly as it is. Lifted out of the detail page unchanged so that
 * retiring it later is deleting one component, not unpicking a page.
 */
type Step = "details" | "payment" | "done";

interface PaymentSettings {
  upi_id: string | null;
  upi_qr_url: string | null;
  payee_label: string | null;
  instructions: string | null;
}

const FIELD =
  "w-full rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

const ProgrammeRegistration = ({ programme }: { programme: Programme }) => {
  const { toast } = useToast();
  const { isBot, honeypotFieldProps } = useHoneypot();

  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [taken, setTaken] = useState<Record<string, number>>({});
  const [payment, setPayment] = useState<PaymentSettings | null>(null);
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("details");
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [college, setCollege] = useState("");
  const [course, setCourse] = useState("");
  const [upiReference, setUpiReference] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: batches }, { data: settings }] = await Promise.all([
        (supabase.from("programme_cohorts" as any) as any)
          .select("*").eq("programme_id", programme.id).order("starts_on", { ascending: true }),
        (supabase.from("payment_settings" as any) as any)
          .select("upi_id, upi_qr_url, payee_label, instructions").maybeSingle(),
      ]);
      if (cancelled) return;
      const list: Cohort[] = batches ?? [];
      setCohorts(list);
      setPayment(settings ?? null);
      setSelectedCohortId(list.find(isCohortOpen)?.id ?? null);

      if (list.length > 0) {
        const { data: counts } = await (supabase.rpc as any)("cohort_seat_counts", {
          _cohort_ids: list.map(c => c.id),
        });
        if (!cancelled && counts) {
          setTaken(Object.fromEntries(counts.map((r: any) => [r.cohort_id, Number(r.taken)])));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [programme.id]);

  const openCohorts = useMemo(() => cohorts.filter(isCohortOpen), [cohorts]);
  const selected = openCohorts.find(c => c.id === selectedCohortId) ?? null;
  const remaining = selected ? seatsLeft(selected, taken[selected.id] ?? 0) : null;
  const isFull = remaining !== null && remaining <= 0;
  const amountRupees = programme.price_paise / 100;

  /**
   * Opens the payer's UPI app with our handle and the exact amount filled in.
   * Wrong amounts are the biggest cause of reconciliation pain when payments
   * are matched by hand, so every chance to mistype one is worth removing.
   */
  const upiDeepLink = useMemo(() => {
    if (!payment?.upi_id || programme.price_paise <= 0) return null;
    const params = new URLSearchParams({
      pa: payment.upi_id,
      pn: payment.payee_label || "Karn HR Academy",
      am: amountRupees.toFixed(2),
      cu: "INR",
      tn: `${programme.title}${selected ? ` ${selected.batch_name}` : ""}`.slice(0, 50),
    });
    return `upi://pay?${params.toString()}`;
  }, [payment, programme, amountRupees, selected]);

  const copyUpiId = async () => {
    if (!payment?.upi_id) return;
    try {
      await navigator.clipboard.writeText(payment.upi_id);
      toast({ title: "UPI ID copied" });
    } catch {
      toast({ title: "Couldn't copy", description: "Please copy the UPI ID manually.", variant: "destructive" });
    }
  };

  const submitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    if (isBot()) { setStep("done"); return; }

    setSubmitting(true);
    const { error } = await (supabase.from("programme_registrations" as any) as any).insert({
      cohort_id: selected.id,
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      college: college.trim() || null,
      course: course.trim() || null,
      upi_reference: upiReference.trim(),
      status: "pending_verification",
    });
    setSubmitting(false);

    if (error) {
      const duplicate = (error as any).code === "23505";
      toast({
        title: duplicate ? "That reference is already registered" : "Couldn't complete your registration",
        description: duplicate
          ? "Each UPI reference can only be used once. Check the number, or contact us if you think this is a mistake."
          : error.message,
        variant: "destructive",
      });
      return;
    }
    setStep("done");
  };

  // Nothing to show when there is no batch taking registrations.
  if (openCohorts.length === 0 && step !== "done") {
    return cohorts.length > 0 ? (
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-display text-lg font-bold text-foreground">Batch calendar</h3>
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
          {cohorts.map(c => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
              <span className="text-sm text-foreground">{c.batch_name}</span>
              <span className="text-xs text-muted-foreground">
                {formatDateRange(c.starts_on, c.ends_on)} ·{" "}
                {c.status === "completed" ? "Completed" : "Closed"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          Dates for the next batch are being finalised.{" "}
          <Link to="/contact" className="font-semibold text-accent-deep hover:underline">Ask to be told</Link>{" "}
          when registration opens.
        </p>
      </div>
    ) : null;
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      {step === "done" ? (
        <div>
          <CheckCircle2 aria-hidden="true" className="h-8 w-8 text-emerald-600" />
          <h3 className="mt-3 font-display text-lg font-bold text-foreground">Registration received</h3>
          <p className="mt-3 text-sm text-muted-foreground">
            Your seat is confirmed once we match the payment against our account — usually
            within 24 hours — and we'll email{" "}
            <span className="font-medium text-foreground">{email}</span> either way. You don't
            need to pay again.
          </p>
        </div>
      ) : (
        <>
          <h3 className="font-display text-lg font-bold text-foreground">Register for a batch</h3>

          {openCohorts.length > 1 ? (
            <div className="mt-4">
              <label htmlFor="cohort" className="mb-1.5 block text-sm font-medium text-foreground">
                Choose a batch
              </label>
              <select
                id="cohort"
                value={selectedCohortId ?? ""}
                onChange={e => setSelectedCohortId(e.target.value)}
                className={FIELD}
              >
                {openCohorts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.batch_name} · {formatDateRange(c.starts_on, c.ends_on)}
                  </option>
                ))}
              </select>
            </div>
          ) : selected && (
            <p className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays aria-hidden="true" className="h-4 w-4 text-accent-deep" />
              {selected.batch_name} · {formatDateRange(selected.starts_on, selected.ends_on)}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            {selected?.registration_closes_on && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                Closes {formatDate(selected.registration_closes_on)}
              </span>
            )}
            {remaining !== null && remaining > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-deep">
                <Users aria-hidden="true" className="h-3.5 w-3.5" />
                {remaining} seat{remaining === 1 ? "" : "s"} left
              </span>
            )}
          </div>

          {isFull ? (
            <p className="mt-4 rounded-md border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
              This batch is full.{" "}
              <Link to="/contact" className="font-semibold text-accent-deep hover:underline">Contact us</Link>{" "}
              for the waiting list.
            </p>
          ) : step === "details" ? (
            <form onSubmit={e => { e.preventDefault(); setStep("payment"); }} className="mt-4 space-y-3">
              <input type="text" {...honeypotFieldProps} />
              <div>
                <label htmlFor="reg-name" className="mb-1.5 block text-sm font-medium text-foreground">Full name</label>
                <input id="reg-name" type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className={FIELD} />
              </div>
              <div>
                <label htmlFor="reg-email" className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
                <input id="reg-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} className={FIELD} />
              </div>
              <div>
                <label htmlFor="reg-phone" className="mb-1.5 block text-sm font-medium text-foreground">Phone (WhatsApp)</label>
                <input id="reg-phone" type="tel" required value={phone} onChange={e => setPhone(e.target.value)} className={FIELD} />
              </div>
              <div>
                <label htmlFor="reg-college" className="mb-1.5 block text-sm font-medium text-foreground">
                  College <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <input id="reg-college" type="text" value={college} onChange={e => setCollege(e.target.value)} className={FIELD} />
              </div>
              <div>
                <label htmlFor="reg-course" className="mb-1.5 block text-sm font-medium text-foreground">
                  Course &amp; year <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <input id="reg-course" type="text" value={course} onChange={e => setCourse(e.target.value)} className={FIELD} placeholder="MBA, 1st year" />
              </div>
              <button type="submit" className="w-full rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:brightness-110">
                Continue to payment
              </button>
              <p className="text-center text-xs text-muted-foreground">Step 1 of 2 · nothing is charged yet</p>
            </form>
          ) : (
            <form onSubmit={submitRegistration} className="mt-4 space-y-4">
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pay exactly</p>
                <p className="font-display text-2xl font-bold text-foreground">{formatRupees(programme.price_paise)}</p>

                {payment?.upi_id ? (
                  <>
                    <div className="mt-3 flex items-center gap-2">
                      <code className="min-w-0 flex-1 truncate rounded border border-border bg-background px-3 py-2 text-sm text-foreground">
                        {payment.upi_id}
                      </code>
                      <button type="button" onClick={copyUpiId} className="shrink-0 rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-background">
                        <Copy aria-hidden="true" className="h-3.5 w-3.5" />
                        <span className="sr-only">Copy UPI ID</span>
                      </button>
                    </div>
                    {upiDeepLink && (
                      <a href={upiDeepLink} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-accent px-4 py-2 text-sm font-semibold text-accent-deep hover:bg-accent/10 sm:hidden">
                        <Smartphone aria-hidden="true" className="h-4 w-4" /> Open UPI app
                      </a>
                    )}
                  </>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Payment details are being set up. Please{" "}
                    <Link to="/contact" className="font-semibold text-accent-deep hover:underline">contact us</Link>{" "}
                    to complete your registration.
                  </p>
                )}

                {payment?.upi_qr_url && (
                  <img src={payment.upi_qr_url} alt="UPI QR code for payment" className="mx-auto mt-3 h-40 w-40 rounded border border-border bg-background object-contain p-2" />
                )}
                {payment?.instructions && (
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{payment.instructions}</p>
                )}
              </div>

              <div>
                <label htmlFor="reg-ref" className="mb-1.5 block text-sm font-medium text-foreground">
                  UPI reference / transaction ID
                </label>
                <input id="reg-ref" type="text" required value={upiReference} onChange={e => setUpiReference(e.target.value)} className={FIELD} placeholder="e.g. 412345678901" />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Shown in your UPI app after paying. We use it to match your payment.
                </p>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => setStep("details")} className="rounded-md border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted">
                  Back
                </button>
                <button type="submit" disabled={submitting || !payment?.upi_id} className="flex-1 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:brightness-110 disabled:opacity-50">
                  {submitting ? "Submitting…" : "I've paid — register me"}
                </button>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Step 2 of 2 · seat confirmed after we check the payment
              </p>
            </form>
          )}

          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/refund-policy" className="hover:underline">Refund &amp; cancellation policy</Link>
          </p>
        </>
      )}
    </div>
  );
};

export default ProgrammeRegistration;
