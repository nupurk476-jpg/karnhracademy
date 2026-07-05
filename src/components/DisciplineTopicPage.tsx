import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { ArrowLeft, FileText, Download } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface DisciplineTopic {
  label: string;
  slug: string;
  icon: LucideIcon;
  desc: string;
}

interface DisciplineTopicPageProps {
  subject: string;
  topics: DisciplineTopic[];
  backLink: string;
  backLabel: string;
  accentBg?: string;
  accentText?: string;
  routePrefix: string;
}

const DisciplineTopicPage = ({
  subject,
  topics,
  backLink,
  backLabel,
  accentBg = "bg-primary/10",
  accentText = "text-primary",
  routePrefix,
}: DisciplineTopicPageProps) => {
  const { slug } = useParams();
  const topic = topics.find((t) => t.slug === slug);
  const [notes, setNotes] = useState<any[]>([]);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("notes")
      .select("*")
      .eq("topic_slug", slug)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error("DisciplineTopicPage: failed to load notes", error); return; }
        if (!data) return;
        // Legacy HRM notes were saved with subject = null before the "subject" column existed.
        const scoped = subject === "hrm" ? data.filter((n) => !n.subject || n.subject === "hrm") : data.filter((n) => n.subject === subject);
        setNotes(scoped);
      });
  }, [slug, subject]);

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
      <SEO title={topic.label} description={topic.desc} path={`/${routePrefix}/${topic.slug}`} />
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <Link to={backLink} className="mb-6 inline-flex items-center gap-1 text-sm text-accent hover:underline">
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Link>
        <div className="mb-8 flex items-center gap-4">
          <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${accentBg} ${accentText}`}>
            <topic.icon className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              {topic.label}
            </h1>
            <p className="mt-1 text-muted-foreground">{topic.desc}</p>
          </div>
        </div>

        {notes.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-muted-foreground">
            <p>
              No resources uploaded for <strong className="text-foreground">{topic.label}</strong> yet. Check back later.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {notes.map((note) => (
              <div key={note.id} className="group flex flex-col rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-md">
                {note.video_url ? (
                  <video src={note.video_url} controls className="mb-3 w-full rounded-md bg-black aspect-video" />
                ) : (
                  <FileText className="mb-3 h-8 w-8 text-accent" />
                )}
                <h3 className="mb-1 text-sm font-semibold text-foreground">{note.title}</h3>
                {note.description && <p className="mb-3 text-xs text-muted-foreground">{note.description}</p>}
                {note.file_url && (
                  <a
                    href={note.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 self-start text-sm font-semibold text-accent hover:underline"
                  >
                    <Download className="h-4 w-4" /> Download
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default DisciplineTopicPage;
