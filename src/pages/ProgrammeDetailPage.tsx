import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { useHoneypot } from "@/hooks/use-honeypot";
import { useToast } from "@/hooks/use-toast";
import {
  formatDateRange, formatDate, formatRupees, isCohortOpen, seatsLeft,
  type Cohort, type Programme,
} from "@/lib/programmes";
import {
  CalendarDays, CheckCircle2, Copy, Clock, Users, ArrowLeft, Smartphone,
} from "lucide-react";

/** Registration is two steps: who you are, then pay and tell us the reference. */
type Step = "details" | "payment" | "done";

interface PaymentSettings {
  upi_id: string | null;
  upi_qr_url: string | null;
  payee_label: string | null;
  instructions: string | null;
}

const ProgrammeDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const { isBot, honeypotFieldProps } = useHoneypot();

  const [programme, setProgramme] = useState<Programme | null | "missing">(null);
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
      const { data: prog } = await (supabase.from("programmes" as any) as any)
        .select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
      if (cancelled) return;
      if (!prog) { setProgramme("missing"); return; }
      setProgramme(prog);

      const [{ data: batches }, { data: settings }] = await Promise.all([
        (supabase.from("programme_cohorts" as any) as any)
          .select("*").eq("programme_id", prog.id).order("starts_on", { ascending: true }),
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
  }, [slug]);

  const openCohorts = useMemo(() => cohorts.filter(isCohortOpen), [cohorts]);
  const selected = openCohorts.find(c => c.id === selectedCohortId) ?? null;
  const remaining = selected ? seatsLeft(selected, taken[selected.id] ?? 0) : null;
  const isFull = remaining !== null && remaining <= 0;

  const prog = programme && programme !== "missing" ? programme : null;
  const amountRupees = prog ? prog.price_paise / 100 : 0;

  /**
   * Deep link that opens the payer's UPI app with our handle and the exact
   * amount already filled in. Wrong amounts are the single biggest cause of
   * reconciliation pain when payments are checked by hand, so it is worth
   * removing every chance to mistype one.
   */
  const upiDeepLink = useMemo(() => {
    if (!payment?.upi_id || !prog || prog.price_paise <= 0) return null;
    const params = new URLSearchParams({
      pa: payment.upi_id,
      pn: payment.payee_label || "Karn HR Academy",
      am: amountRupees.toFixed(2),
      cu: "INR",
      tn: `${prog.title}${selected ? ` ${selected.batch_name}` : ""}`.slice(0, 50),
    });
    return `upi://pay?${params.toString()}`;
  }, [payment, prog, amountRupees, selected]);

  const copyUpiId = async () => {
    if (!payment?.upi_id) return;
    try {
      await navigator.clipboard.writeText(payment.upi_id);
      toast({ title: "UPI ID copied" });
    } catch {
      toast({ title: "Couldn't copy", description: "Please copy the UPI ID manually.", variant: "destructive" });
    }
  };

  const goToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setStep("payment");
  };

  const submitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !prog) return;
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
      // The database is the authority on whether a seat exists; surface what
      // it said rather than a generic failure, so a full or closed batch
      // reads as an explanation instead of a bug.
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

  if (programme === null) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main id="main-content" className="mx-auto max-w-3xl px-6 py-20">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (programme === "missing" || !prog) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title="Programme not found" description="This programme is not available." path={`/programmes/${slug}`} />
        <Header />
        <main id="main-content" className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h1 className="text-3xl font-bold text-foreground">Programme not found</h1>
          <p className="mt-3 text-muted-foreground">
            This programme may have been unpublished or the link may be wrong.
          </p>
          <Link to="/programmes" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent-deep hover:underline">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" /> All programmes
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const fieldClass =
    "w-full rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={prog.title}
        description={prog.subtitle || `${prog.title} from Karn HR Academy.`}
        path={`/programmes/${prog.slug}`}
      />
      <Header />
      <main id="main-content" className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        <Link to="/programmes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> All programmes
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          {/* ── What this is ─────────────────────────────────────────── */}
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">{prog.title}</h1>
            {prog.subtitle && <p className="mt-2 text-lg text-muted-foreground">{prog.subtitle}</p>}
            {prog.description && (
              <p className="mt-6 leading-relaxed text-muted-foreground">{prog.description}</p>
            )}

            {prog.highlights.length > 0 && (
              <>
                <h2 className="mt-10 font-display text-xl font-bold text-foreground">What's included</h2>
                <ul className="mt-4 space-y-2.5">
                  {prog.highlights.map(point => (
                    <li key={point} className="flex gap-3 text-sm text-foreground">
                      <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-accent-deep" />
                      {point}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {cohorts.length > 0 && (
              <>
                <h2 className="mt-10 font-display text-xl font-bold text-foreground">Batch calendar</h2>
                <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
                  {cohorts.map(c => {
                    const left = seatsLeft(c, taken[c.id] ?? 0);
                    const open = isCohortOpen(c);
                    return (
                      <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{c.batch_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateRange(c.starts_on, c.ends_on)}
                            {c.schedule_note ? ` · ${c.schedule_note}` : ""}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
                          open ? "bg-accent/10 text-accent-deep" : "bg-muted text-muted-foreground"
                        }`}>
                          {!open
                            ? c.status === "completed" ? "Completed" : "Closed"
                            : left === null ? "Open" : left > 0 ? `${left} seat${left === 1 ? "" : "s"} left` : "Full"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>

          {/* ── Register ─────────────────────────────────────────────── */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              {step === "done" ? (
                <div>
                  <CheckCircle2 aria-hidden="true" className="h-8 w-8 text-emerald-600" />
                  <h2 className="mt-3 font-display text-xl font-bold text-foreground">Registration received</h2>
                  <p className="mt-3 text-sm text-muted-foreground">
                    We've recorded your details and your payment reference. Your seat is
                    confirmed once we match the payment against our account — usually within
                    24 hours — and we'll email you at{" "}
                    <span className="font-medium text-foreground">{email}</span> either way.
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Nothing is charged again and you don't need to pay twice. If you don't hear
                    from us within two working days, please{" "}
                    <Link to="/contact" className="font-semibold text-accent-deep hover:underline">contact us</Link>.
                  </p>
                </div>
              ) : prog.price_paise <= 0 || openCohorts.length === 0 ? (
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground">Registration not open</h2>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Dates for the next batch are being finalised. Tell us you're interested and
                    we'll let you know as soon as registration opens.
                  </p>
                  <Link
                    to="/contact"
                    className="mt-5 inline-flex rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:brightness-110"
                  >
                    Ask about the next batch
                  </Link>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-display text-3xl font-bold text-foreground">
                      {formatRupees(prog.price_paise)}
                    </span>
                    {remaining !== null && remaining > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-deep">
                        <Users aria-hidden="true" className="h-3.5 w-3.5" />
                        {remaining} seat{remaining === 1 ? "" : "s"} left
                      </span>
                    )}
                  </div>

                  {/* Batch picker — only when there's a real choice to make. */}
                  {openCohorts.length > 1 ? (
                    <div className="mt-5">
                      <label htmlFor="cohort" className="mb-1.5 block text-sm font-medium text-foreground">
                        Choose a batch
                      </label>
                      <select
                        id="cohort"
                        value={selectedCohortId ?? ""}
                        onChange={e => setSelectedCohortId(e.target.value)}
                        className={fieldClass}
                      >
                        {openCohorts.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.batch_name} · {formatDateRange(c.starts_on, c.ends_on)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : selected && (
                    <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays aria-hidden="true" className="h-4 w-4 text-accent-deep" />
                      {selected.batch_name} · {formatDateRange(selected.starts_on, selected.ends_on)}
                    </p>
                  )}

                  {selected?.registration_closes_on && (
                    <p className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                      Registration closes {formatDate(selected.registration_closes_on)}
                    </p>
                  )}

                  {isFull ? (
                    <p className="mt-5 rounded-md border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
                      This batch is full. Please{" "}
                      <Link to="/contact" className="font-semibold text-accent-deep hover:underline">contact us</Link>{" "}
                      to be added to the waiting list for the next one.
                    </p>
                  ) : step === "details" ? (
                    <form onSubmit={goToPayment} className="mt-5 space-y-3">
                      <input type="text" {...honeypotFieldProps} />
                      <div>
                        <label htmlFor="reg-name" className="mb-1.5 block text-sm font-medium text-foreground">Full name</label>
                        <input id="reg-name" type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className={fieldClass} />
                      </div>
                      <div>
                        <label htmlFor="reg-email" className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
                        <input id="reg-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} className={fieldClass} />
                      </div>
                      <div>
                        <label htmlFor="reg-phone" className="mb-1.5 block text-sm font-medium text-foreground">Phone (WhatsApp)</label>
                        <input id="reg-phone" type="tel" required value={phone} onChange={e => setPhone(e.target.value)} className={fieldClass} />
                      </div>
                      <div>
                        <label htmlFor="reg-college" className="mb-1.5 block text-sm font-medium text-foreground">
                          College <span className="font-normal text-muted-foreground">(optional)</span>
                        </label>
                        <input id="reg-college" type="text" value={college} onChange={e => setCollege(e.target.value)} className={fieldClass} />
                      </div>
                      <div>
                        <label htmlFor="reg-course" className="mb-1.5 block text-sm font-medium text-foreground">
                          Course &amp; year <span className="font-normal text-muted-foreground">(optional)</span>
                        </label>
                        <input id="reg-course" type="text" value={course} onChange={e => setCourse(e.target.value)} className={fieldClass} placeholder="MBA, 1st year" />
                      </div>
                      <button type="submit" className="w-full rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:brightness-110">
                        Continue to payment
                      </button>
                      <p className="text-center text-xs text-muted-foreground">
                        Step 1 of 2 · nothing is charged yet
                      </p>
                    </form>
                  ) : (
                    <form onSubmit={submitRegistration} className="mt-5 space-y-4">
                      <div className="rounded-lg border border-border bg-muted/50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pay exactly</p>
                        <p className="font-display text-2xl font-bold text-foreground">{formatRupees(prog.price_paise)}</p>

                        {payment?.upi_id ? (
                          <>
                            <div className="mt-3 flex items-center gap-2">
                              <code className="min-w-0 flex-1 truncate rounded border border-border bg-background px-3 py-2 text-sm text-foreground">
                                {payment.upi_id}
                              </code>
                              <button
                                type="button"
                                onClick={copyUpiId}
                                className="shrink-0 rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-background"
                              >
                                <Copy aria-hidden="true" className="h-3.5 w-3.5" />
                                <span className="sr-only">Copy UPI ID</span>
                              </button>
                            </div>
                            {upiDeepLink && (
                              <a
                                href={upiDeepLink}
                                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-accent px-4 py-2 text-sm font-semibold text-accent-deep hover:bg-accent/10 sm:hidden"
                              >
                                <Smartphone aria-hidden="true" className="h-4 w-4" />
                                Open UPI app
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
                          <img
                            src={payment.upi_qr_url}
                            alt="UPI QR code for payment"
                            className="mx-auto mt-3 h-40 w-40 rounded border border-border bg-background object-contain p-2"
                          />
                        )}
                        {payment?.instructions && (
                          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{payment.instructions}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="reg-ref" className="mb-1.5 block text-sm font-medium text-foreground">
                          UPI reference / transaction ID
                        </label>
                        <input
                          id="reg-ref"
                          type="text"
                          required
                          value={upiReference}
                          onChange={e => setUpiReference(e.target.value)}
                          className={fieldClass}
                          placeholder="e.g. 412345678901"
                        />
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          Shown in your UPI app after paying. We use it to match your payment.
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setStep("details")}
                          className="rounded-md border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={submitting || !payment?.upi_id}
                          className="flex-1 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:brightness-110 disabled:opacity-50"
                        >
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
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProgrammeDetailPage;
