import { BookOpen, Mail, Linkedin, Youtube } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-primary px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-accent" />
              <span className="text-base font-semibold text-primary-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                HR & Management
              </span>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-primary-foreground/80">
              Advancing knowledge in Human Resource Management through research, teaching, and academic collaboration.
            </p>
            <div className="flex gap-3">
              <a href="#" aria-label="LinkedIn profile" className="text-primary-foreground/70 transition-colors hover:text-accent"><Linkedin className="h-5 w-5" /></a>
              <a href="#" aria-label="YouTube channel" className="text-primary-foreground/70 transition-colors hover:text-accent"><Youtube className="h-5 w-5" /></a>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary-foreground/80">Quick Links</h4>
            <div className="space-y-2">
              {[
                { label: "Home", to: "/" },
                { label: "Blogs", to: "/blogs" },
                { label: "Notes", to: "/notes" },
                { label: "Quizzes", to: "/quizzes" },
                { label: "Books", to: "/books" },
              ].map((link) => (
                <Link key={link.label} to={link.to} className="block text-sm text-primary-foreground/80 transition-colors hover:text-accent">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary-foreground/80">About</h4>
            <div className="space-y-2">
              <Link to="/about" className="block text-sm text-primary-foreground/80 transition-colors hover:text-accent">About Us</Link>
              <Link to="/contact" className="block text-sm text-primary-foreground/80 transition-colors hover:text-accent">Contact</Link>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary-foreground/80">Contact</h4>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-accent" />
              <span className="text-sm text-primary-foreground/80">contact@hrresearchhub.com</span>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-primary-foreground/10 pt-6 text-center">
          <p className="text-xs text-primary-foreground/70">
            © {new Date().getFullYear()} HR & Management Research Hub. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
