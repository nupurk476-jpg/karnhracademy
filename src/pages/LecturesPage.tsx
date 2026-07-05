import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { PlayCircle, Clock } from "lucide-react";
import { DISCIPLINES, getDiscipline } from "@/lib/disciplines";

const LecturesPage = () => {
  const [lectures, setLectures] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [activeSubject, setActiveSubject] = useState("hrm");
  const [activeTopic, setActiveTopic] = useState("all");
  const [playing, setPlaying] = useState<any | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    supabase
      .from("lectures" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error("LecturesPage: failed to load lectures", error); return; }
        if (data) setLectures(data);
      });
  }, []);

  const activeDiscipline = getDiscipline(activeSubject);

  const lectureMatchesSubject = (l: any, value: string) =>
    value === "hrm" ? (!l.subject || l.subject === "hrm") : l.subject === value;

  const countFor = (value: string) => lectures.filter((l: any) => lectureMatchesSubject(l, value)).length;

  // Content-first: land on the first discipline that actually has lectures.
  useEffect(() => {
    if (touched || lectures.length === 0) return;
    if (countFor(activeSubject) > 0) return;
    const firstWithContent = DISCIPLINES.find(d => lectures.some((l: any) => lectureMatchesSubject(l, d.value)));
    if (firstWithContent) setActiveSubject(firstWithContent.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectures]);

  const filtered = lectures.filter((l: any) => {
    if (!lectureMatchesSubject(l, activeSubject)) return false;
    if (activeTopic !== "all" && l.topic_slug !== activeTopic) return false;
    const searchMatch = !search || l.title?.toLowerCase().includes(search.toLowerCase()) || l.description?.toLowerCase().includes(search.toLowerCase());
    return searchMatch;
  });

  const subjectLectures = lectures.filter((l: any) => lectureMatchesSubject(l, activeSubject));
  const topicsWithLectures = activeDiscipline
    ? activeDiscipline.topics.filter(t => subjectLectures.some((l: any) => l.topic_slug === t.slug))
    : [];

  const Card = ({ lec }: { lec: any }) => (
    <button
      onClick={() => setPlaying(lec)}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-video w-full bg-muted">
        {lec.thumbnail_url ? (
          <img src={lec.thumbnail_url} alt={lec.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent/20 to-primary/10">
            <PlayCircle className="h-14 w-14 text-accent" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-foreground/0 transition-colors group-hover:bg-foreground/30">
          <PlayCircle className="h-14 w-14 text-background opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        {lec.duration_minutes && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-foreground/80 px-2 py-0.5 text-xs text-background">
            <Clock className="h-3 w-3" /> {lec.duration_minutes} min
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="mb-1 line-clamp-2 font-semibold text-foreground">{lec.title}</h3>
        {lec.description && <p className="line-clamp-2 text-sm text-muted-foreground">{lec.description}</p>}
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Video Lectures"
        description="Watch HR Management, Organisational Behaviour, Strategic Management and other video lectures for MBA, BBA, and UGC NET preparation."
        path="/lectures"
      />
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Video Lectures</h1>
            <p className="mt-1 text-muted-foreground">Pick your subject to watch recorded lectures.</p>
          </div>
          <input
            type="text"
            placeholder="Search lectures..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:w-64"
          />
        </div>

        {/* Compact discipline selector */}
        <div className="mb-8 flex flex-wrap gap-2">
          {DISCIPLINES.map(d => {
            const Icon = d.icon;
            const count = countFor(d.value);
            const isActive = activeSubject === d.value;
            return (
              <button
                key={d.value}
                onClick={() => { setActiveSubject(d.value); setActiveTopic("all"); setTouched(true); }}
                aria-pressed={isActive}
                className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? d.activeColor + " shadow-sm"
                    : count > 0
                      ? d.color + " hover:brightness-95"
                      : "border-border bg-card text-muted-foreground/70 hover:bg-muted"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : count > 0 ? d.iconColor : ""}`} />
                <span className="whitespace-nowrap">{d.short}</span>
                {count > 0 && (
                  <span className={`rounded-full px-1.5 text-xs font-semibold ${isActive ? "bg-white/25 text-white" : "bg-white/80 text-foreground"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activeDiscipline && (
          <div className="mb-5 flex items-center gap-3 border-b border-border pb-4">
            <div className={`rounded-lg p-2 ${activeDiscipline.color}`}>
              <activeDiscipline.icon className={`h-5 w-5 ${activeDiscipline.iconColor}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{activeDiscipline.label}</h2>
              <p className="text-sm text-muted-foreground">{activeDiscipline.description}</p>
            </div>
          </div>
        )}

        {/* Topic filter — only surface topics that actually have lectures */}
        {topicsWithLectures.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTopic("all")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTopic === "all" ? "bg-accent text-accent-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              All
            </button>
            {topicsWithLectures.map(t => (
              <button
                key={t.slug}
                onClick={() => setActiveTopic(t.slug)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTopic === t.slug ? "bg-accent text-accent-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Lecture grid */}
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 py-16 text-center">
            <PlayCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground font-medium">No lectures available yet for this discipline.</p>
            <p className="mt-1 text-sm text-muted-foreground">Check back soon — new lectures are added regularly.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(lec => <Card key={lec.id} lec={lec} />)}
          </div>
        )}
      </main>

      {/* Lightbox player */}
      {playing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 p-4"
          onClick={() => setPlaying(null)}
        >
          <div className="w-full max-w-4xl" onClick={e => e.stopPropagation()}>
            {(() => {
              const url: string = playing.video_url || "";
              const isFile = /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url) || url.includes("/storage/v1/object/");
              if (isFile) {
                return <video src={url} controls autoPlay className="w-full rounded-lg bg-black" />;
              }
              let embed = url;
              const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
              if (yt) embed = `https://www.youtube.com/embed/${yt[1]}?autoplay=1`;
              return (
                <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
                  <iframe
                    src={embed}
                    title={playing.title}
                    allow="autoplay; encrypted-media; fullscreen"
                    allowFullScreen
                    className="h-full w-full border-0"
                  />
                </div>
              );
            })()}
            <div className="mt-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-background">{playing.title}</h2>
              <div className="flex items-center gap-2">
                <a
                  href={playing.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md bg-background/80 px-3 py-1.5 text-sm text-foreground hover:bg-background"
                >
                  Open in new tab
                </a>
                <button
                  onClick={() => setPlaying(null)}
                  className="rounded-md bg-background px-3 py-1.5 text-sm text-foreground"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default LecturesPage;
