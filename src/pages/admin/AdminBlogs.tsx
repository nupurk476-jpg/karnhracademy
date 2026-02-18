import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

const categories = ["HRM Basics", "Organizational Behaviour", "Research Methodology", "Ethical HRM", "Quiet Quitting"];

const AdminBlogs = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: "", slug: "", excerpt: "", content: "", category: categories[0], author_name: "HR Research Hub", published: false, cover_image: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const load = () => {
    supabase.from("blog_posts").select("*").order("created_at", { ascending: false }).then(({ data }) => data && setPosts(data));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setEditing(null);
    setForm({ title: "", slug: "", excerpt: "", content: "", category: categories[0], author_name: "HR Research Hub", published: false, cover_image: "" });
    setImageFile(null);
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
      await supabase.from("blog_posts").update(data).eq("id", editing.id);
      toast({ title: "Post updated" });
    } else {
      await supabase.from("blog_posts").insert(data);
      toast({ title: "Post created" });
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

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-foreground">Blog Posts</h1>

      {/* Form */}
      <div className="mb-8 space-y-3 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">{editing ? "Edit Post" : "New Post"}</h2>
        <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input placeholder="Slug (auto-generated if empty)" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input placeholder="Excerpt" value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <textarea placeholder="Content" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={8} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input placeholder="Author Name" value={form.author_name} onChange={e => setForm({ ...form, author_name: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Cover Image</label>
          {form.cover_image && <img src={form.cover_image} alt="Cover" className="mb-2 h-32 w-auto rounded-md object-cover" />}
          <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} className="text-sm text-muted-foreground" />
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={form.published} onChange={e => setForm({ ...form, published: e.target.checked })} />
          Published
        </label>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={uploading} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50">
            {uploading ? "Uploading..." : editing ? "Update" : "Create"}
          </button>
          {editing && <button onClick={resetForm} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted">Cancel</button>}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {posts.map((post) => (
          <div key={post.id} className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
            <div>
              <span className="font-medium text-foreground">{post.title}</span>
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${post.published ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>
                {post.published ? "Published" : "Draft"}
              </span>
            </div>
            <div className="flex gap-2">
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
