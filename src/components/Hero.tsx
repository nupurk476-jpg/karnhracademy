import { ArrowRight } from "lucide-react";

const Hero = () => {
  return (
    <section id="home" className="relative overflow-hidden bg-primary px-6 py-24 md:py-32">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />
      
      <div className="relative mx-auto max-w-4xl text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-accent">
          Academic Excellence in Human Resource Management
        </p>
        <h1 className="mb-6 text-4xl font-bold leading-tight text-primary-foreground md:text-5xl lg:text-6xl">
          HR & Management{" "}
          <span className="italic">Research Hub</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-primary-foreground/75">
          Your comprehensive academic resource for Human Resource Management studies, 
          UGC NET preparation, and cutting-edge research in organizational behavior and management sciences.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="#resources"
            className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-all hover:brightness-110"
          >
            Explore Resources
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="#research"
            className="inline-flex items-center gap-2 rounded-md border border-primary-foreground/25 px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary-foreground/10"
          >
            View Research
          </a>
        </div>
      </div>
    </section>
  );
};

export default Hero;
