import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BookOpen, ExternalLink, FileDown } from "lucide-react";

const BooksPage = () => {
  const [books, setBooks] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.from("book_recommendations").select("*").order("created_at", { ascending: false }).then(({ data }) => data && setBooks(data));
  }, []);

  const filtered = books.filter(b =>
    !search || b.title?.toLowerCase().includes(search.toLowerCase()) || b.author?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="mb-2 text-4xl font-bold text-foreground">Book Recommendations</h1>
        <p className="mb-10 text-muted-foreground">Curated reading list for HR students and researchers.</p>

        {books.length === 0 ? (
          <p className="text-muted-foreground">No book recommendations yet.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => (
              <div key={book.id} className="flex flex-col rounded-lg border border-border bg-card p-6">
                <BookOpen className="mb-3 h-10 w-10 text-accent" />
                <h3 className="mb-1 text-lg font-semibold text-foreground">{book.title}</h3>
                <p className="mb-2 text-sm font-medium text-accent">by {book.author}</p>
                <p className="mb-4 flex-1 text-sm text-muted-foreground">{book.description}</p>
                <div className="flex flex-wrap gap-2">
                  {book.pdf_url && (
                    <a href={book.pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 self-start rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted">
                      Download PDF <FileDown className="h-4 w-4" />
                    </a>
                  )}
                  {book.buy_link && (
                    <a href={book.buy_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 self-start rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110">
                      Buy Now <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default BooksPage;
