import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { Trash2, Pencil, X } from "lucide-react";

const emptyForm = { title: "", author: "", description: "", buy_link: "" };

const AdminBooks = () => {
  const [books, setBooks] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [existingPdfUrl, setExistingPdfUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const load = () => {
    supabase.from("book_recommendations").select("*").order("created_at", { ascending: false }).then(({ data }) => data && setBooks(data));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setPdfFile(null);
    setExistingPdfUrl(null);
  };

  const startEdit = (book: any) => {
    setEditingId(book.id);
    setForm({ title: book.title ?? "", author: book.author ?? "", description: book.description ?? "", buy_link: book.buy_link ?? "" });
    setExistingPdfUrl(book.pdf_url ?? null);
    setPdfFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async () => {
    if (!form.title || !form.author) return;
    setUploading(true);
    let pdf_url: string | null = existingPdfUrl;
    if (pdfFile) {
      const path = `${form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}.pdf`;
      const { error } = await supabase.storage.from("educator").upload(path, pdfFile);
      if (error) {
        toast({ title: "PDF upload failed", description: error.message, variant: "destructive" });
        setUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("educator").getPublicUrl(path);
      pdf_url = urlData.publicUrl;
    }
    const row = { ...form, pdf_url };
    const { error } = editingId
      ? await supabase.from("book_recommendations").update(row).eq("id", editingId)
      : await supabase.from("book_recommendations").insert(row);
    if (error) {
      toast({ title: editingId ? "Failed to update book" : "Failed to add book", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    toast({ title: editingId ? "Book updated" : "Book added" });
    resetForm();
    setUploading(false);
    load();
  };

  const handleDelete = async (id: string, title: string) => {
    const ok = await confirm({ title: `Delete "${title}"?`, description: "This cannot be undone." });
    if (!ok) return;
    const { error } = await supabase.from("book_recommendations").delete().eq("id", id);
    if (error) { toast({ title: "Failed to delete book", description: error.message, variant: "destructive" }); return; }
    if (editingId === id) resetForm();
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
      <div className={`mb-8 space-y-3 rounded-lg border bg-card p-6 ${editingId ? "border-accent" : "border-border"}`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">{editingId ? "Edit Book" : "Add Book"}</h2>
          {editingId && (
            <button onClick={resetForm} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">
              <X className="h-3.5 w-3.5" /> Cancel Edit
            </button>
          )}
        </div>
        <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input placeholder="Author" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input placeholder="Buy Link (affiliate URL)" value={form.buy_link} onChange={e => setForm({ ...form, buy_link: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">{existingPdfUrl ? "Replace PDF" : "Upload PDF (optional)"}</label>
          <input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} className="text-sm text-muted-foreground" />
          {!pdfFile && existingPdfUrl && (
            <p className="mt-1 text-xs text-muted-foreground">
              Current: <a href={existingPdfUrl} target="_blank" rel="noopener noreferrer" className="text-accent-deep hover:underline">{decodeURIComponent(existingPdfUrl.split("/").pop() || "").slice(0, 40)}</a>
            </p>
          )}
        </div>
        <button onClick={handleSave} disabled={uploading || !form.title || !form.author} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50">
          {uploading ? "Saving..." : editingId ? "Save Changes" : "Add Book"}
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
          <div key={b.id} className={`flex items-center justify-between gap-3 rounded-md border bg-card px-4 py-3 ${editingId === b.id ? "border-accent" : "border-border"}`}>
            <div className="min-w-0">
              <span className="font-medium text-foreground">{b.title}</span>
              <span className="ml-2 text-sm text-muted-foreground">by {b.author}</span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button onClick={() => startEdit(b)} aria-label={`Edit ${b.title}`} className="text-muted-foreground hover:text-accent-deep"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => handleDelete(b.id, b.title)} aria-label={`Delete ${b.title}`} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog />
    </div>
  );
};

export default AdminBooks;
