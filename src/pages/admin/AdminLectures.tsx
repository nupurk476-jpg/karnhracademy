import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Video, Image as ImageIcon } from "lucide-react";
import { DISCIPLINES, getDiscipline } from "@/lib/disciplines";

const AdminLectures = () => {
  const [lectures, setLectures] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topicSlug, setTopicSlug] = useState("");
  const [subject, setSubject] = useState("hrm");
  const [duration, setDuration] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const load = () => {
    supabase.from("lectures" as any).select("*").order("created_at", { ascending: false }).then(({ data }) => data && setLectures(data));
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
    if (!title || (!videoFile && !videoUrlInput.trim())) {
      toast({ title: "Title and a video (file or URL) are required", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const video_url = videoFile
        ? await upload("note-videos", videoFile)
        : videoUrlInput.trim();
      let thumbnail_url: string | null = null;
      if (thumbFile) thumbnail_url = await upload("blog-images", thumbFile);
      await supabase.from("lectures" as any).insert({
        title,
        description,
        video_url,
        thumbnail_url,
        topic_slug: topicSlug || null,
        subject,
        duration_minutes: duration ? parseInt(duration) : null,
      } as any);
      toast({ title: "Lecture uploaded" });
      setTitle(""); setDescription(""); setVideoFile(null); setVideoUrlInput("");
      setThumbFile(null); setTopicSlug(""); setSubject("hrm"); setDuration("");
      load();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("lectures" as any).delete().eq("id", id);
    toast({ title: "Lecture deleted" });
    load();
  };

  const activeDiscipline = getDiscipline(subject);
  const topics = activeDiscipline ? [...activeDiscipline.topics] : [];

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-foreground">Lectures</h1>
      <div className="mb-8 space-y-4 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Upload New Lecture</h2>
        <input placeholder="Lecture title" value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />

        {/* Discipline selector — mirrors AdminNotes */}
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

        {/* Topic chips from disciplines.ts */}
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

        <input
          type="number"
          placeholder="Duration (minutes)"
          value={duration}
          onChange={e => setDuration(e.target.value)}
          className="w-40 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />

        <div className="rounded-md border border-accent/40 bg-accent/5 p-3">
          <label className="mb-1 block text-sm font-semibold text-foreground">
            Recommended: paste a YouTube or Zoom recording URL
          </label>
          <p className="mb-2 text-xs text-muted-foreground">
            Best for large files (over ~500 MB). Upload to YouTube (Unlisted) or Zoom Cloud, then paste the share link here.
          </p>
          <input
            type="url"
            placeholder="https://youtu.be/... or https://zoom.us/rec/share/..."
            value={videoUrlInput}
            onChange={e => setVideoUrlInput(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="text-center text-xs uppercase tracking-wider text-muted-foreground">— or upload a small file directly —</div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted">
            <Video className="h-4 w-4" /> {videoFile ? videoFile.name : "Choose video file (under ~200 MB)"}
            <input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files?.[0] || null)} className="hidden" />
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted">
            <ImageIcon className="h-4 w-4" /> {thumbFile ? thumbFile.name : "Thumbnail (optional)"}
            <input type="file" accept="image/*" onChange={e => setThumbFile(e.target.files?.[0] || null)} className="hidden" />
          </label>
        </div>

        <button
          onClick={handleCreate}
          disabled={uploading || !title || (!videoFile && !videoUrlInput.trim())}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload Lecture"}
        </button>
      </div>

      <div className="space-y-2">
        {lectures.map((lec) => (
          <div key={lec.id} className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
            <div>
              <span className="font-medium text-foreground">{lec.title}</span>
              {lec.subject && (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {getDiscipline(lec.subject)?.short ?? lec.subject.toUpperCase()}
                </span>
              )}
              {lec.topic_slug && (
                <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                  {getDiscipline(lec.subject)?.topics.find((t: any) => t.slug === lec.topic_slug)?.label ?? lec.topic_slug}
                </span>
              )}
              {lec.duration_minutes && <span className="ml-2 text-xs text-muted-foreground">{lec.duration_minutes} min</span>}
            </div>
            <button onClick={() => handleDelete(lec.id)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {lectures.length === 0 && <p className="text-sm text-muted-foreground">No lectures yet.</p>}
      </div>
    </div>
  );
};

export default AdminLectures;
