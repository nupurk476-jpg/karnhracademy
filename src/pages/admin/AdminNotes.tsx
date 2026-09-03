import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Upload, Video, Pencil, X } from "lucide-react";
import { DISCIPLINES, getDiscipline, getTopicLabel } from "@/lib/disciplines";
import { LW_UNITS, getUnitForTopicSlug, resolveLWTopicSlug, unitRoman } from "@/lib/labourWelfareUnits";
import { useConfirm } from "@/hooks/use-confirm";
import { watermarkPdf } from "@/lib/watermarkPdf";
import { getSignedFileUrl } from "@/lib/signedFileUrl";

const AdminNotes = () => {
  const [notes, setNotes] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topicSlug, setTopicSlug] = useState("");
  const [subject, setSubject] = useState("hrm");
  const [tagsInput, setTagsInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  // Existing attachments while editing; null = removed by the admin.
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);
  const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const load = () => {
    supabase.from("notes").select("*").order("created_at", { ascending: false }).then(({ data, error }) => {
      if (error) { toast({ title: "Failed to load notes", description: error.message, variant: "destructive" }); return; }
      if (data) setNotes(data);
    });
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle(""); setDescription(""); setFile(null); setVideoFile(null);
    setTopicSlug(""); setSubject("hrm"); setTagsInput("");
    setExistingFileUrl(null); setExistingVideoUrl(null);
  };

  const startEdit = (note: any) => {
    setEditingId(note.id);
    setTitle(note.title ?? "");
    setDescription(note.description ?? "");
    setSubject(note.subject ?? "hrm");
    // Legacy Labour Welfare slugs resolve to their current topic so the right
    // chip is preselected — saving then migrates the row to the new slug.
    setTopicSlug(resolveLWTopicSlug(note.topic_slug ?? ""));
    setTagsInput((note.tags ?? []).join(", "));
    setExistingFileUrl(note.file_url ?? null);
    setExistingVideoUrl(note.video_url ?? null);
    setFile(null); setVideoFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const uploadFile = async (bucket: string, f: File) => {
    const ext = f.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, f);
    if (error) throw new Error(error.message);
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };

  const handleSave = async () => {
    if (!title) return;
    setUploading(true);
    try {
      // New uploads replace whatever was there; otherwise keep (or drop) the existing URLs.
      let file_url: string | null = existingFileUrl;
      let video_url: string | null = existingVideoUrl;
      if (file) file_url = await uploadFile("notes", await watermarkPdf(file));
      if (videoFile) video_url = await uploadFile("note-videos", videoFile);

      const tags = tagsInput.split(",").map(t => t.trim()).filter(Boolean);
      const row: any = { title, description, file_url, video_url, topic_slug: topicSlug || null, subject, tags };
      if (file) row.file_size = file.size;          // record size for new uploads
      else if (!file_url) row.file_size = null;      // attachment removed
      const write = (r: any) => editingId
        ? supabase.from("notes").update(r as any).eq("id", editingId)
        : supabase.from("notes").insert(r as any);
      let { error } = await write(row);
      // file_size/tags don't exist until the pending DB update runs — retry without them.
      if (error && (error.code === "PGRST204" || /schema cache/i.test(error.message || ""))) {
        const { file_size: _fs, tags: _tags, ...legacy } = row;
        ({ error } = await write(legacy));
      }
      if (error) throw new Error(error.message);

      toast({ title: editingId ? "Note updated" : "Note created" });
      resetForm();
      load();
    } catch (err: any) {
      toast({ title: editingId ? "Failed to update note" : "Failed to save note", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const ok = await confirm({ title: `Delete "${title}"?`, description: "This cannot be undone." });
    if (!ok) return;
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) { toast({ title: "Failed to delete note", description: error.message, variant: "destructive" }); return; }
    if (editingId === id) resetForm();
    toast({ title: "Note deleted" });
    load();
  };

  const activeDiscipline = getDiscipline(subject);
  const topics = activeDiscipline ? [...activeDiscipline.topics] : [];
  const fileName = (url: string) => decodeURIComponent(url.split("/").pop() || "").slice(0, 40);

  const term = search.trim().toLowerCase();
  const filteredNotes = notes.filter(n => {
    if (!term) return true;
    const haystack = [n.title, n.description, getTopicLabel(n.topic_slug), ...(n.tags ?? [])]
      .filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(term);
  });

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-foreground">Notes</h1>
      <div className={`mb-8 space-y-4 rounded-lg border bg-card p-6 ${editingId ? "border-accent" : "border-border"}`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">{editingId ? "Edit Note" : "Upload New Note"}</h2>
          {editingId && (
            <button onClick={resetForm} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">
              <X className="h-3.5 w-3.5" /> Cancel Edit
            </button>
          )}
        </div>
        <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input placeholder="Tags (comma-separated, e.g. wage act, factories act, exam-important)" value={tagsInput} onChange={e => setTagsInput(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />

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

        {/* Topic chips — for Labour Welfare, grouped by unit so the admin can
            see exactly which unit of the public hub a topic files the note
            under; the flat list gave no way to tell. */}
        {topics.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {subject === "lw" ? "Unit & Topic" : "Topic (optional)"}
            </p>
            <div className="mb-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTopicSlug("")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  topicSlug === "" ? "bg-accent text-accent-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                All Topics
              </button>
            </div>
            {subject === "lw" && topicSlug === "" && (
              <p className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Without a unit topic, this note will NOT appear under any unit on the public Labour
                Welfare hub — it will be listed in a separate "Not yet assigned to a unit" section.
                Pick the topic below that matches the note.
              </p>
            )}
            {subject === "lw" ? (
              <div className="space-y-3">
                {LW_UNITS.map(u => (
                  <div key={u.number}>
                    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-accent-deep">
                      Unit {unitRoman(u.number)} · {u.title}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {u.topics.map(t => (
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
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
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
            )}
          </div>
        )}

        {/* PDF/PPT attachment */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted">
            <Upload className="h-4 w-4" />
            {file ? file.name : existingFileUrl ? "Replace PDF / PPT" : "Choose PDF / PPT"}
            <input type="file" accept=".pdf,.ppt,.pptx" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
          </label>
          {!file && existingFileUrl && (
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              Current:{" "}
              <a
                href={existingFileUrl}
                onClick={async (e) => {
                  e.preventDefault();
                  const url = await getSignedFileUrl(existingFileUrl, "notes");
                  if (url) window.open(url, "_blank", "noopener,noreferrer");
                }}
                className="cursor-pointer text-accent-deep hover:underline"
              >
                {fileName(existingFileUrl)}
              </a>
              <button type="button" onClick={() => setExistingFileUrl(null)} className="text-muted-foreground hover:text-destructive" aria-label="Remove attached file">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
        </div>

        {/* Video attachment */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted">
            <Video className="h-4 w-4" />
            {videoFile ? videoFile.name : existingVideoUrl ? "Replace Video" : "Choose Video (MP4, MOV, WebM)"}
            <input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files?.[0] || null)} className="hidden" />
          </label>
          {!videoFile && existingVideoUrl && (
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              Current: <a href={existingVideoUrl} target="_blank" rel="noopener noreferrer" className="text-accent-deep hover:underline">{fileName(existingVideoUrl)}</a>
              <button type="button" onClick={() => setExistingVideoUrl(null)} className="text-muted-foreground hover:text-destructive" aria-label="Remove attached video">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
        </div>

        <button onClick={handleSave} disabled={uploading || !title} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50">
          {uploading ? (editingId ? "Saving..." : "Uploading...") : editingId ? "Save Changes" : "Create Note"}
        </button>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <input
          type="text"
          placeholder="Search notes by title, description, or tag..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <span className="shrink-0 text-xs text-muted-foreground">{filteredNotes.length} of {notes.length}</span>
      </div>

      <div className="space-y-2">
        {filteredNotes.length === 0 && notes.length > 0 && (
          <p className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">No notes match "{search}".</p>
        )}
        {filteredNotes.map((note) => (
          <div key={note.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-4 py-3 ${editingId === note.id ? "border-accent" : "border-border"}`}>
            <div className="min-w-0">
              <span className="font-medium text-foreground">{note.title}</span>
              {note.subject && (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {getDiscipline(note.subject)?.short ?? note.subject.toUpperCase()}
                </span>
              )}
              {/* Labour Welfare notes: show which hub unit this note files under —
                  or an explicit warning when it maps to none, which is exactly the
                  case that used to silently vanish from the public unit lists. */}
              {note.subject === "lw" && (() => {
                const unit = getUnitForTopicSlug(note.topic_slug);
                return unit ? (
                  <span className="ml-2 rounded-full bg-[#E9EEF5] px-2 py-0.5 text-xs font-semibold text-[#0E1B33]">
                    Unit {unitRoman(unit.number)}
                  </span>
                ) : (
                  <span className="ml-2 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    No unit — pick a topic
                  </span>
                );
              })()}
              {note.topic_slug && <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent-deep">{getTopicLabel(note.topic_slug)}</span>}
              {note.file_url && <span className="ml-2 text-xs text-muted-foreground">{note.file_url.match(/\.pptx?$/i) ? "PPT" : "PDF"}</span>}
              {note.video_url && <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent-deep">VIDEO</span>}
              {(note.tags ?? []).map((tag: string) => (
                <span key={tag} className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">#{tag}</span>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button onClick={() => startEdit(note)} className="text-muted-foreground hover:text-accent-deep" aria-label={`Edit ${note.title}`}>
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => handleDelete(note.id, note.title)} className="text-muted-foreground hover:text-destructive" aria-label={`Delete ${note.title}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog />
    </div>
  );
};

export default AdminNotes;
