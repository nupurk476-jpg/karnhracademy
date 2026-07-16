import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, FileUp } from "lucide-react";
import { generateCoverImage } from "@/lib/blogCover";
import { parseHtmlBlog } from "@/lib/blogImport";

const categories = ["HRM Basics", "Organisational Behaviour", "Research Methodology", "Ethical HRM", "Quiet Quitting", "General Studies", "Current Affairs"];

const AdminBlogs = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: "", slug: "", excerpt: "", content: "", category: categories[0], author_name: "Nupur Karn", published: false, cover_image: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStage, setImportStage] = useState<"" | "parsing" | "cover" | "publishing">("");
  const [publishImmediately, setPublishImmediately] = useState(true);
  const htmlInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const load = () => {
    supabase.from("blog_posts").select("*").order("created_at", { ascending: false }).then(({ data }) => data && setPosts(data));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setEditing(null);
    setForm({ title: "", slug: "", excerpt: "", content: "", category: categories[0], author_name: "Nupur Karn", published: false, cover_image: "" });
    setImageFile(null);
  };

  const handleHtmlImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportStage("parsing");
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const html = ev.target?.result as string;
        const parsed = parseHtmlBlog(html);

        // Auto-generate the cover from the hero banner (or a branded
        // fallback) — these HTML articles never contain a separate photo.
        setImportStage("cover");
        let cover_image = "";
        try {
          const blob = await generateCoverImage(parsed);
          const path = `${parsed.slug}-cover-${Date.now()}.png`;
          const { error: uploadError } = await supabase.storage.from("blog-images").upload(path, blob, { contentType: "image/png" });
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage.from("blog-images").getPublicUrl(path);
          cover_image = urlData.publicUrl;
        } catch (coverErr) {
          console.error("Cover generation failed:", coverErr);
        }

        const postData = {
          title: parsed.title,
          slug: parsed.slug,
          excerpt: parsed.excerpt,
          content: parsed.content,
          category: parsed.category,
          author_name: parsed.author_name,
          cover_image,
        };

        if (publishImmediately) {
          setImportStage("publishing");
          const { error } = await supabase.from("blog_posts").insert({ ...postData, published: true });
          if (error) {
            // Most likely a duplicate slug — don't lose the parsed work,
            // drop it into the form as a draft so it can be fixed and saved.
            setForm(prev => ({ ...prev, ...postData, published: false }));
            toast({ title: "Couldn't auto-publish", description: `${error.message} — review the fields below, then save.`, variant: "destructive" });
          } else {
            toast({ title: "Published!", description: `"${parsed.title}" is now live at /blogs/${parsed.slug}.` });
            resetForm();
            load();
          }
        } else {
          setForm(prev => ({ ...prev, ...postData, published: false }));
          toast({ title: "HTML imported", description: "Review the fields below, then click Create." });
        }
      } catch {
        toast({ title: "Import failed", description: "Could not parse the HTML file.", variant: "destructive" });
      } finally {
        setImporting(false);
        setImportStage("");
        // Reset the file input so the same file can be re-imported if needed
        if (htmlInputRef.current) htmlInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    if (!form.title || !form.content) return;
    setUploading(true);
    const slug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    let cover_image = form.cover_image;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `${slug}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("blog-images").upload(path, imageFile);
      if (!error) {
        const { data: urlData } = supabase.storage.from("blog-images").getPublicUrl(path);
        cover_image = urlData.publicUrl;
      }
    }
    const data = { ...form, slug, cover_image };
    if (editing) {
      const { error } = await supabase.from("blog_posts").update(data).eq("id", editing.id);
      if (error) {
        toast({ title: "Update failed", description: error.message, variant: "destructive" });
        setUploading(false);
        return;
      }
      toast({ title: "Post updated", description: data.published ? "Post is live." : "Saved as draft." });
    } else {
      const { error } = await supabase.from("blog_posts").insert(data);
      if (error) {
        toast({ title: "Create failed", description: error.message, variant: "destructive" });
        setUploading(false);
        return;
      }
      toast({ title: "Post created", description: data.published ? "Post is live." : "Saved as draft — toggle Published to go live." });
    }
    setUploading(false);
    resetForm();
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("blog_posts").delete().eq("id", id);
    toast({ title: "Post deleted" });
    load();
  };

  const startEdit = (post: any) => {
    setEditing(post);
    setForm({ title: post.title, slug: post.slug, excerpt: post.excerpt || "", content: post.content, category: post.category, author_name: post.author_name, published: post.published, cover_image: post.cover_image || "" });
    setImageFile(null);
  };

  const term = search.trim().toLowerCase();
  const filteredPosts = posts.filter(p =>
    !term || p.title?.toLowerCase().includes(term) || p.category?.toLowerCase().includes(term)
  );

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-foreground">Blog Posts</h1>

      {/* Form */}
      <div className="mb-8 space-y-3 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{editing ? "Edit Post" : "New Post"}</h2>

          {/* HTML Import button */}
          {!editing && (
            <div className="text-right">
              <input
                ref={htmlInputRef}
                type="file"
                accept=".html,text/html"
                className="hidden"
                onChange={handleHtmlImport}
              />
              <div className="flex items-center justify-end gap-3">
                <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={publishImmediately}
                    onChange={e => setPublishImmediately(e.target.checked)}
                    className="h-3.5 w-3.5 accent-green-600"
                  />
                  Publish immediately
                </label>
                <button
                  onClick={() => htmlInputRef.current?.click()}
                  disabled={importing}
                  className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50"
                >
                  <FileUp className="h-4 w-4" />
                  {importStage === "publishing" ? "Publishing…" : importStage === "cover" ? "Generating cover…" : importing ? "Reading…" : "Upload HTML"}
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {publishImmediately
                  ? "Pick a file and it goes live automatically — title, excerpt, content, category & cover are all extracted for you."
                  : "Title, excerpt, content, category & cover image are all extracted automatically. Review below, then click Create."}
              </p>
            </div>
          )}
        </div>

        {/* Published toggle — prominent, at the top so it's never missed */}
        <label className={`flex items-center gap-3 rounded-md border px-4 py-2.5 cursor-pointer select-none transition-colors ${form.published ? "border-green-400 bg-green-50 text-green-800" : "border-border bg-muted text-muted-foreground"}`}>
          <input type="checkbox" checked={form.published} onChange={e => setForm({ ...form, published: e.target.checked })} className="h-4 w-4 accent-green-600" />
          <span className="text-sm font-medium">{form.published ? "✓ Published — will be visible on the site" : "Draft — not visible on the site"}</span>
        </label>

        <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input placeholder="Slug (auto-generated if empty)" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input placeholder="Excerpt" value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <textarea placeholder="Content" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={8} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono text-xs" />
        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input placeholder="Author Name" value={form.author_name} onChange={e => setForm({ ...form, author_name: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Cover Image</label>
          {form.cover_image && <img src={form.cover_image} alt="Cover" className="mb-2 h-32 w-auto rounded-md object-cover" />}
          <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} className="text-sm text-muted-foreground" />
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={uploading} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50">
            {uploading ? "Saving..." : editing ? "Update" : form.published ? "Publish" : "Save as Draft"}
          </button>
          {editing && <button onClick={resetForm} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted">Cancel</button>}
        </div>
      </div>

      {/* List */}
      {posts.length > 0 && (
        <input
          type="text"
          placeholder="Search posts by title or category..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-3 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      )}
      <div className="space-y-2">
        {posts.length > 0 && filteredPosts.length === 0 && (
          <p className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">No posts match "{search}".</p>
        )}
        {filteredPosts.map((post) => (
          <div key={post.id} className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
            <div className="flex-1 min-w-0 mr-4">
              <span className="font-medium text-foreground">{post.title}</span>
              <span className="ml-2 text-xs text-muted-foreground">{post.category}</span>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Quick publish toggle */}
              <button
                onClick={async () => {
                  const { error } = await supabase.from("blog_posts").update({ published: !post.published }).eq("id", post.id);
                  if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
                  else toast({ title: post.published ? "Set to draft" : "Published!" });
                  load();
                }}
                className={`rounded-full px-3 py-0.5 text-xs font-medium transition-colors ${post.published ? "bg-green-100 text-green-800 hover:bg-red-100 hover:text-red-700" : "bg-muted text-muted-foreground hover:bg-green-100 hover:text-green-800"}`}
                title={post.published ? "Click to unpublish" : "Click to publish"}
              >
                {post.published ? "Published" : "Draft"}
              </button>
              <button onClick={() => startEdit(post)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => handleDelete(post.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminBlogs;
