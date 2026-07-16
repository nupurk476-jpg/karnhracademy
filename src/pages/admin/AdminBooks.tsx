import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

const AdminBooks = () => {
  const [books, setBooks] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ title: "", author: "", description: "", buy_link: "" });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const load = () => {
    supabase.from("book_recommendations").select("*").order("created_at", { ascending: false }).then(({ data }) => data && setBooks(data));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.author) return;
    setUploading(true);
    let pdf_url: string | null = null;
    if (pdfFile) {
      const path = `${form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}.pdf`;
      const { error } = await supabase.storage.from("educator").upload(path, pdfFile);
      if (!error) {
        const { data: urlData } = supabase.storage.from("educator").getPublicUrl(path);
        pdf_url = urlData.publicUrl;
      }
    }
    await supabase.from("book_recommendations").insert({ ...form, pdf_url });
    toast({ title: "Book added" });
    setForm({ title: "", author: "", description: "", buy_link: "" });
    setPdfFile(null);
    setUploading(false);
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("book_recommendations").delete().eq("id", id);
    toast({ title: "Book removed" });
    load();
  };

  const term = search.trim().toLowerCase();
  const filteredBooks = books.filter(b =>
    !term || b.title?.toLowerCase().includes(term) || b.author?.toLowerCase().includes(term)
  );

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-foreground">Book Recommendations</h1>
      <div className="mb-8 space-y-3 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Add Book</h2>
        <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input placeholder="Author" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input placeholder="Buy Link (affiliate URL)" value={form.buy_link} onChange={e => setForm({ ...form, buy_link: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Upload PDF (optional)</label>
          <input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} className="text-sm text-muted-foreground" />
        </div>
        <button onClick={handleCreate} disabled={uploading} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50">
          {uploading ? "Uploading..." : "Add Book"}
        </button>
      </div>
      {books.length > 0 && (
        <input
          type="text"
          placeholder="Search books by title or author..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-3 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      )}
      <div className="space-y-2">
        {books.length > 0 && filteredBooks.length === 0 && (
          <p className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">No books match "{search}".</p>
        )}
        {filteredBooks.map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3">
            <div className="min-w-0">
              <span className="font-medium text-foreground">{b.title}</span>
              <span className="ml-2 text-sm text-muted-foreground">by {b.author}</span>
            </div>
            <button onClick={() => handleDelete(b.id)} className="shrink-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminBooks;
