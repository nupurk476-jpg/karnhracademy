import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { hrTopics } from "@/components/HRTopicsSection";
import { ArrowLeft } from "lucide-react";

const HRTopicPage = () => {
  const { slug } = useParams();
  const topic = hrTopics.find((t) => t.slug === slug);

  if (!topic) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="py-20 text-center text-muted-foreground">Topic not found.</div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <Link to="/#hr-topics" className="mb-6 inline-flex items-center gap-1 text-sm text-accent hover:underline">
          <ArrowLeft className="h-4 w-4" /> All HR Topics
        </Link>
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <topic.icon className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              {topic.label}
            </h1>
            <p className="mt-1 text-muted-foreground">{topic.desc}</p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-8 text-muted-foreground">
          <p>Content for <strong className="text-foreground">{topic.label}</strong> is coming soon. Check back later for detailed articles, notes, and resources on this topic.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HRTopicPage;
