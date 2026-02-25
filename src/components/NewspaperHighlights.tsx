import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Newspaper } from "lucide-react";

interface Highlight {
  id: string;
  title: string;
  summary: string | null;
  image_url: string | null;
  created_at: string;
}

const NewspaperHighlights = () => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  useEffect(() => {
    supabase
      .from("newspaper_highlights")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => data && setHighlights(data));
  }, []);

  if (highlights.length === 0) return null;

  return (
    <section className="bg-muted px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="mb-1 text-sm font-semibold uppercase tracking-[0.15em] text-accent">Today's Picks</p>
          <h2 className="text-3xl font-bold text-foreground">Newspaper Highlights</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {highlights.map((h) => (
            <div key={h.id} className="group overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md">
              {h.image_url ? (
                <img src={h.image_url} alt={h.title} className="h-48 w-full object-cover" />
              ) : (
                <div className="flex h-48 items-center justify-center bg-muted">
                  <Newspaper className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <div className="p-5">
                <h3 className="mb-2 text-lg font-semibold text-foreground">{h.title}</h3>
                {h.summary && <p className="text-sm text-muted-foreground line-clamp-2">{h.summary}</p>}
                <p className="mt-2 text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default NewspaperHighlights;
