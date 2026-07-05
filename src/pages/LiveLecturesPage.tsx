import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Radio, Calendar, ExternalLink, Video } from "lucide-react";

const LiveLecturesPage = () => {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("live_lectures" as any).select("*").order("scheduled_at", { ascending: true })
      .then(({ data }) => data && setItems(data));
  }, []);

  const now = Date.now();
  const live = items.filter(i => i.status === "live");
  const upcoming = items.filter(i => i.status === "upcoming" && new Date(i.scheduled_at).getTime() >= now - 1000 * 60 * 60);
  const past = items.filter(i => i.status === "ended" || (i.status !== "live" && new Date(i.scheduled_at).getTime() < now - 1000 * 60 * 60));

  const Card = ({ l }: { l: any }) => (
    <article className="overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg">
      <div className="relative aspect-video bg-muted">
        {l.thumbnail_url ? (
          <img src={l.thumbnail_url} alt={l.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center"><Video className="h-12 w-12 text-muted-foreground" /></div>
        )}
        {l.status === "live" && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-destructive px-2.5 py-1 text-xs font-bold text-destructive-foreground">
            <Radio className="h-3 w-3 animate-pulse" /> LIVE
          </span>
        )}
      </div>
      <div className="p-5">
        <h3 className="mb-1 text-lg font-semibold text-foreground">{l.title}</h3>
        {l.description && <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{l.description}</p>}
        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          {new Date(l.scheduled_at).toLocaleString()}
          <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary">{l.subject === "english" ? "English" : "HRM"}</span>
        </div>
        {l.meeting_url && (
          <a href={l.meeting_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110">
            {l.status === "live" ? "Join Live" : l.status === "ended" ? "Watch Recording" : "Open Link"} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </article>
  );

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Live Lectures"
        description="Join interactive live classes and Q&A sessions on HR & Management topics with Karn HR Academy."
        path="/live-lectures"
      />
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-destructive">
            <Radio className="h-3 w-3" /> Live Sessions
          </span>
          <h1 className="mt-3 text-4xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            Live Lectures
          </h1>
          <p className="mt-2 text-muted-foreground">Join interactive live classes and Q&A sessions.</p>
        </div>

        {live.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 text-xl font-semibold text-foreground">🔴 Live Now</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{live.map(l => <Card key={l.id} l={l} />)}</div>
          </section>
        )}

        <section className="mb-12">
          <h2 className="mb-4 text-xl font-semibold text-foreground">Upcoming</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming live lectures scheduled.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{upcoming.map(l => <Card key={l.id} l={l} />)}</div>
          )}
        </section>

        {past.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-semibold text-foreground">Past Sessions</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{past.map(l => <Card key={l.id} l={l} />)}</div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default LiveLecturesPage;