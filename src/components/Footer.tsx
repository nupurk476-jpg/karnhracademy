import { BookOpen, Mail, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer id="contact" className="border-t border-border bg-primary px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-accent" />
              <span className="text-base font-semibold text-primary-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                HR & Management
              </span>
            </div>
            <p className="text-sm leading-relaxed text-primary-foreground/60">
              Advancing knowledge in Human Resource Management through research, 
              teaching, and academic collaboration.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary-foreground/80">
              Quick Links
            </h4>
            <div className="space-y-2">
              {["Home", "Research", "Resources", "About"].map((link) => (
                <a
                  key={link}
                  href={`#${link.toLowerCase()}`}
                  className="block text-sm text-primary-foreground/60 transition-colors hover:text-accent"
                >
                  {link}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary-foreground/80">
              For Students
            </h4>
            <div className="space-y-2">
              {["MBA Resources", "BBA Notes", "UGC NET Prep", "Research Guidance"].map((link) => (
                <a
                  key={link}
                  href="#resources"
                  className="block text-sm text-primary-foreground/60 transition-colors hover:text-accent"
                >
                  {link}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary-foreground/80">
              Contact
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-accent" />
                <span className="text-sm text-primary-foreground/60">contact@hrresearchhub.com</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent" />
                <span className="text-sm text-primary-foreground/60">India</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-primary-foreground/10 pt-6 text-center">
          <p className="text-xs text-primary-foreground/40">
            © {new Date().getFullYear()} HR & Management Research Hub. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
