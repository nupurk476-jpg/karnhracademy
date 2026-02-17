import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const categories = ["All", "HRM Basics", "Organizational Behaviour", "Research Methodology", "Ethical HRM", "Quiet Quitting"];

const BlogList = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [category, setCategory] = useState("All");

  useEffect(() => {
    const q = supabase.from("blog_posts").select("*").eq("published", true).order("created_at", { ascending: false });
    if (category !== "All") {
      q.eq("category", category).then(({ data }) => data && setPosts(data));
    } else {
      q.then(({ data }) => data && setPosts(data));
    }
  }, [category]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="mb-2 text-4xl font-bold text-foreground">Blog</h1>
        <p className="mb-8 text-muted-foreground">Insights on HR, management, and academic research.</p>

        <div className="mb-8 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                category === cat
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {posts.length === 0 ? (
          <p className="text-muted-foreground">No posts found.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link key={post.id} to={`/blogs/${post.slug}`} className="group rounded-lg border border-border bg-card p-6 transition-shadow hover:shadow-md">
                <span className="mb-2 inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">{post.category}</span>
                <h2 className="mb-2 text-xl font-semibold text-foreground group-hover:text-accent">{post.title}</h2>
                <p className="mb-3 text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{post.author_name}</span>
                  <span>·</span>
                  <span>{new Date(post.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default BlogList;
