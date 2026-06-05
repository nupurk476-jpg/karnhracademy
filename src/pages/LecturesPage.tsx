import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { PlayCircle, Clock, BookOpen, Languages } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const LecturesPage = () => {
  const [lectures, setLectures] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("hrm");
  const [playing, setPlaying] = useState<any | null>(null);

  useEffect(() => {
    supabase.from("lectures" as any).select("*").order("created_at", { ascending: false }).then(({ data }) => data && setLectures(data));
  }, []);

  const filtered = lectures.filter((l: any) => {
    const subjMatch = active === "english" ? l.subject === "english" : (!l.subject || l.subject === "hrm");
    const searchMatch = !search || l.title?.toLowerCase().includes(search.toLowerCase()) || l.description?.toLowerCase().includes(search.toLowerCase());
    return subjMatch && searchMatch;
  });

  const Card = ({ lec }: { lec: any }) => (
    <button onClick={() => setPlaying(lec)} className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition-shadow hover:shadow-lg">
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
        description="Watch HR Management and English video lectures for MBA, BBA, and UGC NET preparation."
        path="/lectures"
      />
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="mb-2 text-4xl font-bold text-foreground">Video Lectures</h1>
        <p className="mb-6 text-muted-foreground">Recorded lectures on HRM and English topics.</p>
        <input
          type="text"
          placeholder="Search lectures..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-8 w-full max-w-md rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <Tabs value={active} onValueChange={setActive}>
          <TabsList className="mb-6">
            <TabsTrigger value="hrm" className="gap-2"><BookOpen className="h-4 w-4" /> HRM</TabsTrigger>
            <TabsTrigger value="english" className="gap-2"><Languages className="h-4 w-4" /> English</TabsTrigger>
          </TabsList>
          <TabsContent value={active}>
            {filtered.length === 0 ? (
              <p className="text-muted-foreground">No lectures available yet.</p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(lec => <Card key={lec.id} lec={lec} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {playing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 p-4" onClick={() => setPlaying(null)}>
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
                <a href={playing.video_url} target="_blank" rel="noopener noreferrer" className="rounded-md bg-background/80 px-3 py-1.5 text-sm text-foreground hover:bg-background">Open in new tab</a>
                <button onClick={() => setPlaying(null)} className="rounded-md bg-background px-3 py-1.5 text-sm text-foreground">Close</button>
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