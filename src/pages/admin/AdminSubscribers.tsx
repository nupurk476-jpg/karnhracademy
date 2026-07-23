import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { Trash2 } from "lucide-react";

const AdminSubscribers = () => {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const load = () => {
    supabase.from("email_subscribers").select("*").order("created_at", { ascending: false }).then(({ data }) => data && setSubscribers(data));
  };

  useEffect(() => { load(); }, []);

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

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-foreground">Email Subscribers</h1>
      <p className="mb-4 text-sm text-muted-foreground">{subscribers.length} subscriber(s)</p>
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
                <span className="text-sm font-medium text-foreground">{s.email}</span>
                <span className="ml-3 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
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
