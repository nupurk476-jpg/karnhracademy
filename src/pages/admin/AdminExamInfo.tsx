import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Upload, Pencil, X, Link2, FileText } from "lucide-react";
import { useConfirm } from "@/hooks/use-confirm";

// Cards appear on the Labour Welfare hub in ascending sort_order. Each
// card needs a destination: an internal path ("/pyqs"), an external URL,
// or an uploaded PDF — link takes precedence when both are set.
const AdminExamInfo = () => {
  const [cards, setCards] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const load = () => {
    (supabase.from("exam_info_cards" as any) as any)
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .then(({ data, error }: any) => {
        if (error) { toast({ title: "Failed to load exam info cards", description: error.message, variant: "destructive" }); return; }
        if (data) setCards(data);
      });
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle(""); setDescription(""); setLinkUrl(""); setSortOrder(0);
    setFile(null); setExistingFileUrl(null);
  };

  const startEdit = (card: any) => {
    setEditingId(card.id);
    setTitle(card.title ?? "");
    setDescription(card.description ?? "");
    setLinkUrl(card.link_url ?? "");
    setSortOrder(card.sort_order ?? 0);
    setExistingFileUrl(card.file_url ?? null);
    setFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async () => {
    if (!title) return;
    setUploading(true);
    try {
      let file_url: string | null = existingFileUrl;
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("exam-info").upload(path, file);
        if (error) throw new Error(error.message);
        file_url = supabase.storage.from("exam-info").getPublicUrl(path).data.publicUrl;
      }

      const row: any = { title, description: description || null, link_url: linkUrl.trim() || null, file_url, sort_order: sortOrder };
      const write = (r: any) => editingId
        ? (supabase.from("exam_info_cards" as any) as any).update(r).eq("id", editingId)
        : (supabase.from("exam_info_cards" as any) as any).insert(r);
      const { error } = await write(row);
      if (error) throw new Error(error.message);

      toast({ title: editingId ? "Card updated" : "Card added" });
      resetForm();
      load();
    } catch (err: any) {
      toast({ title: editingId ? "Failed to update card" : "Failed to save card", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const ok = await confirm({ title: `Delete "${title}"?`, description: "This cannot be undone." });
    if (!ok) return;
    const { error } = await (supabase.from("exam_info_cards" as any) as any).delete().eq("id", id);
    if (error) { toast({ title: "Failed to delete card", description: error.message, variant: "destructive" }); return; }
    if (editingId === id) resetForm();
    toast({ title: "Card deleted" });
    load();
  };

  const fileName = (url: string) => decodeURIComponent(url.split("/").pop() || "").slice(0, 40);

  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold text-foreground">Exam Info Cards</h1>
      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
        Compact info cards shown on the Labour Welfare page — syllabus, upcoming exam notification,
        cut-offs, eligibility, exam pattern, and similar quick references. Each card links to a page
        (internal path like <code className="rounded bg-muted px-1">/pyqs</code> or full external URL) or opens an uploaded PDF.
      </p>

      <div className={`mb-8 space-y-4 rounded-lg border bg-card p-6 ${editingId ? "border-accent" : "border-border"}`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">{editingId ? "Edit Card" : "Add Card"}</h2>
          {editingId && (
            <button onClick={resetForm} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">
              <X className="h-3.5 w-3.5" /> Cancel Edit
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
          <input placeholder="Title (e.g. UGC NET Code 55 Syllabus)" value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input type="number" placeholder="Order" title="Display order — lower numbers show first" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>

        <textarea placeholder="Short description (1–2 lines, shown on the card)" value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />

        <input placeholder="Link URL — internal path (/pyqs) or external (https://…). Optional if uploading a PDF." value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted">
            <Upload className="h-4 w-4" />
            {file ? file.name : existingFileUrl ? "Replace PDF" : "Attach PDF (optional)"}
            <input type="file" accept=".pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
          </label>
          {!file && existingFileUrl && (
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              Current:{" "}
              <a href={existingFileUrl} target="_blank" rel="noopener noreferrer" className="text-accent-deep hover:underline">
                {fileName(existingFileUrl)}
              </a>
              <button type="button" onClick={() => setExistingFileUrl(null)} className="text-muted-foreground hover:text-destructive" aria-label="Remove attached file">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
        </div>

        <button onClick={handleSave} disabled={uploading || !title} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50">
          {uploading ? (editingId ? "Saving..." : "Uploading...") : editingId ? "Save Changes" : "Add Card"}
        </button>
      </div>

      <div className="space-y-2">
        {cards.map((card) => (
          <div key={card.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-4 py-3 ${editingId === card.id ? "border-accent" : "border-border"}`}>
            <div className="min-w-0">
              <span className="mr-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">#{card.sort_order}</span>
              <span className="font-medium text-foreground">{card.title}</span>
              {card.link_url && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground"><Link2 className="h-3 w-3" />{card.link_url.slice(0, 40)}</span>
              )}
              {card.file_url && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground"><FileText className="h-3 w-3" />PDF</span>
              )}
              {!card.link_url && !card.file_url && (
                <span className="ml-2 text-xs font-medium text-destructive">No link or PDF — card won't be clickable</span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button onClick={() => startEdit(card)} className="text-muted-foreground hover:text-accent-deep" aria-label={`Edit ${card.title}`}>
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => handleDelete(card.id, card.title)} className="text-muted-foreground hover:text-destructive" aria-label={`Delete ${card.title}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {cards.length === 0 && (
          <p className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            No cards yet. Add ones like "UGC NET Code 55 Syllabus", "Upcoming Exam Notification", "Cut-offs in Recent Exams", "Eligibility", "Exam Pattern".
          </p>
        )}
      </div>
      <ConfirmDialog />
    </div>
  );
};

export default AdminExamInfo;
