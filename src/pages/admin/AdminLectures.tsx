import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Video, Image as ImageIcon } from "lucide-react";

const subjectOptions = [
  { label: "HRM", value: "hrm" },
  { label: "English", value: "english" },
];

const hrTopicOptions = [
  { label: "Compensation & Benefits", slug: "compensation-and-benefits" },
  { label: "Performance Management", slug: "performance-management" },
  { label: "Recruitment & Selection", slug: "recruitment-and-selection" },
  { label: "Functions of HR", slug: "functions-of-hr" },
  { label: "Industrial Relations", slug: "industrial-relations" },
  { label: "HRIS & SHRM", slug: "hris-and-shrm" },
  { label: "HR Analytics", slug: "hr-analytics" },
  { label: "HR Planning", slug: "human-resource-planning" },
  { label: "Evolution of HRM", slug: "evolution-of-hrm" },
];

const englishTopicOptions = [
  { label: "Vocabulary", slug: "vocabulary" },
  { label: "Grammar", slug: "grammar" },
  { label: "Reading Comprehension", slug: "reading-comprehension" },
  { label: "Writing Skills", slug: "writing-skills" },
  { label: "Verbal Ability", slug: "verbal-ability" },
];

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
      setTitle(""); setDescription(""); setVideoFile(null); setVideoUrlInput(""); setThumbFile(null); setTopicSlug(""); setSubject("hrm"); setDuration("");
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

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-foreground">Lectures</h1>
      <div className="mb-8 space-y-3 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Upload New Lecture</h2>
        <input placeholder="Lecture title" value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <div className="grid gap-3 sm:grid-cols-3">
          <select value={subject} onChange={e => { setSubject(e.target.value); setTopicSlug(""); }} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
            {subjectOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={topicSlug} onChange={e => setTopicSlug(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
            <option value="">-- Topic (optional) --</option>
            {(subject === "english" ? englishTopicOptions : hrTopicOptions).map(t => (
              <option key={t.slug} value={t.slug}>{t.label}</option>
            ))}
          </select>
          <input type="number" placeholder="Duration (min)" value={duration} onChange={e => setDuration(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted">
            <Video className="h-4 w-4" /> {videoFile ? videoFile.name : "Choose video file"}
            <input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files?.[0] || null)} className="hidden" />
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted">
            <ImageIcon className="h-4 w-4" /> {thumbFile ? thumbFile.name : "Thumbnail (optional)"}
            <input type="file" accept="image/*" onChange={e => setThumbFile(e.target.files?.[0] || null)} className="hidden" />
          </label>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Or paste a Zoom / YouTube recording URL (recommended for large Zoom recordings)</label>
          <input
            type="url"
            placeholder="https://zoom.us/rec/share/... or https://youtu.be/..."
            value={videoUrlInput}
            onChange={e => setVideoUrlInput(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <button onClick={handleCreate} disabled={uploading || !title || (!videoFile && !videoUrlInput.trim())} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50">
          {uploading ? "Uploading..." : "Upload Lecture"}
        </button>
      </div>

      <div className="space-y-2">
        {lectures.map((lec) => (
          <div key={lec.id} className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
            <div>
              <span className="font-medium text-foreground">{lec.title}</span>
              {lec.subject && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{lec.subject === "english" ? "English" : "HRM"}</span>}
              {lec.duration_minutes && <span className="ml-2 text-xs text-muted-foreground">{lec.duration_minutes} min</span>}
            </div>
            <button onClick={() => handleDelete(lec.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {lectures.length === 0 && <p className="text-sm text-muted-foreground">No lectures yet.</p>}
      </div>
    </div>
  );
};

export default AdminLectures;