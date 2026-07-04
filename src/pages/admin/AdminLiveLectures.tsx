import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Image as ImageIcon } from "lucide-react";
import { DISCIPLINES, getDiscipline } from "@/lib/disciplines";

const platformOptions = ["zoom", "google-meet", "youtube", "ms-teams", "other"];
const statusOptions = ["upcoming", "live", "ended"];

const AdminLiveLectures = () => {
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [platform, setPlatform] = useState("zoom");
  const [subject, setSubject] = useState("hrm");
  const [status, setStatus] = useState("upcoming");
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

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

  const handleCreate = async () => {
    if (!title || !scheduledAt) {
      toast({ title: "Title and schedule are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let thumbnail_url: string | null = null;
      if (thumbFile) thumbnail_url = await upload("blog-images", thumbFile);
      await supabase.from("live_lectures" as any).insert({
        title,
        description,
        scheduled_at: new Date(scheduledAt).toISOString(),
        meeting_url: meetingUrl || null,
        platform,
        subject,
        status,
        thumbnail_url,
      } as any);
      toast({ title: "Live lecture scheduled" });
      setTitle(""); setDescription(""); setScheduledAt(""); setMeetingUrl("");
      setPlatform("zoom"); setSubject("hrm"); setStatus("upcoming"); setThumbFile(null);
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    await supabase.from("live_lectures" as any).update({ status: newStatus } as any).eq("id", id);
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("live_lectures" as any).delete().eq("id", id);
    toast({ title: "Deleted" });
    load();
  };

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-foreground">Live Lectures</h1>
      <div className="mb-8 space-y-3 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Schedule New Live Lecture</h2>
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
          <ImageIcon className="h-4 w-4" /> {thumbFile ? thumbFile.name : "Thumbnail (optional)"}
          <input type="file" accept="image/*" onChange={e => setThumbFile(e.target.files?.[0] || null)} className="hidden" />
        </label>
        <div>
          <button onClick={handleCreate} disabled={saving} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50">
            {saving ? "Saving..." : "Schedule Live Lecture"}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((l) => (
          <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3">
            <div className="min-w-0">
              <div className="font-medium text-foreground">{l.title}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(l.scheduled_at).toLocaleString()} · {l.platform} · {getDiscipline(l.subject)?.short ?? l.subject?.toUpperCase() ?? "HRM"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select value={l.status} onChange={e => updateStatus(l.id, e.target.value)} className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground">
                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => handleDelete(l.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground">No live lectures scheduled.</p>}
      </div>
    </div>
  );
};

export default AdminLiveLectures;