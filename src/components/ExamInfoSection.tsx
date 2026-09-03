import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight, FileText, BookOpen, Bell, BarChart3, UserCheck,
  LayoutGrid, CalendarClock, ScrollText, GraduationCap, Info,
} from "lucide-react";

type ExamInfoCard = {
  id: string;
  title: string;
  description: string | null;
  link_url: string | null;
  file_url: string | null;
  sort_order: number;
};

// Same card shape throughout (uniformity is what reads as professional),
// differentiated by a small icon + accent tint per card. The icon is
// inferred from the title so the admin form stays a simple text form —
// no icon-picker to maintain; unrecognised titles get a neutral Info mark.
const pickIcon = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes("syllabus")) return BookOpen;
  if (t.includes("notif") || t.includes("notice") || t.includes("date")) return Bell;
  if (t.includes("cut")) return BarChart3;
  if (t.includes("eligib")) return UserCheck;
  if (t.includes("pattern")) return LayoutGrid;
  if (t.includes("age")) return CalendarClock;
  if (t.includes("paper") || t.includes("pyq") || t.includes("question")) return ScrollText;
  if (t.includes("coaching") || t.includes("class") || t.includes("course")) return GraduationCap;
  return Info;
};

// Rotating accent tints from the site palette (navy / gold / steel) — the
// same trio the homepage Quick Access cards cycle through.
const TINTS = [
  { color: "#17181C", bg: "#F2F1EF" },
  { color: "#B23223", bg: "#F7F4EF" },
  { color: "#3D6C98", bg: "#E8E6E2" },
];

// Compact "Exam Essentials" strip for the Labour Welfare hub — syllabus,
// notification, cut-offs, eligibility etc. Cards come from the admin-managed
// exam_info_cards table; the whole section disappears when none exist.
const ExamInfoSection = () => {
  const { data } = useQuery({
    queryKey: ["exam-info-cards"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: rows } = await (supabase.from("exam_info_cards" as any) as any)
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      return (rows ?? []) as ExamInfoCard[];
    },
  });
  const cards = data ?? [];

  const visible = cards.filter(c => c.link_url || c.file_url);
  if (visible.length === 0) return null;

  const cardClass =
    "group flex flex-col gap-1.5 rounded-lg border border-border bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md";

  const inner = (card: ExamInfoCard, idx: number) => {
    const Icon = pickIcon(card.title);
    const tint = TINTS[idx % TINTS.length];
    return (
      <>
        <span className="mb-1 flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: tint.bg }}>
          <Icon className="h-4 w-4" style={{ color: tint.color }} />
        </span>
        <h3 className="text-sm font-bold leading-snug text-foreground">{card.title}</h3>
        {card.description && (
          <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{card.description}</p>
        )}
        <span className="mt-auto inline-flex items-center gap-1 pt-1 text-xs font-semibold" style={{ color: tint.color }}>
          {card.file_url && !card.link_url ? (
            <><FileText className="h-3.5 w-3.5" /> View PDF</>
          ) : (
            <>Explore More</>
          )}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </>
    );
  };

  return (
    <section aria-labelledby="exam-essentials-heading" className="border-b border-border bg-white py-8">
      <div className="mx-auto max-w-6xl px-6">
        <h2 id="exam-essentials-heading" className="mb-1 text-lg font-bold text-foreground">
          UGC NET Code 55 — Exam Essentials
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Syllabus, notifications, cut-offs and everything else you need to know about the exam.
        </p>
        {/* Single column below 380px — two columns there crushed titles to
            3–4 lines and made the CTA row collide with the card edge. */}
        <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((card, idx) => {
            const href = card.link_url || card.file_url!;
            const isInternal = href.startsWith("/");
            return isInternal ? (
              <Link key={card.id} to={href} className={cardClass}>
                {inner(card, idx)}
              </Link>
            ) : (
              <a key={card.id} href={href} target="_blank" rel="noopener noreferrer" className={cardClass}>
                {inner(card, idx)}
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ExamInfoSection;
