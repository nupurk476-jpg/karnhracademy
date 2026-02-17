import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CheckCircle2 } from "lucide-react";

const highlights = [
  "UGC NET Qualified",
  "PhD Scholar in Human Resource Management",
  "Research Focus: Ethical HRM & Quiet Quitting",
  "10+ years of academic teaching experience",
  "Mentor to 500+ MBA & BBA students",
  "Published researcher in peer-reviewed journals",
];

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="mb-8 text-4xl font-bold text-foreground">About</h1>
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <div className="flex justify-center">
            <div className="relative">
              <div className="h-72 w-72 rounded-2xl bg-primary/10 flex items-center justify-center">
                <span className="text-6xl font-bold text-primary/20" style={{ fontFamily: "'Playfair Display', serif" }}>HR</span>
              </div>
              <div className="absolute -bottom-3 -right-3 rounded-lg bg-accent px-4 py-2">
                <span className="text-sm font-bold text-accent-foreground">Educator</span>
              </div>
            </div>
          </div>
          <div>
            <p className="mb-6 leading-relaxed text-muted-foreground">
              With a passion for Human Resource Management and organizational sciences,
              this platform bridges the gap between rigorous academic research and
              practical HR knowledge. Our mission is to empower the next generation
              of HR professionals and researchers through quality study materials, insightful blog posts,
              and structured quizzes.
            </p>
            <div className="space-y-3">
              {highlights.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                  <span className="text-sm font-medium text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AboutPage;
