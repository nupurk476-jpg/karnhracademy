import { BookOpen, Menu, X, ChevronDown, LogIn, UserPlus, LogOut, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { hrTopics } from "@/components/HRTopicsSection";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hrOpen, setHrOpen] = useState(false);
  const [mobileHrOpen, setMobileHrOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setHrOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navItems = [
    { label: "Home", to: "/" },
    { label: "Blogs", to: "/blogs" },
    { label: "Notes", to: "/notes" },
    { label: "Quizzes", to: "/quizzes" },
    { label: "Books", to: "/books" },
    { label: "Newspaper", to: "/newspaper" },
    { label: "About", to: "/about" },
    { label: "Contact", to: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-accent" />
          <div>
            <span className="text-lg font-semibold tracking-tight text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              HR & Management
            </span>
            <span className="block text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Research Hub
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {/* HR Dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setHrOpen(!hrOpen)}
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Human Resource <ChevronDown className={`h-3.5 w-3.5 transition-transform ${hrOpen ? "rotate-180" : ""}`} />
            </button>
            {hrOpen && (
              <div className="absolute left-1/2 top-full mt-2 w-72 -translate-x-1/2 rounded-lg border border-border bg-card p-2 shadow-xl">
                {hrTopics.map((topic) => (
                  <Link
                    key={topic.slug}
                    to={`/hr/${topic.slug}`}
                    onClick={() => setHrOpen(false)}
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <topic.icon className="h-4 w-4 shrink-0 text-accent" />
                    {topic.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          className="text-foreground lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <nav className="border-t border-border bg-card px-6 py-4 lg:hidden">
          {/* Mobile HR Dropdown */}
          <button
            onClick={() => setMobileHrOpen(!mobileHrOpen)}
            className="flex w-full items-center justify-between py-2 text-sm font-medium text-muted-foreground"
          >
            Human Resource <ChevronDown className={`h-3.5 w-3.5 transition-transform ${mobileHrOpen ? "rotate-180" : ""}`} />
          </button>
          {mobileHrOpen && (
            <div className="mb-2 ml-3 space-y-1 border-l border-border pl-3">
              {hrTopics.map((topic) => (
                <Link
                  key={topic.slug}
                  to={`/hr/${topic.slug}`}
                  className="flex items-center gap-2 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  <topic.icon className="h-3.5 w-3.5 text-accent" />
                  {topic.label}
                </Link>
              ))}
            </div>
          )}

          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="block py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
};

export default Header;
