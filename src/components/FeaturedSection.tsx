import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, FileText, HelpCircle } from "lucide-react";

const FeaturedSection = () => {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("blog_posts").select("id,title,slug,excerpt,category,created_at").eq("published", true).order("created_at", { ascending: false }).limit(3).then(({ data }) => data && setBlogs(data));
    supabase.from("notes").select("id,title,description").order("created_at", { ascending: false }).limit(3).then(({ data }) => data && setNotes(data));
    supabase.from("quizzes").select("id,title,topic").order("created_at", { ascending: false }).limit(3).then(({ data }) => data && setQuizzes(data));
  }, []);

  return (
    <div className="space-y-20">
      {/* Featured Blogs */}
      <section className="bg-background px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm font-semibold uppercase tracking-[0.15em] text-accent">Latest</p>
              <h2 className="text-3xl font-bold text-foreground">Featured Blog Posts</h2>
            </div>
            <Link to="/blogs" className="hidden items-center gap-1 text-sm font-medium text-accent hover:underline sm:flex">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {blogs.length === 0 ? (
            <p className="text-muted-foreground">No blog posts yet. Check back soon!</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {blogs.map((post) => (
                <Link key={post.id} to={`/blogs/${post.slug}`} className="group rounded-lg border border-border bg-card p-6 transition-shadow hover:shadow-md">
                  <span className="mb-2 inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">{post.category}</span>
                  <h3 className="mb-2 text-lg font-semibold text-foreground group-hover:text-accent">{post.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Notes */}
      <section className="bg-muted px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm font-semibold uppercase tracking-[0.15em] text-accent">Study Material</p>
              <h2 className="text-3xl font-bold text-foreground">Featured Notes</h2>
            </div>
            <Link to="/notes" className="hidden items-center gap-1 text-sm font-medium text-accent hover:underline sm:flex">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {notes.length === 0 ? (
            <p className="text-muted-foreground">No notes available yet.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {notes.map((note) => (
                <div key={note.id} className="rounded-lg border border-border bg-card p-6">
                  <FileText className="mb-3 h-8 w-8 text-accent" />
                  <h3 className="mb-2 text-lg font-semibold text-foreground">{note.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{note.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Quizzes */}
      <section className="bg-background px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm font-semibold uppercase tracking-[0.15em] text-accent">Test Yourself</p>
              <h2 className="text-3xl font-bold text-foreground">Featured Quizzes</h2>
            </div>
            <Link to="/quizzes" className="hidden items-center gap-1 text-sm font-medium text-accent hover:underline sm:flex">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {quizzes.length === 0 ? (
            <p className="text-muted-foreground">No quizzes available yet.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {quizzes.map((quiz) => (
                <Link key={quiz.id} to={`/quizzes/${quiz.id}`} className="group rounded-lg border border-border bg-card p-6 transition-shadow hover:shadow-md">
                  <HelpCircle className="mb-3 h-8 w-8 text-accent" />
                  <h3 className="mb-2 text-lg font-semibold text-foreground group-hover:text-accent">{quiz.title}</h3>
                  <span className="text-sm text-muted-foreground">{quiz.topic}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default FeaturedSection;
