import { Mail } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-primary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Col 1: Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div
                style={{
                  width: 5,
                  height: 42,
                  background: "#C6A15B",
                  borderRadius: 3,
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ lineHeight: 1 }}>
                  <span
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontWeight: 300,
                      fontSize: 22,
                      letterSpacing: -1,
                      color: "hsl(var(--primary-foreground))",
                    }}
                  >
                    KARN
                  </span>
                  <span
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontWeight: 800,
                      fontSize: 22,
                      letterSpacing: -1,
                      color: "hsl(var(--primary-foreground))",
                    }}
                  >
                    HR
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 500,
                    fontSize: 8,
                    letterSpacing: 4,
                    color: "hsl(var(--primary-foreground) / 0.6)",
                    marginTop: 4,
                  }}
                >
                  ACADEMY
                </div>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-primary-foreground/70 mb-5 max-w-xs">
              Academic resource hub for HR & Management — structured notes, video lectures,
              MCQs and research content for MBA, BBA & UGC NET/JRF aspirants.
            </p>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary-foreground/50">
              Quick Links
            </h4>
            <div className="space-y-2.5">
              {[
                { label: "Home", to: "/" },
                { label: "UGC NET/JRF Labour Welfare", to: "/ugc-net-labour-welfare" },
                { label: "MBA / BBA Hub", to: "/mba-bba" },
                { label: "Notes", to: "/notes" },
                { label: "MCQs", to: "/quizzes" },
                { label: "Previous Year Questions", to: "/pyqs" },
                { label: "Video Lectures", to: "/lectures" },
                { label: "Live Lectures", to: "/live-lectures" },
                { label: "Books", to: "/books" },
                { label: "Newspaper Highlights", to: "/newspaper" },
                { label: "Blogs", to: "/blogs" },
              ].map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="block text-sm text-primary-foreground/70 transition-colors hover:text-accent"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Col 3: Subjects */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary-foreground/50">
              Subjects
            </h4>
            <div className="space-y-2.5">
              {[
                { label: "Human Resource Management", to: "/notes?subject=hrm" },
                { label: "Organisational Behaviour", to: "/notes?subject=ob" },
                { label: "Strategic Management", to: "/notes?subject=sm" },
                { label: "International HRM", to: "/notes?subject=ghr" },
                { label: "HR Analytics", to: "/hr/hr-analytics" },
                { label: "Performance Management", to: "/hr/performance-management" },
              ].map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="block text-sm text-primary-foreground/70 transition-colors hover:text-accent"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Col 4: Contact */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary-foreground/50">
              Contact
            </h4>
            <p className="text-sm text-primary-foreground/70 mb-3 leading-relaxed">
              Have a question or suggestion? We'd love to hear from you.
            </p>
            <a
              href="mailto:contact@karnhracademy.com"
              className="flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-accent transition-colors"
            >
              <Mail className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--accent))" }} />
              contact@karnhracademy.com
            </a>
          </div>
        </div>

        <div className="mt-12 border-t border-primary-foreground/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-primary-foreground/50">
            © {new Date().getFullYear()} Karn HR Academy. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/privacy-policy" className="text-xs text-primary-foreground/50 hover:text-accent transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-xs text-primary-foreground/50 hover:text-accent transition-colors">
              Terms of Use
            </Link>
            <p className="text-xs text-primary-foreground/40">Academic Resource Hub</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
