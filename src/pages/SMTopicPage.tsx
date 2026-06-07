import { useParams, Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { smTopics } from "@/components/StrategicManagementSection";
import { ArrowLeft, FileText, Upload, Trash2, Loader2, FileSpreadsheet, Presentation } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const fileIcon = (type: string) => {
  if (type === "ppt" || type === "pptx") return <Presentation className="h-8 w-8 text-orange-500" />;
  if (type === "doc" || type === "docx") return <FileSpreadsheet className="h-8 w-8 text-blue-500" />;
  return <FileText className="h-8 w-8 text-red-500" />;
};

const SMTopicPage = () => {
  const { slug } = useParams();
  const topic = smTopics.find((t) => t.slug === slug);
  const prefixedSlug = slug ? `sm-${slug}` : "";
  const [resources, setResources] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadResources = async () => {
    if (!prefixedSlug) return;
    const { data } = await supabase.from("hr_resources").select("*").eq("topic_slug", prefixedSlug).order("created_at", { ascending: false });
    if (data) setResources(data);
  };

  useEffect(() => { loadResources(); }, [slug]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
        if (data && data.length > 0) setIsAdmin(true);
      }
    })();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !prefixedSlug) return;
    const allowed = [".pdf", ".ppt", ".pptx", ".doc", ".docx"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowed.includes(ext)) {
      toast({ title: "Unsupported file type", description: "Upload PDF, PPT, or DOC files.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const fileName = `${prefixedSlug}/${crypto.randomUUID()}${ext}`;
      const { error: uploadError } = await supabase.storage.from("hr-resources").upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("hr-resources").getPublicUrl(fileName);
      const { error: dbError } = await supabase.from("hr_resources").insert({
        topic_slug: prefixedSlug,
        title: file.name.replace(ext, ""),
        file_url: urlData.publicUrl,
        file_type: ext.replace(".", ""),
      });
      if (dbError) throw dbError;
      toast({ title: "File uploaded successfully" });
      await loadResources();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (resource: any) => {
    const urlParts = resource.file_url.split("/hr-resources/");
    const filePath = urlParts[urlParts.length - 1];
    await supabase.storage.from("hr-resources").remove([filePath]);
    await supabase.from("hr_resources").delete().eq("id", resource.id);
    setResources((prev) => prev.filter((r) => r.id !== resource.id));
    toast({ title: "File deleted" });
  };

  if (!topic) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="py-20 text-center text-muted-foreground">Topic not found.</div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title={topic.label} description={topic.desc} path={`/sm/${topic.slug}`} />
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <Link to="/#sm" className="mb-6 inline-flex items-center gap-1 text-sm text-accent hover:underline">
          <ArrowLeft className="h-4 w-4" /> All Strategic Management Topics
        </Link>
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <topic.icon className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              {topic.label}
            </h1>
            <p className="mt-1 text-muted-foreground">{topic.desc}</p>
          </div>
        </div>

        {isAdmin && (
          <div className="mb-6">
            <input type="file" accept=".pdf,.ppt,.pptx,.doc,.docx" ref={fileInputRef} onChange={handleUpload} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Uploading..." : "Upload File (PDF, DOC, PPT)"}
            </button>
          </div>
        )}

        {resources.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-muted-foreground">
            <p>No resources uploaded for <strong className="text-foreground">{topic.label}</strong> yet. Check back later.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {resources.map((res) => (
              <div key={res.id} className="group flex items-center gap-4 rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-md">
                {fileIcon(res.file_type)}
                <div className="min-w-0 flex-1">
                  <a href={res.file_url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-semibold text-foreground hover:text-accent">
                    {res.title}
                  </a>
                  <span className="text-xs uppercase text-muted-foreground">{res.file_type}</span>
                </div>
                {isAdmin && (
                  <button onClick={() => handleDelete(res)} className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default SMTopicPage;
