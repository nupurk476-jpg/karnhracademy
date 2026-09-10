import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { toCsv, downloadCsv } from "@/lib/csv";
import { activeSubscribers, type Subscriber } from "@/lib/subscribers";
import { Trash2, Download, Link2 } from "lucide-react";

/** PostgREST caps a single response; paging is the only way past it. */
const PAGE_SIZE = 1000;

/** Supabase errors and thrown values are unknown until narrowed. */
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

const AdminSubscribers = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportingLinks, setExportingLinks] = useState(false);
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  /**
   * Read every subscriber, not the first thousand.
   *
   * A plain .select() silently stops at PostgREST's row cap, so once the
   * list passed 1000 this screen would have quietly under-reported the
   * count and any export taken from it would have been short — the kind
   * of wrong that looks perfectly fine.
   */
  const loadAll = useCallback(async (): Promise<Subscriber[]> => {
    const all: Subscriber[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("email_subscribers")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      all.push(...(data as Subscriber[]));
      if (data.length < PAGE_SIZE) break;
    }
    return all;
  }, []);

  const load = useCallback(() => {
    loadAll()
      .then(setSubscribers)
      .catch((e: unknown) =>
        toast({ title: "Couldn't load subscribers", description: message(e), variant: "destructive" }),
      );
  }, [loadAll, toast]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: string, email: string) => {
    const ok = await confirm({ title: `Remove ${email}?`, description: "This cannot be undone." });
    if (!ok) return;
    const { error } = await supabase.from("email_subscribers").delete().eq("id", id);
    if (error) { toast({ title: "Failed to remove subscriber", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Subscriber removed" });
    load();
  };

  const term = search.trim().toLowerCase();
  const filteredSubscribers = subscribers.filter(s => !term || s.email?.toLowerCase().includes(term));
  const activeCount = subscribers.filter(s => !s.unsubscribed_at).length;
  const optedOutCount = subscribers.length - activeCount;

  /**
   * Export what is on screen, filter included — exporting something other
   * than what the admin is looking at is a surprise, and a search box
   * doubles as the segment picker for a targeted send.
   *
   * Re-reads rather than dumping state, so a list that grew since page
   * load still exports completely.
   */
  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = await loadAll();
      // Opted-out addresses never leave this screen. The export exists to
      // be pasted into a sending tool, so including someone who asked to
      // leave would mail them again -- the exact harm unsubscribe prevents.
      const scoped = activeSubscribers(rows, term);
      if (scoped.length === 0) {
        toast({ title: "Nothing to export", description: "No active subscribers match the current search." });
        return;
      }
      const csv = toCsv(
        ["email", "name", "subscribed_on"],
        scoped.map(s => [s.email, s.name ?? "", new Date(s.created_at).toISOString().slice(0, 10)]),
      );
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`karn-hr-subscribers-${stamp}.csv`, csv);
      toast({ title: `Exported ${scoped.length} active subscriber(s)` });
    } catch (e: unknown) {
      toast({ title: "Export failed", description: message(e), variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  /**
   * A second, separate export that adds a ready-made unsubscribe URL per
   * row -- for pasting into the sending tool as a personalisation column
   * (e.g. Brevo's {{contact.UNSUB_URL}}), not for general handling.
   *
   * Kept apart from exportCsv rather than as an option on it, because the
   * file it produces is meaningfully more sensitive: each URL is a live
   * credential that unsubscribes that one address, unauthenticated, to
   * anyone who has it. The plain export is safe to glance at or misplace;
   * this one is not, and the button says so before it downloads.
   *
   * The link must be this app's own /unsubscribe -- not the sending
   * tool's built-in one. A campaign tool's native unsubscribe updates only
   * its own suppression list; email_subscribers.unsubscribed_at would
   * never learn about it, and the two lists would silently diverge.
   */
  const exportCsvWithLinks = async () => {
    setExportingLinks(true);
    try {
      const rows = await loadAll();
      const scoped = activeSubscribers(rows, term);
      if (scoped.length === 0) {
        toast({ title: "Nothing to export", description: "No active subscribers match the current search." });
        return;
      }
      const csv = toCsv(
        ["email", "name", "subscribed_on", "unsubscribe_url"],
        scoped.map(s => [
          s.email,
          s.name ?? "",
          new Date(s.created_at).toISOString().slice(0, 10),
          `${window.location.origin}/unsubscribe?token=${s.unsubscribe_token}`,
        ]),
      );
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`karn-hr-subscribers-with-links-${stamp}.csv`, csv);
      toast({ title: `Exported ${scoped.length} subscriber(s) with unsubscribe links`, description: "Keep this file private -- each link unsubscribes that address on its own." });
    } catch (e: unknown) {
      toast({ title: "Export failed", description: message(e), variant: "destructive" });
    } finally {
      setExportingLinks(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-foreground">Email Subscribers</h1>
        {subscribers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportCsv}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              {exporting
                ? "Exporting…"
                : term
                  ? `Export ${activeSubscribers(subscribers, term).length} shown`
                  : "Export CSV"}
            </button>
            <button
              onClick={exportCsvWithLinks}
              disabled={exportingLinks}
              title="Adds a personal unsubscribe link per row, for a sending tool like Brevo. Keep this file private."
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <Link2 className="h-3.5 w-3.5" />
              {exportingLinks ? "Exporting…" : "Export with unsubscribe links"}
            </button>
          </div>
        )}
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        {activeCount} active subscriber(s)
        {optedOutCount > 0 && ` · ${optedOutCount} unsubscribed`} — collected from the newsletter
        forms and the download email gate. Only active ones are exported. Use "Export with
        unsubscribe links" for a sending tool (e.g. Brevo) and use those links, not the tool's
        own unsubscribe — otherwise Brevo's suppression list and this table will drift apart.
      </p>
      {subscribers.length > 0 && (
        <input
          type="text"
          placeholder="Search subscribers by email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-4 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      )}
      {subscribers.length === 0 ? (
        <p className="text-muted-foreground">No subscribers yet.</p>
      ) : filteredSubscribers.length === 0 ? (
        <p className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">No subscribers match "{search}".</p>
      ) : (
        <div className="space-y-2">
          {filteredSubscribers.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-4 py-3">
              <div className="min-w-0">
                <span className={`text-sm font-medium ${s.unsubscribed_at ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {s.email}
                </span>
                {s.name && <span className="ml-2 text-xs text-muted-foreground">({s.name})</span>}
                <span className="ml-3 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
                {s.unsubscribed_at && (
                  <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Unsubscribed
                  </span>
                )}
              </div>
              <button onClick={() => remove(s.id, s.email)} aria-label={`Remove ${s.email}`} className="shrink-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
};

export default AdminSubscribers;
