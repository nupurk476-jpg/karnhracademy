import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, FileUp } from "lucide-react";

const categories = ["HRM Basics", "Organizational Behaviour", "Research Methodology", "Ethical HRM", "Quiet Quitting", "General Studies", "Current Affairs"];

// ── HTML blog import logic (mirrors publish-blog.mjs) ────────────────────────
function parseHtmlBlog(html: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  function textOf(el: Element | null) {
    if (!el) return "";
    const clone = el.cloneNode(true) as Element;
    clone.querySelectorAll("br,p,div,h1,h2,h3,h4").forEach(b => {
      b.textContent = " " + b.textContent + " ";
    });
    return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
  }

  // Title
  const heroH1 = doc.querySelector(".hero h1");
  const title = heroH1
    ? textOf(heroH1)
    : (doc.querySelector("title")?.textContent ?? "").split("|")[0].replace(/\s+/g, " ").trim();

  // Author
  const heroMetaText = textOf(doc.querySelector(".hero-meta"));
  const authorMatch = heroMetaText.match(/[✍✏✐]\s*([^,|·\n]+)/);
  const author_name = authorMatch ? authorMatch[1].trim().replace(/MBA.*$/, "").trim() : "Nupur Karn";

  // Excerpt
  const excerpt = textOf(doc.querySelector(".hero-sub")).slice(0, 300);

  // Category
  const eyebrow = textOf(doc.querySelector(".hero-eyebrow"));
  const combined = (eyebrow + " " + heroMetaText).toLowerCase();
  let category = "HRM Basics";
  if (/organizational.behav|org.behav/i.test(combined))  category = "Organizational Behaviour";
  else if (/research.method/i.test(combined))             category = "Research Methodology";
  else if (/ethical.hrm|ethics/i.test(combined))         category = "Ethical HRM";
  else if (/quiet.quitting/i.test(combined))              category = "Quiet Quitting";
  else if (/current.affairs/i.test(combined))             category = "Current Affairs";
  else if (/general.studies/i.test(combined))             category = "General Studies";

  // Slug
  const slug = title
    .toLowerCase()
    .replace(/['''"":]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  // Transform accordions → <details>/<summary>
  doc.querySelectorAll(".acc-item").forEach(item => {
    const trigger = item.querySelector(".acc-trigger");
    const body = item.querySelector(".acc-body");
    if (!trigger || !body) return;
    trigger.querySelector(".acc-arrow")?.remove();
    const details = doc.createElement("details");
    details.className = "acc-item";
    const summary = doc.createElement("summary");
    summary.className = "acc-trigger";
    summary.innerHTML = trigger.innerHTML.trim();
    const bodyDiv = doc.createElement("div");
    bodyDiv.className = "acc-body";
    bodyDiv.innerHTML = body.innerHTML;
    details.appendChild(summary);
    details.appendChild(bodyDiv);
    item.replaceWith(details);
  });

  // Transform lifecycle tabs → stacked <details>
  doc.querySelectorAll(".lifecycle").forEach(lifecycle => {
    const tabs   = [...lifecycle.querySelectorAll(".lc-tab")];
    const panels = [...lifecycle.querySelectorAll(".lc-panel")];
    if (!panels.length) return;
    const newEl = doc.createElement("div");
    newEl.className = "lifecycle";
    panels.forEach((panel, i) => {
      const details = doc.createElement("details");
      details.className = "lc-stage";
      if (i === 0) details.setAttribute("open", "");
      const summary = doc.createElement("summary");
      summary.className = "lc-tab";
      summary.innerHTML = tabs[i] ? tabs[i].innerHTML : `<span class="lc-tab-label">Stage ${i + 1}</span>`;
      const content = doc.createElement("div");
      content.className = "lc-panel";
      content.innerHTML = panel.innerHTML;
      details.appendChild(summary);
      details.appendChild(content);
      newEl.appendChild(details);
    });
    lifecycle.replaceWith(newEl);
  });

  // Strip event handlers
  const eventAttrs = ["onclick","onchange","oninput","onsubmit","onkeyup","onkeydown","onfocus","onblur"];
  doc.querySelectorAll("*").forEach(el => eventAttrs.forEach(a => el.removeAttribute(a)));

  // Build content
  let content = "";
  const heroStats = doc.querySelector(".hero-stats");
  if (heroStats) content += heroStats.outerHTML + "\n";
  const contentEl = doc.querySelector(".content");
  if (contentEl) {
    content += contentEl.innerHTML.trim() + "\n";
  }
  const footerEl = doc.querySelector(".footer");
  if (footerEl) {
    content += `<div class="blog-footer">\n${footerEl.innerHTML.trim()}\n</div>\n`;
  }
  content = content.replace(/<!--[\s\S]*?-->/g, "").replace(/\n{3,}/g, "\n\n").trim();

  return { title, slug, excerpt, content, category, author_name };
}

// ─────────────────────────────────────────────────────────────────────────────

const AdminBlogs = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: "", slug: "", excerpt: "", content: "", category: categories[0], author_name: "HR Research Hub", published: false, cover_image: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const htmlInputRef = useRef<HTMLInputElement>(null);
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

  const handleHtmlImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const html = ev.target?.result as string;
        const parsed = parseHtmlBlog(html);
        setForm(prev => ({
          ...prev,
          title: parsed.title,
          slug: parsed.slug,
          excerpt: parsed.excerpt,
          content: parsed.content,
          category: parsed.category,
          author_name: parsed.author_name,
        }));
        toast({ title: "HTML imported", description: "Review the fields below, then click Create." });
      } catch {
        toast({ title: "Import failed", description: "Could not parse the HTML file.", variant: "destructive" });
      } finally {
        setImporting(false);
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{editing ? "Edit Post" : "New Post"}</h2>

          {/* HTML Import button */}
          {!editing && (
            <div>
              <input
                ref={htmlInputRef}
                type="file"
                accept=".html,text/html"
                className="hidden"
                onChange={handleHtmlImport}
              />
              <button
                onClick={() => htmlInputRef.current?.click()}
                disabled={importing}
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
              >
                <FileUp className="h-4 w-4" />
                {importing ? "Importing…" : "Import from HTML"}
              </button>
            </div>
          )}
        </div>

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
