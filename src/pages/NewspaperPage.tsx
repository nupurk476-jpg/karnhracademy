import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Newspaper } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

const SECTIONS = ["all", "business", "international", "sports", "general", "editorial"];
const PAGE_SIZE = 9;

interface Highlight {
  id: string;
  title: string;
  summary: string | null;
  image_url: string | null;
  section: string;
  created_at: string;
}

const NewspaperPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const activeSection = searchParams.get("section") || "all";
  const page = parseInt(searchParams.get("page") || "1", 10);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const term = search.trim().replace(/[%,()]/g, "");
      let query = supabase
        .from("newspaper_highlights")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (activeSection !== "all") {
        query = query.eq("section", activeSection);
      }

      if (term) {
        // Search runs server-side across every matching row, not just the
        // current page — otherwise it would silently only search whatever
        // 9 rows happened to already be loaded.
        query = query.or(`title.ilike.%${term}%,summary.ilike.%${term}%`);
      } else {
        query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      }

      const { data, count } = await query;
      setHighlights((data as Highlight[]) || []);
      setTotal(count || 0);
      setLoading(false);
    };
    fetchData();
  }, [activeSection, page, search]);

  const searching = search.trim().length > 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => params.set(k, v));
    setSearchParams(params);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Newspaper Highlights"
        description="Daily newspaper highlights across business, international, sports, general, and editorial for HR aspirants."
        path="/newspaper"
      />
      <Header />
      <main id="main-content" className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8">
          <p className="mb-1 text-sm font-semibold uppercase tracking-[0.15em] text-accent-deep">Stay Informed</p>
          <h1 className="text-4xl font-bold text-foreground">
            Newspaper Highlights
          </h1>
          <input
            type="text"
            placeholder="Search highlights..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="mt-4 w-full max-w-md rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <Tabs
          value={activeSection}
          onValueChange={(v) => updateParams({ section: v, page: "1" })}
          className="mb-8"
        >
          <TabsList className="flex-wrap">
            {SECTIONS.map((s) => (
              <TabsTrigger key={s} value={s} className="capitalize">{s}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : highlights.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">No highlights found.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.map((h) => (
              <div key={h.id} className="group overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md">
                {h.image_url ? (
                  <img src={h.image_url} alt={h.title} loading="lazy" decoding="async" className="h-48 w-full object-cover" />
                ) : (
                  <div className="flex h-48 items-center justify-center bg-muted">
                    <Newspaper className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <div className="p-5">
                  <span className="mb-2 inline-block rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold capitalize text-accent-deep">
                    {h.section}
                  </span>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">{h.title}</h3>
                  {h.summary && <p className="text-sm text-muted-foreground line-clamp-3">{h.summary}</p>}
                  <p className="mt-2 text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!searching && totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateParams({ page: String(page - 1) })}
            >
              Previous
            </Button>
            <span className="px-3 text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => updateParams({ page: String(page + 1) })}
            >
              Next
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default NewspaperPage;
