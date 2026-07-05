import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

const AdminSubscribers = () => {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const { toast } = useToast();

  const load = () => {
    supabase.from("email_subscribers").select("*").order("created_at", { ascending: false }).then(({ data }) => data && setSubscribers(data));
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    await supabase.from("email_subscribers").delete().eq("id", id);
    toast({ title: "Subscriber removed" });
    load();
  };

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-foreground">Email Subscribers</h1>
      <p className="mb-4 text-sm text-muted-foreground">{subscribers.length} subscriber(s)</p>
      {subscribers.length === 0 ? (
        <p className="text-muted-foreground">No subscribers yet.</p>
      ) : (
        <div className="space-y-2">
          {subscribers.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-4 py-3">
              <div className="min-w-0">
                <span className="text-sm font-medium text-foreground">{s.email}</span>
                <span className="ml-3 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
              </div>
              <button onClick={() => remove(s.id)} className="shrink-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSubscribers;
