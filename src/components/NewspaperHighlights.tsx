import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Newspaper } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const SECTIONS = ["all", "business", "international", "sports", "general", "editorial"];

interface Highlight {
  id: string;
  title: string;
  summary: string | null;
  image_url: string | null;
  section: string;
  created_at: string;
}

const NewspaperHighlights = () => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [activeSection, setActiveSection] = useState("all");

  useEffect(() => {
    supabase
      .from("newspaper_highlights")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => data && setHighlights(data as Highlight[]));
  }, []);

  if (highlights.length === 0) return null;

  const filtered = activeSection === "all"
    ? highlights
    : highlights.filter((h) => h.section === activeSection);

  return (
    <section className="bg-muted px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="mb-1 text-sm font-semibold uppercase tracking-[0.15em] text-accent">Today's Picks</p>
          <h2 className="text-3xl font-bold text-foreground">Newspaper Highlights</h2>
        </div>

        <Tabs value={activeSection} onValueChange={setActiveSection} className="mb-8">
          <TabsList className="flex-wrap">
            {SECTIONS.map((s) => (
              <TabsTrigger key={s} value={s} className="capitalize">{s}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((h) => (
            <div key={h.id} className="group overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md">
              {h.image_url ? (
                <img src={h.image_url} alt={h.title} className="h-48 w-full object-cover" />
              ) : (
                <div className="flex h-48 items-center justify-center bg-muted">
                  <Newspaper className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <div className="p-5">
                <span className="mb-2 inline-block rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold capitalize text-accent">{h.section}</span>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{h.title}</h3>
                {h.summary && <p className="text-sm text-muted-foreground line-clamp-2">{h.summary}</p>}
                <p className="mt-2 text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-muted-foreground col-span-full">No highlights in this section.</p>}
        </div>
      </div>
    </section>
  );
};

export default NewspaperHighlights;
