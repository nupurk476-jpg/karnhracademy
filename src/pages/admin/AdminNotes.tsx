import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Upload, Video } from "lucide-react";

const subjectOptions = [
  { label: "HRM", value: "hrm" },
  { label: "English", value: "english" },
  { label: "Principles of Management", value: "pom" },
  { label: "Organizational Behaviour", value: "ob" },
  { label: "Strategic Management", value: "sm" },
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
  { label: "Synonyms & Antonyms", slug: "synonyms-antonyms" },
  { label: "Idioms & Phrases", slug: "idioms-phrases" },
];

const pomTopicOptions = [
  { label: "Planning", slug: "planning" },
  { label: "Organizing", slug: "organizing" },
  { label: "Staffing", slug: "staffing" },
  { label: "Directing", slug: "directing" },
  { label: "Controlling", slug: "controlling" },
  { label: "Coordination", slug: "coordination" },
  { label: "Decision Making", slug: "decision-making" },
  { label: "Principles of Fayol & Taylor", slug: "fayol-taylor" },
  { label: "Business Ethics", slug: "business-ethics" },
];

const smTopicOptions = [
  { label: "Nature & Scope of SM", slug: "nature-and-scope-of-sm" },
  { label: "Strategic Intent", slug: "strategic-intent" },
  { label: "Environmental Scanning", slug: "environmental-scanning" },
  { label: "Strategic Analysis", slug: "strategic-analysis" },
  { label: "Strategy Formulation", slug: "strategy-formulation" },
  { label: "Strategy Implementation", slug: "strategy-implementation" },
  { label: "Strategy Evaluation & Control", slug: "strategy-evaluation" },
  { label: "Corporate Governance", slug: "corporate-governance" },
  { label: "Competitive Strategies", slug: "competitive-strategies" },
];

const obTopicOptions = [
  { label: "Foundations of OB", slug: "foundations-of-ob" },
  { label: "Individual Behaviour", slug: "individual-behaviour" },
  { label: "Personality", slug: "personality" },
  { label: "Perception", slug: "perception" },
  { label: "Motivation", slug: "motivation" },
  { label: "Learning", slug: "learning" },
  { label: "Group Dynamics", slug: "group-dynamics" },
  { label: "Leadership", slug: "leadership" },
  { label: "Organizational Culture", slug: "organizational-culture" },
  { label: "Change Management", slug: "change-management" },
  { label: "Conflict & Stress", slug: "conflict-and-stress" },
];
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

    await supabase.from("notes").insert({ title, description, file_url, video_url, topic_slug: topicSlug || null, subject } as any);
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

  const getTopicLabel = (slug: string) => {
    const all = [...hrTopicOptions, ...englishTopicOptions, ...pomTopicOptions, ...obTopicOptions, ...smTopicOptions];
    return all.find(t => t.slug === slug)?.label || slug;
  };

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-foreground">Notes</h1>
      <div className="mb-8 space-y-3 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Upload New Note</h2>
        <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <select value={subject} onChange={e => { setSubject(e.target.value); setTopicSlug(""); }} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
          {subjectOptions.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select value={topicSlug} onChange={e => setTopicSlug(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
          <option value="">-- Select Topic (optional) --</option>
          {(subject === "english" ? englishTopicOptions : subject === "pom" ? pomTopicOptions : subject === "ob" ? obTopicOptions : subject === "sm" ? smTopicOptions : hrTopicOptions).map(t => (
            <option key={t.slug} value={t.slug}>{t.label}</option>
          ))}
        </select>
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
              {note.subject && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{note.subject === "english" ? "English" : note.subject === "pom" ? "POM" : note.subject === "ob" ? "OB" : "HRM"}</span>}
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
