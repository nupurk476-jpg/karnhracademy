import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminDashboard = () => {
  const [counts, setCounts] = useState({ blogs: 0, notes: 0, quizzes: 0, books: 0, comments: 0, subscribers: 0 });
  const [educatorUrl, setEducatorUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      supabase.from("blog_posts").select("id", { count: "exact", head: true }),
      supabase.from("notes").select("id", { count: "exact", head: true }),
      supabase.from("quizzes").select("id", { count: "exact", head: true }),
      supabase.from("book_recommendations").select("id", { count: "exact", head: true }),
      supabase.from("blog_comments").select("id", { count: "exact", head: true }),
      supabase.from("email_subscribers").select("id", { count: "exact", head: true }),
    ]).then(([b, n, q, bk, c, s]) => {
      setCounts({
        blogs: b.count || 0, notes: n.count || 0, quizzes: q.count || 0,
        books: bk.count || 0, comments: c.count || 0, subscribers: s.count || 0,
      });
    });
    loadEducatorImage();
  }, []);

  const loadEducatorImage = () => {
    const { data } = supabase.storage.from("educator").getPublicUrl("profile.jpg");
    // Check if the image actually exists by trying to fetch it
    fetch(data.publicUrl, { method: "HEAD" }).then((res) => {
      if (res.ok) setEducatorUrl(data.publicUrl + "?t=" + Date.now());
      else setEducatorUrl(null);
    }).catch(() => setEducatorUrl(null));
  };

  const handleUploadEducator = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    // Remove old file first (upsert)
    await supabase.storage.from("educator").remove(["profile.jpg"]);
    const { error } = await supabase.storage.from("educator").upload("profile.jpg", file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Educator image updated" });
      loadEducatorImage();
    }
    setUploading(false);
  };

  const handleRemoveEducator = async () => {
    await supabase.storage.from("educator").remove(["profile.jpg"]);
    setEducatorUrl(null);
    toast({ title: "Educator image removed" });
  };

  const stats = [
    { label: "Blog Posts", value: counts.blogs },
    { label: "Notes", value: counts.notes },
    { label: "Quizzes", value: counts.quizzes },
    { label: "Books", value: counts.books },
    { label: "Comments", value: counts.comments },
    { label: "Subscribers", value: counts.subscribers },
  ];

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-foreground">Dashboard</h1>

      {/* Educator Image Upload */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Educator Image</h2>
        <div className="flex items-center gap-6">
          <div className="h-32 w-32 shrink-0 overflow-hidden rounded-2xl bg-primary/10 flex items-center justify-center">
            {educatorUrl ? (
              <img src={educatorUrl} alt="Educator" className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-primary/20">HR</span>
            )}
          </div>
          <div className="space-y-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted">
              <Upload className="h-4 w-4" /> {uploading ? "Uploading..." : "Upload Image"}
              <input type="file" accept="image/*" onChange={handleUploadEducator} className="hidden" disabled={uploading} />
            </label>
            {educatorUrl && (
              <button onClick={handleRemoveEducator} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" /> Remove
              </button>
            )}
            <p className="text-xs text-muted-foreground">This image appears on the homepage About section.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="text-3xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
