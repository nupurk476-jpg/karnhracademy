import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

const AdminBooks = () => {
  const [books, setBooks] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", author: "", description: "", buy_link: "" });
  const { toast } = useToast();

  const load = () => {
    supabase.from("book_recommendations").select("*").order("created_at", { ascending: false }).then(({ data }) => data && setBooks(data));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.author) return;
    await supabase.from("book_recommendations").insert(form);
    toast({ title: "Book added" });
    setForm({ title: "", author: "", description: "", buy_link: "" });
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("book_recommendations").delete().eq("id", id);
    toast({ title: "Book removed" });
    load();
  };

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-foreground">Book Recommendations</h1>
      <div className="mb-8 space-y-3 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Add Book</h2>
        <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input placeholder="Author" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input placeholder="Buy Link (affiliate URL)" value={form.buy_link} onChange={e => setForm({ ...form, buy_link: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <button onClick={handleCreate} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110">Add Book</button>
      </div>
      <div className="space-y-2">
        {books.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
            <div>
              <span className="font-medium text-foreground">{b.title}</span>
              <span className="ml-2 text-sm text-muted-foreground">by {b.author}</span>
            </div>
            <button onClick={() => handleDelete(b.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminBooks;
