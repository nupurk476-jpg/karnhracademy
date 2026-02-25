import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Highlight {
  id: string;
  title: string;
  summary: string | null;
  image_url: string | null;
  created_at: string;
}

const AdminNewspaperHighlights = () => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchHighlights = async () => {
    const { data } = await supabase
      .from("newspaper_highlights")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setHighlights(data);
  };

  useEffect(() => { fetchHighlights(); }, []);

  const handleAdd = async () => {
    if (!title.trim()) return;
    setLoading(true);

    let image_url: string | null = null;

    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("newspaper-highlights")
        .upload(path, imageFile);
      if (uploadError) {
        toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("newspaper-highlights").getPublicUrl(path);
      image_url = urlData.publicUrl;
    }

    const { error } = await supabase
      .from("newspaper_highlights")
      .insert({ title: title.trim(), summary: summary.trim() || null, image_url });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Added!" });
      setTitle("");
      setSummary("");
      setImageFile(null);
      fetchHighlights();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("newspaper_highlights").delete().eq("id", id);
    fetchHighlights();
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Newspaper Highlights</h1>

      <div className="mb-8 space-y-4 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Add New Highlight</h2>
        <Input placeholder="Headline / Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="Summary (optional)" value={summary} onChange={(e) => setSummary(e.target.value)} />
        <div>
          <label className="mb-1 block text-sm font-medium text-muted-foreground">Image (optional)</label>
          <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
        </div>
        <Button onClick={handleAdd} disabled={loading || !title.trim()}>
          <Plus className="mr-2 h-4 w-4" /> {loading ? "Adding..." : "Add Highlight"}
        </Button>
      </div>

      <div className="space-y-4">
        {highlights.map((h) => (
          <div key={h.id} className="flex items-start gap-4 rounded-lg border border-border bg-card p-4">
            {h.image_url ? (
              <img src={h.image_url} alt={h.title} className="h-20 w-20 rounded object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded bg-muted">
                <Image className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">{h.title}</h3>
              {h.summary && <p className="mt-1 text-sm text-muted-foreground">{h.summary}</p>}
              <p className="mt-1 text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString()}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(h.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        {highlights.length === 0 && <p className="text-muted-foreground">No highlights yet.</p>}
      </div>
    </div>
  );
};

export default AdminNewspaperHighlights;
