import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Upload, Pencil, X } from "lucide-react";
import { DISCIPLINES, getDiscipline } from "@/lib/disciplines";
import { LW_UNITS, unitRoman } from "@/lib/labourWelfareUnits";

// Which subjects have a unit structure to tag PYQ papers against. Only
// Labour Welfare has one today; a future syllabus-based subject just adds
// its own entry here (and its own units data file, same as labourWelfareUnits.ts).
const SUBJECT_UNITS: Record<string, { number: number; title: string }[]> = {
  lw: LW_UNITS.map(u => ({ number: u.number, title: u.title })),
};

const AdminPYQs = () => {
  const [papers, setPapers] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [subject, setSubject] = useState("lw");
  const [unitTags, setUnitTags] = useState<number[]>([]);
  const [tagsInput, setTagsInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const load = () => {
    (supabase.from("pyq_papers" as any) as any)
      .select("*")
      .order("year", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data, error }: any) => {
        if (error) { toast({ title: "Failed to load PYQ papers", description: error.message, variant: "destructive" }); return; }
        if (data) setPapers(data);
      });
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle(""); setYear(new Date().getFullYear()); setSubject("lw");
    setUnitTags([]); setTagsInput(""); setFile(null); setExistingFileUrl(null);
  };

  const startEdit = (paper: any) => {
    setEditingId(paper.id);
    setTitle(paper.title ?? "");
    setYear(paper.year ?? new Date().getFullYear());
    setSubject(paper.subject ?? "lw");
    setUnitTags(paper.unit_tags ?? []);
    setTagsInput((paper.tags ?? []).join(", "));
    setExistingFileUrl(paper.file_url ?? null);
    setFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleUnit = (n: number) => {
    setUnitTags(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n].sort((a, b) => a - b));
  };

  const uploadFile = async (f: File) => {
    const ext = f.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("pyq-papers").upload(path, f);
    if (error) throw new Error(error.message);
    return supabase.storage.from("pyq-papers").getPublicUrl(path).data.publicUrl;
  };

  const handleSave = async () => {
    if (!title || !year) return;
    setUploading(true);
    try {
      let file_url: string | null = existingFileUrl;
      if (file) file_url = await uploadFile(file);

      const tags = tagsInput.split(",").map(t => t.trim()).filter(Boolean);
      const row: any = { title, year, subject, file_url, unit_tags: unitTags, tags };
      const write = (r: any) => editingId
        ? (supabase.from("pyq_papers" as any) as any).update(r).eq("id", editingId)
        : (supabase.from("pyq_papers" as any) as any).insert(r);
      const { error } = await write(row);
      if (error) throw new Error(error.message);

      toast({ title: editingId ? "Paper updated" : "Paper added" });
      resetForm();
      load();
    } catch (err: any) {
      toast({ title: editingId ? "Failed to update paper" : "Failed to save paper", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await (supabase.from("pyq_papers" as any) as any).delete().eq("id", id);
    if (editingId === id) resetForm();
    toast({ title: "Paper deleted" });
    load();
  };

  const availableUnits = SUBJECT_UNITS[subject] ?? [];
  const fileName = (url: string) => decodeURIComponent(url.split("/").pop() || "").slice(0, 40);

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-foreground">Previous Year Questions</h1>
      <div className={`mb-8 space-y-4 rounded-lg border bg-card p-6 ${editingId ? "border-accent" : "border-border"}`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">{editingId ? "Edit Paper" : "Add Previous Year Paper"}</h2>
          {editingId && (
            <button onClick={resetForm} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">
              <X className="h-3.5 w-3.5" /> Cancel Edit
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <input placeholder="Title (e.g. UGC NET Labour Welfare — June 2024, Paper II)" value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input type="number" placeholder="Year" value={year} onChange={e => setYear(Number(e.target.value))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>

        {/* Subject selector */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Select Subject</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {DISCIPLINES.map(d => {
              const Icon = d.icon;
              const isActive = subject === d.value;
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => { setSubject(d.value); setUnitTags([]); }}
                  className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-left text-sm transition-all ${
                    isActive ? d.activeColor : d.color + " hover:brightness-95"
                  }`}
                >
                  <div className={`flex-shrink-0 rounded p-1 ${isActive ? "bg-white/20" : "bg-white"}`}>
                    <Icon className={`h-4 w-4 ${isActive ? "text-white" : d.iconColor}`} />
                  </div>
                  <span className="font-semibold leading-tight">{d.short}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Unit tags — only for subjects with a unit structure */}
        {availableUnits.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Tag Relevant Unit(s)</p>
            <div className="flex flex-wrap gap-2">
              {availableUnits.map(u => (
                <button
                  key={u.number}
                  type="button"
                  onClick={() => toggleUnit(u.number)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    unitTags.includes(u.number) ? "bg-accent text-accent-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Unit {unitRoman(u.number)}: {u.title}
                </button>
              ))}
            </div>
          </div>
        )}

        <input placeholder="Tags (comma-separated, e.g. solved, with-answer-key)" value={tagsInput} onChange={e => setTagsInput(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />

        {/* PDF attachment */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted">
            <Upload className="h-4 w-4" />
            {file ? file.name : existingFileUrl ? "Replace PDF" : "Choose PDF"}
            <input type="file" accept=".pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
          </label>
          {!file && existingFileUrl && (
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              Current: <a href={existingFileUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{fileName(existingFileUrl)}</a>
              <button type="button" onClick={() => setExistingFileUrl(null)} className="text-muted-foreground hover:text-destructive" aria-label="Remove attached file">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
        </div>

        <button onClick={handleSave} disabled={uploading || !title || !year} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50">
          {uploading ? (editingId ? "Saving..." : "Uploading...") : editingId ? "Save Changes" : "Add Paper"}
        </button>
      </div>

      <div className="space-y-2">
        {papers.map((paper) => (
          <div key={paper.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-4 py-3 ${editingId === paper.id ? "border-accent" : "border-border"}`}>
            <div className="min-w-0">
              <span className="font-medium text-foreground">{paper.title}</span>
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{paper.year}</span>
              {paper.subject && (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {getDiscipline(paper.subject)?.short ?? paper.subject.toUpperCase()}
                </span>
              )}
              {(paper.unit_tags ?? []).map((n: number) => (
                <span key={n} className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">Unit {unitRoman(n)}</span>
              ))}
              {(paper.tags ?? []).map((tag: string) => (
                <span key={tag} className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">#{tag}</span>
              ))}
              {paper.file_url && <span className="ml-2 text-xs text-muted-foreground">PDF</span>}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button onClick={() => startEdit(paper)} className="text-muted-foreground hover:text-accent" aria-label={`Edit ${paper.title}`}>
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => handleDelete(paper.id)} className="text-muted-foreground hover:text-destructive" aria-label={`Delete ${paper.title}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {papers.length === 0 && (
          <p className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">No previous year papers uploaded yet.</p>
        )}
      </div>
    </div>
  );
};

export default AdminPYQs;
