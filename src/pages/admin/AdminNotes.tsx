import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Upload, Video } from "lucide-react";
import { DISCIPLINES, getDiscipline, getTopicLabel } from "@/lib/disciplines";

const AdminNotes = () => {
  const [notes, setNotes] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topicSlug, setTopicSlug] = useState("");
  const [subject, setSubject] = useState("hrm");
  const [file, setFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const load = () => {
    supabase.from("notes").select("*").order("created_at", { ascending: false }).then(({ data }) => data && setNotes(data));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!title) return;
    setUploading(true);
    let file_url: string | null = null;
    let video_url: string | null = null;

    if (file) {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("notes").upload(path, file);
      if (error) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
        setUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("notes").getPublicUrl(path);
      file_url = urlData.publicUrl;
    }

    if (videoFile) {
      const ext = videoFile.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("note-videos").upload(path, videoFile);
      if (error) {
        toast({ title: "Video upload failed", description: error.message, variant: "destructive" });
        setUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("note-videos").getPublicUrl(path);
      video_url = urlData.publicUrl;
    }

    const { error: insertError } = await supabase.from("notes").insert({ title, description, file_url, video_url, topic_slug: topicSlug || null, subject } as any);
    if (insertError) {
      toast({ title: "Failed to save note", description: insertError.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    toast({ title: "Note created" });
    setTitle(""); setDescription(""); setFile(null); setVideoFile(null); setTopicSlug(""); setSubject("hrm");
    setUploading(false);
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("notes").delete().eq("id", id);
    toast({ title: "Note deleted" });
    load();
  };

  const activeDiscipline = getDiscipline(subject);
  const topics = activeDiscipline ? [...activeDiscipline.topics] : [];

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-foreground">Notes</h1>
      <div className="mb-8 space-y-4 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Upload New Note</h2>
        <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />

        {/* Discipline selector */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Select Discipline</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {DISCIPLINES.map(d => {
              const Icon = d.icon;
              const isActive = subject === d.value;
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => { setSubject(d.value); setTopicSlug(""); }}
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

        {/* Topic chips */}
        {topics.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Topic (optional)</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTopicSlug("")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  topicSlug === "" ? "bg-accent text-accent-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                All Topics
              </button>
              {topics.map(t => (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => setTopicSlug(t.slug)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    topicSlug === t.slug ? "bg-accent text-accent-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted">
            <Upload className="h-4 w-4" /> {file ? file.name : "Choose PDF / PPT"}
            <input type="file" accept=".pdf,.ppt,.pptx" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted">
            <Video className="h-4 w-4" /> {videoFile ? videoFile.name : "Choose Video (MP4, MOV, WebM)"}
            <input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files?.[0] || null)} className="hidden" />
          </label>
        </div>
        <button onClick={handleCreate} disabled={uploading || !title} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50">
          {uploading ? "Uploading..." : "Create Note"}
        </button>
      </div>

      <div className="space-y-2">
        {notes.map((note) => (
          <div key={note.id} className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
            <div>
              <span className="font-medium text-foreground">{note.title}</span>
              {note.subject && (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {getDiscipline(note.subject)?.short ?? note.subject.toUpperCase()}
                </span>
              )}
              {note.topic_slug && <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">{getTopicLabel(note.topic_slug)}</span>}
              {note.file_url && <span className="ml-2 text-xs text-muted-foreground">{note.file_url.match(/\.pptx?$/i) ? "PPT" : "PDF"}</span>}
              {note.video_url && <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">VIDEO</span>}
            </div>
            <button onClick={() => handleDelete(note.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminNotes;
