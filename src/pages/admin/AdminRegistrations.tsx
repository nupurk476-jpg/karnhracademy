import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import {
  formatRupees, formatDateRange, REGISTRATION_STATUS_LABEL,
  type Cohort, type Programme, type Registration, type RegistrationStatus,
} from "@/lib/programmes";
import { AlertTriangle, Check, Mail, Trash2, X } from "lucide-react";

type Filter = RegistrationStatus | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "pending_verification", label: "Awaiting check" },
  { value: "confirmed", label: "Confirmed" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

const STATUS_CLASS: Record<RegistrationStatus, string> = {
  pending_verification: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-muted text-muted-foreground",
};

/**
 * The daily workflow while payments are verified by hand: read the UPI
 * reference, find it on the bank statement, then confirm or reject.
 *
 * Nothing on this screen can tell you whether a payment is real — only the
 * bank statement can. The buttons record *your* decision; they do not
 * check anything.
 */
const AdminRegistrations = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [filter, setFilter] = useState<Filter>("pending_verification");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const load = async () => {
    const [{ data: regs }, { data: batches }, { data: progs }] = await Promise.all([
      (supabase.from("programme_registrations" as any) as any)
        .select("*").order("created_at", { ascending: false }),
      (supabase.from("programme_cohorts" as any) as any).select("*"),
      (supabase.from("programmes" as any) as any).select("*"),
    ]);
    setRegistrations(regs ?? []);
    setCohorts(batches ?? []);
    setProgrammes(progs ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const cohortById = useMemo(
    () => Object.fromEntries(cohorts.map(c => [c.id, c])), [cohorts]);
  const programmeById = useMemo(
    () => Object.fromEntries(programmes.map(p => [p.id, p])), [programmes]);

  const describeBatch = (cohortId: string) => {
    const cohort = cohortById[cohortId];
    if (!cohort) return "Unknown batch";
    const programme = programmeById[cohort.programme_id];
    const dates = formatDateRange(cohort.starts_on, cohort.ends_on);
    return `${programme?.title ?? "Programme"} · ${cohort.batch_name} · ${dates}`;
  };

  const setStatus = async (reg: Registration, status: RegistrationStatus) => {
    const { error } = await (supabase.from("programme_registrations" as any) as any)
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", reg.id);
    if (error) {
      toast({ title: "Couldn't update registration", description: error.message, variant: "destructive" });
      return false;
    }
    load();
    return true;
  };

  /**
   * There is no mail service wired up, so rather than silently not telling
   * the student anything, this opens a prefilled draft in whatever mail
   * client the admin already uses. Confirming and writing are one action,
   * which is what stops the "did you get my payment?" messages.
   */
  const confirmAndEmail = async (reg: Registration) => {
    const ok = await confirm({
      title: `Confirm ${reg.full_name}'s seat?`,
      description: `Only do this once you have found reference ${reg.upi_reference} on your bank statement. Confirming records the seat as paid.`,
    });
    if (!ok) return;
    if (!(await setStatus(reg, "confirmed"))) return;

    const subject = `Your seat is confirmed — ${describeBatch(reg.cohort_id)}`;
    const body = [
      `Dear ${reg.full_name},`,
      ``,
      `Your payment has been received and your seat is confirmed for:`,
      `${describeBatch(reg.cohort_id)}`,
      ``,
      `Amount received: ${formatRupees(reg.amount_paise)}`,
      `Reference: ${reg.upi_reference}`,
      ``,
      `We'll share the joining details and schedule closer to the start date.`,
      ``,
      `Warm regards,`,
      `Karn HR Academy`,
    ].join("\n");
    window.location.href =
      `mailto:${encodeURIComponent(reg.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const reject = async (reg: Registration) => {
    const ok = await confirm({
      title: `Reject ${reg.full_name}'s registration?`,
      description: `Use this when the payment reference ${reg.upi_reference} cannot be found. The seat is released.`,
    });
    if (!ok) return;
    if (await setStatus(reg, "rejected")) toast({ title: "Registration rejected" });
  };

  const remove = async (reg: Registration) => {
    const ok = await confirm({
      title: `Delete ${reg.full_name}'s registration?`,
      description: "This permanently removes the record. Reject it instead if you just want to release the seat.",
    });
    if (!ok) return;
    const { error } = await (supabase.from("programme_registrations" as any) as any)
      .delete().eq("id", reg.id);
    if (error) {
      toast({ title: "Couldn't delete registration", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Registration deleted" });
    load();
  };

  const pendingCount = registrations.filter(r => r.status === "pending_verification").length;
  const confirmedTotal = registrations
    .filter(r => r.status === "confirmed")
    .reduce((sum, r) => sum + r.amount_paise, 0);

  const term = search.trim().toLowerCase();
  const visible = registrations.filter(r => {
    if (filter !== "all" && r.status !== filter) return false;
    if (!term) return true;
    return [r.full_name, r.email, r.phone, r.upi_reference, r.college, r.course]
      .filter(Boolean).join(" ").toLowerCase().includes(term);
  });

  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold text-foreground">Registrations</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        {pendingCount} awaiting payment check · {formatRupees(confirmedTotal)} confirmed to date
      </p>

      <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Students type their own UPI reference, so it proves nothing on its own. Find each
          reference on your bank statement before confirming a seat.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {f.label}
            {f.value === "pending_verification" && pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
        ))}
        <input
          type="text"
          placeholder="Search name, email, phone or reference…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ml-auto w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="rounded-md border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          {registrations.length === 0
            ? "No registrations yet."
            : "Nothing matches this filter."}
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map(reg => (
            <div key={reg.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{reg.full_name}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[reg.status]}`}>
                      {REGISTRATION_STATUS_LABEL[reg.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{describeBatch(reg.cohort_id)}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    <a href={`mailto:${reg.email}`} className="hover:underline">{reg.email}</a>
                    {" · "}
                    <a href={`tel:${reg.phone}`} className="hover:underline">{reg.phone}</a>
                  </p>
                  {(reg.college || reg.course) && (
                    <p className="text-sm text-muted-foreground">
                      {[reg.college, reg.course].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="font-display text-lg font-bold text-foreground">
                    {formatRupees(reg.amount_paise)}
                  </p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">Reference</p>
                  <code className="select-all text-sm font-semibold text-foreground">{reg.upi_reference}</code>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(reg.created_at).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
                {reg.status === "pending_verification" && (
                  <>
                    <button
                      onClick={() => confirmAndEmail(reg)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <Check aria-hidden="true" className="h-3.5 w-3.5" /> Confirm &amp; email
                    </button>
                    <button
                      onClick={() => reject(reg)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                    >
                      <X aria-hidden="true" className="h-3.5 w-3.5" /> Reject
                    </button>
                  </>
                )}
                <a
                  href={`mailto:${reg.email}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  <Mail aria-hidden="true" className="h-3.5 w-3.5" /> Email
                </a>
                <button
                  onClick={() => remove(reg)}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 aria-hidden="true" className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
};

export default AdminRegistrations;
