import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Pencil, X, Image as ImageIcon } from "lucide-react";
import { DISCIPLINES, getDiscipline } from "@/lib/disciplines";
import { compressImage } from "@/lib/compressImage";
import { useConfirm } from "@/hooks/use-confirm";

const platformOptions = ["zoom", "google-meet", "youtube", "ms-teams", "other"];
const statusOptions = ["upcoming", "live", "ended"];

const AdminLiveLectures = () => {
  const [items, setItems] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [platform, setPlatform] = useState("zoom");
  const [subject, setSubject] = useState("hrm");
  const [status, setStatus] = useState("upcoming");
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const load = () => {
    supabase.from("live_lectures" as any).select("*").order("scheduled_at", { ascending: false })
      .then(({ data }) => data && setItems(data));
  };
  useEffect(() => { load(); }, []);

  const upload = async (bucket: string, file: File) => {
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) throw error;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle(""); setDescription(""); setScheduledAt(""); setMeetingUrl("");
    setPlatform("zoom"); setSubject("hrm"); setStatus("upcoming");
    setThumbFile(null); setExistingThumbnailUrl(null);
  };

  // datetime-local wants "YYYY-MM-DDTHH:mm" in local time, not an ISO string.
  const toLocalInputValue = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const startEdit = (l: any) => {
    setEditingId(l.id);
    setTitle(l.title ?? "");
    setDescription(l.description ?? "");
    setScheduledAt(l.scheduled_at ? toLocalInputValue(l.scheduled_at) : "");
    setMeetingUrl(l.meeting_url ?? "");
    setPlatform(l.platform ?? "zoom");
    setSubject(l.subject ?? "hrm");
    setStatus(l.status ?? "upcoming");
    setExistingThumbnailUrl(l.thumbnail_url ?? null);
    setThumbFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCreate = async () => {
    if (!title || !scheduledAt) {
      toast({ title: "Title and schedule are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let thumbnail_url: string | null = existingThumbnailUrl;
      if (thumbFile) thumbnail_url = await upload("blog-images", await compressImage(thumbFile));
      const row = {
        title,
        description,
        scheduled_at: new Date(scheduledAt).toISOString(),
        meeting_url: meetingUrl || null,
        platform,
        subject,
        status,
        thumbnail_url,
      };
      const { error } = editingId
        ? await supabase.from("live_lectures" as any).update(row as any).eq("id", editingId)
        : await supabase.from("live_lectures" as any).insert(row as any);
      if (error) throw error;
      toast({ title: editingId ? "Live lecture updated" : "Live lecture scheduled" });
      resetForm();
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("live_lectures" as any).update({ status: newStatus } as any).eq("id", id);
    if (error) { toast({ title: "Failed to update status", description: error.message, variant: "destructive" }); return; }
    load();
  };

  const handleDelete = async (id: string, title: string) => {
    const ok = await confirm({ title: `Delete "${title}"?`, description: "This cannot be undone." });
    if (!ok) return;
    const { error } = await supabase.from("live_lectures" as any).delete().eq("id", id);
    if (error) { toast({ title: "Failed to delete", description: error.message, variant: "destructive" }); return; }
    if (editingId === id) resetForm();
    toast({ title: "Deleted" });
    load();
  };

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-foreground">Live Lectures</h1>
      <div className={`mb-8 space-y-3 rounded-lg border bg-card p-6 ${editingId ? "border-accent" : "border-border"}`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">{editingId ? "Edit Live Lecture" : "Schedule New Live Lecture"}</h2>
          {editingId && (
            <button onClick={resetForm} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">
              <X className="h-3.5 w-3.5" /> Cancel Edit
            </button>
          )}
        </div>
        <input placeholder="Lecture title" value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-muted-foreground">Scheduled at</label>
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <input placeholder="Meeting URL (Zoom/Meet/YouTube link)" value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <select value={subject} onChange={e => setSubject(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
            {DISCIPLINES.map(d => <option key={d.value} value={d.value}>{d.short} — {d.label}</option>)}
          </select>
          <select value={platform} onChange={e => setPlatform(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
            {platformOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted">
          <ImageIcon className="h-4 w-4" /> {thumbFile ? thumbFile.name : existingThumbnailUrl ? "Replace thumbnail" : "Thumbnail (optional)"}
          <input type="file" accept="image/*" onChange={e => setThumbFile(e.target.files?.[0] || null)} className="hidden" />
        </label>
        {!thumbFile && existingThumbnailUrl && (
          <img src={existingThumbnailUrl} alt="Current thumbnail" className="h-12 w-20 rounded object-cover" />
        )}
        <div>
          <button onClick={handleCreate} disabled={saving} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50">
            {saving ? "Saving..." : editingId ? "Save Changes" : "Schedule Live Lecture"}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((l) => (
          <div key={l.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card px-4 py-3 ${editingId === l.id ? "border-accent" : "border-border"}`}>
            <div className="min-w-0">
              <div className="font-medium text-foreground">{l.title}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(l.scheduled_at).toLocaleString()} · {l.platform} · {getDiscipline(l.subject)?.short ?? l.subject?.toUpperCase() ?? "HRM"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select value={l.status} onChange={e => updateStatus(l.id, e.target.value)} aria-label={`Status for ${l.title}`} className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground">
                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => startEdit(l)} aria-label={`Edit ${l.title}`} className="text-muted-foreground hover:text-accent"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => handleDelete(l.id, l.title)} aria-label={`Delete ${l.title}`} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground">No live lectures scheduled.</p>}
      </div>
      <ConfirmDialog />
    </div>
  );
};

export default AdminLiveLectures;