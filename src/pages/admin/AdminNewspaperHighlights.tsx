import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Pencil, X, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { compressImage } from "@/lib/compressImage";
import { Badge } from "@/components/ui/badge";

const SECTIONS = ["Business", "International", "Sports", "General", "Editorial"] as const;

interface Highlight {
  id: string;
  title: string;
  summary: string | null;
  image_url: string | null;
  section: string;
  created_at: string;
}

const AdminNewspaperHighlights = () => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [section, setSection] = useState("general");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const fetchHighlights = async () => {
    const { data } = await supabase
      .from("newspaper_highlights")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setHighlights(data as Highlight[]);
  };

  useEffect(() => { fetchHighlights(); }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle(""); setSummary(""); setSection("general");
    setImageFile(null); setExistingImageUrl(null);
  };

  const startEdit = (h: Highlight) => {
    setEditingId(h.id);
    setTitle(h.title);
    setSummary(h.summary ?? "");
    setSection(h.section);
    setExistingImageUrl(h.image_url);
    setImageFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAdd = async () => {
    if (!title.trim()) return;
    setLoading(true);

    let image_url: string | null = existingImageUrl;

    if (imageFile) {
      const compressed = await compressImage(imageFile);
      const ext = compressed.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("newspaper-highlights")
        .upload(path, compressed);
      if (uploadError) {
        toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("newspaper-highlights").getPublicUrl(path);
      image_url = urlData.publicUrl;
    }

    const row = { title: title.trim(), summary: summary.trim() || null, image_url, section: section.toLowerCase() };
    const { error } = editingId
      ? await supabase.from("newspaper_highlights").update(row).eq("id", editingId)
      : await supabase.from("newspaper_highlights").insert(row);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Updated!" : "Added!" });
      resetForm();
      fetchHighlights();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, title: string) => {
    const ok = await confirm({ title: `Delete "${title}"?`, description: "This cannot be undone." });
    if (!ok) return;
    const { error } = await supabase.from("newspaper_highlights").delete().eq("id", id);
    if (error) { toast({ title: "Failed to delete", description: error.message, variant: "destructive" }); return; }
    if (editingId === id) resetForm();
    toast({ title: "Highlight deleted" });
    fetchHighlights();
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Newspaper Highlights</h1>

      <div className="mb-8 space-y-4 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">{editingId ? "Edit Highlight" : "Add New Highlight"}</h2>
          {editingId && (
            <button onClick={resetForm} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">
              <X className="h-3.5 w-3.5" /> Cancel Edit
            </button>
          )}
        </div>
        <Input placeholder="Headline / Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="Summary (optional)" value={summary} onChange={(e) => setSummary(e.target.value)} />
        <div>
          <label className="mb-1 block text-sm font-medium text-muted-foreground">Section</label>
          <Select value={section} onValueChange={setSection}>
            <SelectTrigger>
              <SelectValue placeholder="Select section" />
            </SelectTrigger>
            <SelectContent>
              {SECTIONS.map((s) => (
                <SelectItem key={s} value={s.toLowerCase()}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-muted-foreground">{existingImageUrl ? "Replace image" : "Image (optional)"}</label>
          <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
          {!imageFile && existingImageUrl && (
            <img src={existingImageUrl} alt="Current" className="mt-2 h-16 w-16 rounded object-cover" />
          )}
        </div>
        <Button onClick={handleAdd} disabled={loading || !title.trim()}>
          <Plus className="mr-2 h-4 w-4" /> {loading ? "Saving..." : editingId ? "Save Changes" : "Add Highlight"}
        </Button>
      </div>

      <div className="space-y-4">
        {highlights.map((h) => (
          <div key={h.id} className={`flex items-start gap-4 rounded-lg border bg-card p-4 ${editingId === h.id ? "border-accent" : "border-border"}`}>
            {h.image_url ? (
              <img src={h.image_url} alt={h.title} className="h-20 w-20 rounded object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded bg-muted">
                <Image className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">{h.title}</h3>
                <Badge variant="secondary" className="capitalize">{h.section}</Badge>
              </div>
              {h.summary && <p className="mt-1 text-sm text-muted-foreground">{h.summary}</p>}
              <p className="mt-1 text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => startEdit(h)} aria-label={`Edit ${h.title}`}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(h.id, h.title)} aria-label={`Delete ${h.title}`}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {highlights.length === 0 && <p className="text-muted-foreground">No highlights yet.</p>}
      </div>
      <ConfirmDialog />
    </div>
  );
};

export default AdminNewspaperHighlights;
