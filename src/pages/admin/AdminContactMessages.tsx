import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { Trash2, Mail } from "lucide-react";

const AdminContactMessages = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const load = () => {
    supabase.from("contact_messages" as any).select("*").order("created_at", { ascending: false }).then(({ data }) => data && setMessages(data));
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    const { error } = await supabase.from("contact_messages" as any).update({ read: true }).eq("id", id);
    if (error) { toast({ title: "Failed to mark as read", description: error.message, variant: "destructive" }); return; }
    load();
  };

  const remove = async (id: string, name: string) => {
    const ok = await confirm({ title: `Delete the message from ${name}?`, description: "This cannot be undone." });
    if (!ok) return;
    const { error } = await supabase.from("contact_messages" as any).delete().eq("id", id);
    if (error) { toast({ title: "Failed to delete message", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Message deleted" });
    load();
  };

  const unreadCount = messages.filter(m => !m.read).length;
  const term = search.trim().toLowerCase();
  const filteredMessages = messages.filter(m => {
    if (!term) return true;
    return [m.name, m.email, m.message].filter(Boolean).join(" ").toLowerCase().includes(term);
  });

  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold text-foreground">Contact Messages</h1>
      <p className="mb-4 text-sm text-muted-foreground">{messages.length} message(s), {unreadCount} unread</p>
      {messages.length > 0 && (
        <input
          type="text"
          placeholder="Search messages by name, email, or content..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-4 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      )}
      {messages.length === 0 ? (
        <p className="text-muted-foreground">No messages yet.</p>
      ) : filteredMessages.length === 0 ? (
        <p className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">No messages match "{search}".</p>
      ) : (
        <div className="space-y-3">
          {filteredMessages.map((m) => (
            <div
              key={m.id}
              onClick={() => !m.read && markRead(m.id)}
              className={`rounded-lg border px-5 py-4 ${m.read ? "border-border bg-card" : "border-accent/40 bg-accent/5"}`}
            >
              <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-semibold text-foreground">{m.name}</span>
                  <a href={`mailto:${m.email}`} onClick={e => e.stopPropagation()} className="ml-2 inline-flex items-center gap-1 text-xs text-accent-deep hover:underline">
                    <Mail className="h-3 w-3" /> {m.email}
                  </a>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</span>
                  <button onClick={(e) => { e.stopPropagation(); remove(m.id, m.name); }} aria-label={`Delete message from ${m.name}`} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{m.message}</p>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
};

export default AdminContactMessages;
