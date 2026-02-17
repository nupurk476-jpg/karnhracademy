import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const AdminDashboard = () => {
  const [counts, setCounts] = useState({ blogs: 0, notes: 0, quizzes: 0, books: 0, comments: 0, subscribers: 0 });

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
  }, []);

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
