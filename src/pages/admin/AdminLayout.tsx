import { Link, Outlet, useLocation } from "react-router-dom";
import { BookOpen, FileText, HelpCircle, MessageSquare, Mail, BookMarked, LayoutDashboard, Newspaper, LogOut, Video, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const adminLinks = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "Blog Posts", to: "/admin/blogs", icon: BookOpen },
  { label: "Notes", to: "/admin/notes", icon: FileText },
  { label: "Lectures", to: "/admin/lectures", icon: Video },
  { label: "Live Lectures", to: "/admin/live-lectures", icon: Radio },
  { label: "Quizzes", to: "/admin/quizzes", icon: HelpCircle },
  { label: "Books", to: "/admin/books", icon: BookMarked },
  { label: "Comments", to: "/admin/comments", icon: MessageSquare },
  { label: "Subscribers", to: "/admin/subscribers", icon: Mail },
  { label: "Contact Messages", to: "/admin/contact-messages", icon: Mail },
  { label: "Newspaper", to: "/admin/newspaper", icon: Newspaper },
];

const AdminLayout = () => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 shrink-0 border-r border-border bg-card p-6">
        <Link to="/" className="mb-8 flex items-center gap-2 text-foreground">
          <BookOpen className="h-5 w-5 text-accent" />
          <span className="text-sm font-bold">Admin Panel</span>
        </Link>
        <nav className="space-y-1">
          {adminLinks.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={() => supabase.auth.signOut()}
          className="mt-8 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
