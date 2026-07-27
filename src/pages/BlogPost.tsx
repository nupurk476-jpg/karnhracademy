import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DOMPurify from "dompurify";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useToast } from "@/hooks/use-toast";
import { useHoneypot } from "@/hooks/use-honeypot";
import { Share2, Linkedin, Twitter, Facebook, ArrowLeft } from "lucide-react";

const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { isBot, honeypotFieldProps } = useHoneypot();

  useEffect(() => {
    if (!slug) return;
    supabase.from("blog_posts").select("*").eq("slug", slug).eq("published", true).single().then(({ data }) => {
      setPost(data);
      if (data) {
        supabase.from("blog_comments").select("id, blog_post_id, name, content, approved, created_at").eq("blog_post_id", data.id).eq("approved", true).order("created_at", { ascending: true }).then(({ data: c }) => c && setComments(c));
      }
    });
  }, [slug]);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !name.trim() || !content.trim()) return;
    if (isBot()) {
      toast({ title: "Comment submitted", description: "Your comment will appear after approval." });
      setName(""); setEmail(""); setContent("");
      return;
    }
    setSubmitting(true);
    await supabase.from("blog_comments").insert({ blog_post_id: post.id, name: name.trim(), email: email.trim() || null, content: content.trim() });
    setSubmitting(false);
    toast({ title: "Comment submitted", description: "Your comment will appear after approval." });
    setName(""); setEmail(""); setContent("");
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  if (!post) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {post && (
        <SEO
          title={post.title}
          description={post.excerpt || (post.content || "").replace(/\s+/g, " ").slice(0, 160)}
          path={`/blogs/${post.slug}`}
          type="article"
          image={post.cover_image || undefined}
          jsonLd={{
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.excerpt || undefined,
            image: post.cover_image || undefined,
            author: { "@type": "Person", name: post.author_name },
            publisher: {
              "@type": "Organization",
              name: "Karn HR Academy",
              logo: { "@type": "ImageObject", url: "https://karnhracademy.com/og-image.png" },
            },
            datePublished: post.created_at,
            dateModified: post.updated_at || post.created_at,
            mainEntityOfPage: `https://karnhracademy.com/blogs/${post.slug}`,
          }}
        />
      )}
      <Header />
      <article className="mx-auto max-w-3xl px-6 py-16">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Blog", to: "/blogs" }, { label: post.title }]} />
        <Link to="/blogs" className="mb-6 inline-flex items-center gap-1 text-sm text-accent-deep hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Blogs
        </Link>
        <span className="mb-3 inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent-deep">{post.category}</span>
        <h1 className="mb-4 text-4xl font-bold text-foreground">{post.title}</h1>
        {post.cover_image && <img src={post.cover_image} alt={post.title} className="mb-6 w-full rounded-lg object-cover max-h-96" />}
        <div className="mb-8 flex items-center gap-3 text-sm text-muted-foreground">
          <span>By {post.author_name}</span>
          <span>·</span>
          <span>{new Date(post.created_at).toLocaleDateString()}</span>
        </div>

        {/* HTML blog posts (from publish-blog pipeline) get blog-content class;
            plain-text posts get simple prose-like styling */}
        {post.content?.trimStart().startsWith("<") ? (
          <div
            className="blog-content"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(post.content, {
                ADD_TAGS: ["details", "summary"],
                ADD_ATTR: ["open"],
              }),
            }}
          />
        ) : (
          <div
            className="prose prose-lg max-w-none text-foreground"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(post.content?.replace(/\n/g, "<br/>") ?? ""),
            }}
          />
        )}

        {/* Share */}
        <div className="mt-10 flex items-center gap-4 border-t border-border pt-6">
          <Share2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Share:</span>
          <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post.title)}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-accent-deep"><Twitter className="h-5 w-5" /></a>
          <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-accent-deep"><Linkedin className="h-5 w-5" /></a>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-accent-deep"><Facebook className="h-5 w-5" /></a>
        </div>

        {/* Comments */}
        <div className="mt-12">
          <h2 className="mb-6 text-2xl font-bold text-foreground">Comments</h2>
          {comments.length === 0 && <p className="mb-6 text-sm text-muted-foreground">No comments yet. Be the first!</p>}
          <div className="mb-8 space-y-4">
            {comments.map((c) => (
              <div key={c.id} className="rounded-lg border border-border bg-card p-4">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-muted-foreground">{c.content}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleComment} className="space-y-4 rounded-lg border border-border bg-card p-6">
            <h3 className="text-lg font-semibold text-foreground">Leave a Comment</h3>
            <input type="text" {...honeypotFieldProps} />
            <input type="text" required placeholder="Your name" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <input type="email" placeholder="Email (optional)" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <textarea required placeholder="Your comment" value={content} onChange={e => setContent(e.target.value)} className="min-h-[100px] w-full rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <button type="submit" disabled={submitting} className="rounded-md bg-accent px-6 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50">
              {submitting ? "Submitting..." : "Post Comment"}
            </button>
          </form>
        </div>
      </article>
      <Footer />
    </div>
  );
};

export default BlogPost;
