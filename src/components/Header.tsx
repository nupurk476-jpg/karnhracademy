import { Menu, X, Search, LogIn, UserPlus, LogOut, User } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Home", to: "/" },
  { label: "Notes", to: "/notes" },
  { label: "Labour Welfare", to: "/ugc-net-labour-welfare" },
  { label: "Video Lectures", to: "/lectures" },
  { label: "Blogs", to: "/blogs" },
  { label: "MCQs", to: "/quizzes" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) =>
      setUser(session?.user ?? null)
    );
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const isActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname.startsWith(to);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <div
            style={{
              width: 5,
              height: 42,
              background: "#C7994A",
              borderRadius: 3,
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ lineHeight: 1 }}>
              <span
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontWeight: 300,
                  fontSize: 26,
                  letterSpacing: -1,
                  color: "hsl(var(--foreground))",
                }}
              >
                KARN
              </span>
              <span
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontWeight: 800,
                  fontSize: 26,
                  letterSpacing: -1,
                  color: "hsl(var(--foreground))",
                }}
              >
                HR
              </span>
            </div>
            <div
              style={{
                fontFamily: "'Sora', sans-serif",
                fontWeight: 500,
                fontSize: 9,
                letterSpacing: 4,
                color: "hsl(var(--muted-foreground))",
                marginTop: 4,
              }}
            >
              ACADEMY
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden xl:flex items-center gap-1 flex-1 justify-center">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive(item.to)
                  ? "text-foreground bg-slate-100"
                  : "text-muted-foreground hover:text-foreground hover:bg-slate-50"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Search toggle */}
          <div className="hidden md:flex items-center">
            {searchOpen ? (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search…"
                    className="pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-slate-50 focus:outline-none focus:ring-2 w-48 focus:ring-accent/20"
                  />
                </div>
                <button
                  onClick={() => setSearchOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-slate-50 transition-colors"
                aria-label="Open search"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Auth buttons */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/profile">
                    <User className="h-4 w-4 mr-1" />
                    Profile
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-1" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/auth">
                    <LogIn className="h-4 w-4 mr-1" />
                    Sign In
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/auth">
                    <UserPlus className="h-4 w-4 mr-1" />
                    Sign Up
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="xl:hidden p-2 rounded-md text-foreground hover:bg-slate-50 transition-colors"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="xl:hidden border-t border-border bg-white">
          {/* Mobile search */}
          <div className="px-4 pt-3 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search notes, topics, subjects…"
                className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg bg-slate-50 focus:outline-none"
              />
            </div>
          </div>

          {/* Nav links */}
          <nav className="px-4 pb-3 space-y-0.5">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className={`block px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.to)
                    ? "text-foreground bg-slate-100"
                    : "text-muted-foreground hover:text-foreground hover:bg-slate-50"
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Mobile auth */}
          <div className="px-4 pb-4 pt-2 border-t border-border flex flex-col gap-2">
            {user ? (
              <>
                <Button variant="outline" size="sm" asChild className="w-full justify-start">
                  <Link to="/profile" onClick={() => setMobileOpen(false)}>
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    handleSignOut();
                    setMobileOpen(false);
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" asChild className="w-full justify-start">
                  <Link to="/auth" onClick={() => setMobileOpen(false)}>
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </Link>
                </Button>
                <Button size="sm" asChild className="w-full justify-start">
                  <Link to="/auth" onClick={() => setMobileOpen(false)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Sign Up
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
