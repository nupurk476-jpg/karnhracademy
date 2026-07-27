import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, FileText } from "lucide-react";

type ExamInfoCard = {
  id: string;
  title: string;
  description: string | null;
  link_url: string | null;
  file_url: string | null;
  sort_order: number;
};

// Compact "Exam Essentials" strip for the Labour Welfare hub — syllabus,
// notification, cut-offs, eligibility etc. Cards come from the admin-managed
// exam_info_cards table; the whole section disappears when none exist.
const ExamInfoSection = () => {
  const [cards, setCards] = useState<ExamInfoCard[]>([]);

  useEffect(() => {
    let cancelled = false;
    (supabase.from("exam_info_cards" as any) as any)
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .then(({ data }: any) => {
        if (!cancelled && data) setCards(data);
      });
    return () => { cancelled = true; };
  }, []);

  const visible = cards.filter(c => c.link_url || c.file_url);
  if (visible.length === 0) return null;

  const cardClass =
    "group flex flex-col gap-1 rounded-lg border border-border bg-white p-4 text-left transition-all hover:border-accent/60 hover:shadow-sm";

  const inner = (card: ExamInfoCard) => (
    <>
      <h3 className="text-sm font-bold leading-snug text-foreground">{card.title}</h3>
      {card.description && (
        <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{card.description}</p>
      )}
      <span className="mt-auto inline-flex items-center gap-1 pt-1 text-xs font-semibold text-accent">
        {card.file_url && !card.link_url ? (
          <><FileText className="h-3.5 w-3.5" /> View PDF</>
        ) : (
          <>Explore More</>
        )}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </>
  );

  return (
    <section aria-labelledby="exam-essentials-heading" className="border-b border-border bg-white py-8">
      <div className="mx-auto max-w-6xl px-6">
        <h2 id="exam-essentials-heading" className="mb-1 text-lg font-bold text-foreground">
          UGC NET Code 55 — Exam Essentials
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Syllabus, notifications, cut-offs and everything else you need to know about the exam.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map(card => {
            const href = card.link_url || card.file_url!;
            const isInternal = href.startsWith("/");
            return isInternal ? (
              <Link key={card.id} to={href} className={cardClass}>
                {inner(card)}
              </Link>
            ) : (
              <a key={card.id} href={href} target="_blank" rel="noopener noreferrer" className={cardClass}>
                {inner(card)}
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ExamInfoSection;
