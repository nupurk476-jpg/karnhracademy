import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Mail } from "lucide-react";

const AdminContactMessages = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const { toast } = useToast();

  const load = () => {
    supabase.from("contact_messages" as any).select("*").order("created_at", { ascending: false }).then(({ data }) => data && setMessages(data));
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    await supabase.from("contact_messages" as any).update({ read: true }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("contact_messages" as any).delete().eq("id", id);
    toast({ title: "Message deleted" });
    load();
  };

  const unreadCount = messages.filter(m => !m.read).length;

  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold text-foreground">Contact Messages</h1>
      <p className="mb-6 text-sm text-muted-foreground">{messages.length} message(s), {unreadCount} unread</p>
      {messages.length === 0 ? (
        <p className="text-muted-foreground">No messages yet.</p>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              onClick={() => !m.read && markRead(m.id)}
              className={`rounded-lg border px-5 py-4 ${m.read ? "border-border bg-card" : "border-accent/40 bg-accent/5"}`}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <span className="font-semibold text-foreground">{m.name}</span>
                  <a href={`mailto:${m.email}`} onClick={e => e.stopPropagation()} className="ml-2 inline-flex items-center gap-1 text-xs text-accent hover:underline">
                    <Mail className="h-3 w-3" /> {m.email}
                  </a>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</span>
                  <button onClick={(e) => { e.stopPropagation(); remove(m.id); }} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{m.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminContactMessages;
