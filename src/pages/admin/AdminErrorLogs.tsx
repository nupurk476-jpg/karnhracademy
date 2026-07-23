import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { Trash2, AlertTriangle } from "lucide-react";

const AdminErrorLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const load = () => {
    supabase.from("error_logs" as any).select("*").order("created_at", { ascending: false }).limit(200)
      .then(({ data, error }: any) => {
        if (error) { toast({ title: "Failed to load error logs", description: error.message, variant: "destructive" }); return; }
        if (data) setLogs(data);
      });
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!(await confirm({ title: "Delete this log entry?", description: "This cannot be undone." }))) return;
    const { error } = await supabase.from("error_logs" as any).delete().eq("id", id);
    if (error) { toast({ title: "Failed to delete log", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Log entry deleted" });
    load();
  };

  const clearAll = async () => {
    if (!(await confirm({ title: `Clear all ${logs.length} log entries?`, description: "This cannot be undone." }))) return;
    const { error } = await supabase.from("error_logs" as any).delete().not("id", "is", null);
    if (error) { toast({ title: "Failed to clear logs", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Error logs cleared" });
    load();
  };

  const term = search.trim().toLowerCase();
  const filteredLogs = logs.filter(l => {
    if (!term) return true;
    const haystack = [l.message, l.path, l.context].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(term);
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-foreground">Error Logs</h1>
        {logs.length > 0 && (
          <button onClick={clearAll} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" /> Clear All
          </button>
        )}
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Client-side errors (crashes, unhandled rejections) reported automatically from real visitor sessions — the last 200, newest first.
      </p>

      {logs.length > 0 && (
        <input
          type="text"
          placeholder="Search logs by message, page, or source..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-3 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      )}

      <div className="space-y-2">
        {logs.length > 0 && filteredLogs.length === 0 && (
          <p className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">No logs match "{search}".</p>
        )}
        {filteredLogs.map((log) => (
          <div key={log.id} className="rounded-md border border-border bg-card p-4">
            <div className="mb-1.5 flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <span className="text-sm font-medium text-foreground">{log.message}</span>
              </div>
              <button onClick={() => remove(log.id)} aria-label="Delete log entry" className="shrink-0 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-6 text-xs text-muted-foreground">
              <span>{new Date(log.created_at).toLocaleString()}</span>
              {log.path && <span className="font-mono">{log.path}</span>}
              {log.context && <span className="rounded-full bg-muted px-2 py-0.5">{log.context}</span>}
            </div>
            {log.stack && (
              <pre className="mt-2 ml-6 max-h-32 overflow-auto rounded bg-muted p-2 text-[11px] text-muted-foreground">{log.stack}</pre>
            )}
          </div>
        ))}
        {logs.length === 0 && (
          <p className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">No errors reported yet — that's a good sign.</p>
        )}
      </div>
      <ConfirmDialog />
    </div>
  );
};

export default AdminErrorLogs;
