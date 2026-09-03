import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { BookOpen, FileText, HelpCircle, MessageSquare, Mail, BookMarked, LayoutDashboard, Newspaper, LogOut, Video, Radio, Menu, X, GraduationCap, AlertTriangle, Megaphone, CalendarDays, ClipboardList, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const adminLinks = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  // Money first: the registration queue is the one screen that has to be
  // checked every day while payments are verified by hand.
  { label: "Registrations", to: "/admin/registrations", icon: ClipboardList },
  { label: "Programmes", to: "/admin/programmes", icon: CalendarDays },
  { label: "Payment Settings", to: "/admin/payment-settings", icon: Wallet },
  { label: "Blog Posts", to: "/admin/blogs", icon: BookOpen },
  { label: "Notes", to: "/admin/notes", icon: FileText },
  { label: "Lectures", to: "/admin/lectures", icon: Video },
  { label: "Live Lectures", to: "/admin/live-lectures", icon: Radio },
  { label: "Quizzes", to: "/admin/quizzes", icon: HelpCircle },
  { label: "Previous Year Questions", to: "/admin/pyq", icon: GraduationCap },
  { label: "Exam Info Cards", to: "/admin/exam-info", icon: Megaphone },
  { label: "Books", to: "/admin/books", icon: BookMarked },
  { label: "Comments", to: "/admin/comments", icon: MessageSquare },
  { label: "Subscribers", to: "/admin/subscribers", icon: Mail },
  { label: "Contact Messages", to: "/admin/contact-messages", icon: Mail },
  { label: "Newspaper", to: "/admin/newspaper", icon: Newspaper },
  { label: "Error Logs", to: "/admin/error-logs", icon: AlertTriangle },
];

const AdminLayout = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="space-y-1">
      {adminLinks.map((link) => {
        const active = location.pathname === link.to;
        return (
          <Link
            key={link.to}
            to={link.to}
            onClick={onNavigate}
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
  );

  return (
    <div className="min-h-screen bg-background md:flex">
      <Helmet>
        <title>Admin — Karn HR Academy</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-border bg-card p-4 md:hidden">
        <Link to="/" className="flex items-center gap-2 text-foreground">
          <BookOpen className="h-5 w-5 text-accent-deep" />
          <span className="text-sm font-bold">Admin Panel</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          className="rounded-md p-2 text-foreground hover:bg-muted"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile nav panel */}
      {mobileOpen && (
        <div className="border-b border-border bg-card p-4 md:hidden">
          <NavLinks onNavigate={() => setMobileOpen(false)} />
          <button
            onClick={() => supabase.auth.signOut()}
            className="mt-4 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card p-6 md:block">
        <Link to="/" className="mb-8 flex items-center gap-2 text-foreground">
          <BookOpen className="h-5 w-5 text-accent-deep" />
          <span className="text-sm font-bold">Admin Panel</span>
        </Link>
        <NavLinks />
        <button
          onClick={() => supabase.auth.signOut()}
          className="mt-8 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </aside>

      <main className="flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
