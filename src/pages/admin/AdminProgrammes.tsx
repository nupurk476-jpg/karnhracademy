import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { formatDateRange, formatRupees, type Cohort, type Programme } from "@/lib/programmes";
import { CalendarPlus, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
const LABEL = "mb-1 block text-xs font-semibold text-foreground";

const emptyProgramme = () => ({
  slug: "", title: "", short_description: "", long_description: "", includesText: "",
  priceRupees: "", mrpRupees: "", category: "", duration_note: "",
  is_active: false, sort_order: 0,
});

const emptyCohort = () => ({
  batch_name: "", starts_on: "", ends_on: "", registration_closes_on: "",
  seats_total: 0, schedule_note: "", status: "draft" as Cohort["status"],
});

/**
 * Prices are entered in rupees but stored as integer paise. This is the
 * only place that conversion happens on the way in, and it rejects
 * anything that isn't a clean number rather than silently storing NaN —
 * a wrong price here is a wrong charge on a live page.
 */
function rupeesToPaise(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return Math.round(parseFloat(trimmed) * 100);
}

const AdminProgrammes = () => {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState(emptyProgramme());
  const [cohortFor, setCohortFor] = useState<string | null>(null);
  const [cohortForm, setCohortForm] = useState(emptyCohort());
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const load = async () => {
    const [{ data: progs }, { data: batches }] = await Promise.all([
      (supabase.from("programmes" as any) as any).select("*").order("sort_order", { ascending: true }),
      (supabase.from("programme_cohorts" as any) as any).select("*").order("starts_on", { ascending: true }),
    ]);
    setProgrammes(progs ?? []);
    setCohorts(batches ?? []);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (p: Programme) => {
    setEditing(p.id);
    setForm({
      slug: p.slug, title: p.title, short_description: p.short_description ?? "",
      long_description: p.long_description ?? "", includesText: (p.includes ?? []).join("\n"),
      priceRupees: p.price_paise ? String(p.price_paise / 100) : "",
      mrpRupees: p.mrp_paise ? String(p.mrp_paise / 100) : "",
      category: p.category ?? "",
      duration_note: p.duration_note ?? "", is_active: p.is_active,
      sort_order: p.sort_order,
    });
  };

  const saveProgramme = async (e: React.FormEvent) => {
    e.preventDefault();
    const price_paise = rupeesToPaise(form.priceRupees);
    if (price_paise === null) {
      toast({ title: "Check the price", description: "Enter rupees as a number, e.g. 1500 or 1500.50.", variant: "destructive" });
      return;
    }
    const mrpRaw = form.mrpRupees.trim();
    const mrp_paise = mrpRaw === "" ? null : rupeesToPaise(mrpRaw);
    if (mrp_paise === null && mrpRaw !== "") {
      toast({ title: "Check the MRP", description: "Enter rupees as a number, or leave it blank.", variant: "destructive" });
      return;
    }
    // A struck-through price below what you actually charge is not a discount.
    // The database rejects it too; catching it here gives a usable message.
    if (mrp_paise !== null && mrp_paise < price_paise) {
      toast({ title: "MRP is below the price", description: "The struck-through price must be higher than the price you charge, or left blank.", variant: "destructive" });
      return;
    }
    const payload = {
      slug: form.slug.trim(),
      title: form.title.trim(),
      short_description: form.short_description.trim() || null,
      long_description: form.long_description.trim() || null,
      includes: form.includesText.split("\n").map(s => s.trim()).filter(Boolean),
      price_paise,
      mrp_paise,
      category: form.category.trim() || null,
      duration_note: form.duration_note.trim() || null,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };
    if (form.is_active && price_paise <= 0) {
      toast({ title: "Set a price before publishing", description: "A published programme with no price can't take registrations.", variant: "destructive" });
      return;
    }
    const { error } = editing === "new"
      ? await (supabase.from("programmes" as any) as any).insert(payload)
      : await (supabase.from("programmes" as any) as any).update(payload).eq("id", editing);
    if (error) {
      toast({ title: "Couldn't save programme", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing === "new" ? "Programme created" : "Programme saved" });
    setEditing(null);
    load();
  };

  const removeProgramme = async (p: Programme) => {
    const ok = await confirm({
      title: `Delete "${p.title}"?`,
      description: "All of its batches are deleted too. Registrations block deletion — reject those first.",
      destructive: true,
    });
    if (!ok) return;
    const { error } = await (supabase.from("programmes" as any) as any).delete().eq("id", p.id);
    if (error) {
      toast({ title: "Couldn't delete programme", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Programme deleted" });
    load();
  };

  const saveCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cohortFor) return;
    const { error } = await (supabase.from("programme_cohorts" as any) as any).insert({
      programme_id: cohortFor,
      batch_name: cohortForm.batch_name.trim(),
      starts_on: cohortForm.starts_on,
      ends_on: cohortForm.ends_on || null,
      registration_closes_on: cohortForm.registration_closes_on || null,
      seats_total: Number(cohortForm.seats_total) || 0,
      schedule_note: cohortForm.schedule_note.trim() || null,
      status: cohortForm.status,
    });
    if (error) {
      toast({ title: "Couldn't add batch", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Batch added" });
    setCohortFor(null);
    setCohortForm(emptyCohort());
    load();
  };

  const setCohortStatus = async (cohort: Cohort, status: Cohort["status"]) => {
    const { error } = await (supabase.from("programme_cohorts" as any) as any)
      .update({ status }).eq("id", cohort.id);
    if (error) {
      toast({ title: "Couldn't update batch", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const removeCohort = async (cohort: Cohort) => {
    const ok = await confirm({
      title: `Delete batch "${cohort.batch_name}"?`,
      description: "Batches with registrations can't be deleted — close the batch instead.",
      destructive: true,
    });
    if (!ok) return;
    const { error } = await (supabase.from("programme_cohorts" as any) as any).delete().eq("id", cohort.id);
    if (error) {
      toast({ title: "Couldn't delete batch", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Batch deleted" });
    load();
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Programmes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {programmes.length} programme(s) · a programme needs a price and an open batch before anyone can register
          </p>
        </div>
        <button
          onClick={() => { setEditing("new"); setForm(emptyProgramme()); }}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110"
        >
          <Plus aria-hidden="true" className="h-4 w-4" /> New programme
        </button>
      </div>

      {editing && (
        <form onSubmit={saveProgramme} className="mb-6 space-y-3 rounded-lg border border-border bg-card p-5">
          <h2 className="font-semibold text-foreground">
            {editing === "new" ? "New programme" : "Edit programme"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL} htmlFor="p-title">Title</label>
              <input id="p-title" required className={FIELD} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className={LABEL} htmlFor="p-slug">URL slug</label>
              <input id="p-slug" required className={FIELD} value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="gd-pi-preparation" />
            </div>
          </div>
          <div>
            <label className={LABEL} htmlFor="p-subtitle">Short description</label>
            <input id="p-subtitle" className={FIELD} value={form.short_description} onChange={e => setForm({ ...form, short_description: e.target.value })} />
          </div>
          <div>
            <label className={LABEL} htmlFor="p-desc">Long description</label>
            <textarea id="p-desc" rows={3} className={FIELD} value={form.long_description} onChange={e => setForm({ ...form, long_description: e.target.value })} />
          </div>
          <div>
            <label className={LABEL} htmlFor="p-highlights">What's included — one per line</label>
            <textarea id="p-highlights" rows={5} className={FIELD} value={form.includesText} onChange={e => setForm({ ...form, includesText: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className={LABEL} htmlFor="p-price">Price in rupees</label>
              <input id="p-price" className={FIELD} value={form.priceRupees} onChange={e => setForm({ ...form, priceRupees: e.target.value })} placeholder="1500" inputMode="decimal" />
            </div>
            <div>
              <label className={LABEL} htmlFor="p-mrp">MRP in rupees <span className="font-normal text-muted-foreground">(optional)</span></label>
              <input id="p-mrp" className={FIELD} value={form.mrpRupees} onChange={e => setForm({ ...form, mrpRupees: e.target.value })} placeholder="2000" inputMode="decimal" />
            </div>
            <div>
              <label className={LABEL} htmlFor="p-category">Category</label>
              <input id="p-category" className={FIELD} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Admissions" />
            </div>
            <div>
              <label className={LABEL} htmlFor="p-duration">Duration note</label>
              <input id="p-duration" className={FIELD} value={form.duration_note} onChange={e => setForm({ ...form, duration_note: e.target.value })} placeholder="14 days" />
            </div>
            <div>
              <label className={LABEL} htmlFor="p-order">Display order</label>
              <input id="p-order" type="number" className={FIELD} value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
            Active — visible on the public site
          </label>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="rounded-md bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110">Save</button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {programmes.map(p => {
          const own = cohorts.filter(c => c.programme_id === p.id);
          const isOpen = expanded === p.id;
          return (
            <div key={p.id} className="rounded-lg border border-border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <button
                  onClick={() => setExpanded(isOpen ? null : p.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  {isOpen ? <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0" /> : <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0" />}
                  <span className="min-w-0">
                    <span className="block font-semibold text-foreground">{p.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {p.price_paise > 0 ? formatRupees(p.price_paise) : "No price set"} · {own.length} batch(es)
                    </span>
                  </span>
                </button>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${p.is_active ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
                    {p.is_active ? "Published" : "Draft"}
                  </span>
                  <button onClick={() => startEdit(p)} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted">Edit</button>
                  <button onClick={() => removeProgramme(p)} className="rounded-md px-2 py-1.5 text-red-600 hover:bg-red-50">
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                    <span className="sr-only">Delete programme</span>
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Batches</h3>
                    <button
                      onClick={() => { setCohortFor(p.id); setCohortForm(emptyCohort()); }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                    >
                      <CalendarPlus aria-hidden="true" className="h-3.5 w-3.5" /> Add batch
                    </button>
                  </div>

                  {cohortFor === p.id && (
                    <form onSubmit={saveCohort} className="mb-4 space-y-3 rounded-md border border-border bg-background p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className={LABEL} htmlFor="c-name">Batch name</label>
                          <input id="c-name" required className={FIELD} value={cohortForm.batch_name} onChange={e => setCohortForm({ ...cohortForm, batch_name: e.target.value })} placeholder="March 2026 batch" />
                        </div>
                        <div>
                          <label className={LABEL} htmlFor="c-seats">Seats (0 = unlimited)</label>
                          <input id="c-seats" type="number" min={0} className={FIELD} value={cohortForm.seats_total} onChange={e => setCohortForm({ ...cohortForm, seats_total: Number(e.target.value) })} />
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className={LABEL} htmlFor="c-start">Starts on</label>
                          <input id="c-start" type="date" required className={FIELD} value={cohortForm.starts_on} onChange={e => setCohortForm({ ...cohortForm, starts_on: e.target.value })} />
                        </div>
                        <div>
                          <label className={LABEL} htmlFor="c-end">Ends on</label>
                          <input id="c-end" type="date" className={FIELD} value={cohortForm.ends_on} onChange={e => setCohortForm({ ...cohortForm, ends_on: e.target.value })} />
                        </div>
                        <div>
                          <label className={LABEL} htmlFor="c-close">Registration closes</label>
                          <input id="c-close" type="date" className={FIELD} value={cohortForm.registration_closes_on} onChange={e => setCohortForm({ ...cohortForm, registration_closes_on: e.target.value })} />
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className={LABEL} htmlFor="c-note">Schedule note</label>
                          <input id="c-note" className={FIELD} value={cohortForm.schedule_note} onChange={e => setCohortForm({ ...cohortForm, schedule_note: e.target.value })} placeholder="Weekends, 10am–1pm" />
                        </div>
                        <div>
                          <label className={LABEL} htmlFor="c-status">Status</label>
                          <select id="c-status" className={FIELD} value={cohortForm.status} onChange={e => setCohortForm({ ...cohortForm, status: e.target.value as Cohort["status"] })}>
                            <option value="draft">Draft — hidden</option>
                            <option value="open">Open — accepting registrations</option>
                            <option value="closed">Closed</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110">Add batch</button>
                        <button type="button" onClick={() => setCohortFor(null)} className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted">Cancel</button>
                      </div>
                    </form>
                  )}

                  {own.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No batches yet.</p>
                  ) : (
                    <ul className="divide-y divide-border rounded-md border border-border">
                      {own.map(c => (
                        <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{c.batch_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateRange(c.starts_on, c.ends_on)}
                              {c.seats_total > 0 ? ` · ${c.seats_total} seats` : " · unlimited seats"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={c.status}
                              onChange={e => setCohortStatus(c, e.target.value as Cohort["status"])}
                              className="rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground"
                              aria-label={`Status for ${c.batch_name}`}
                            >
                              <option value="draft">Draft</option>
                              <option value="open">Open</option>
                              <option value="closed">Closed</option>
                              <option value="completed">Completed</option>
                            </select>
                            <button onClick={() => removeCohort(c)} className="rounded-md px-2 py-1.5 text-red-600 hover:bg-red-50">
                              <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                              <span className="sr-only">Delete batch</span>
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <ConfirmDialog />
    </div>
  );
};

export default AdminProgrammes;
