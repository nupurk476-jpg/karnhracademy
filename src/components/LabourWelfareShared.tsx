import { Link } from "react-router-dom";
import { ChevronRight, Calendar, Clock, Eye, Download, BookOpenCheck, FileCheck2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getTopicLabel, getDiscipline } from "@/lib/disciplines";
import { getUnitByNumber, unitRoman } from "@/lib/labourWelfareUnits";
import { formatDate } from "@/lib/format";

// Small display bits shared by the Labour Welfare hub and its per-unit
// subpages, so a note/quiz card looks and behaves identically wherever a
// student encounters it.


export const TagChip = ({ tag }: { tag: string }) => (
  <Badge variant="tag" size="sm" className="font-normal">#{tag}</Badge>
);

export const EmptyState = ({ text }: { text: string }) => (
  <div className="rounded-lg border border-dashed border-border bg-muted/30 py-8 text-center">
    <p className="text-sm text-muted-foreground">{text}</p>
  </div>
);

export const NoteRow = ({ note, onView, onDownload }: { note: any; onView: () => void; onDownload: () => void }) => (
  <div className="flex flex-col gap-2 rounded-md border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        <h3 className="text-sm font-semibold text-foreground">{note.title}</h3>
        {note.topic_slug && <Badge variant="unit" size="sm">{getTopicLabel(note.topic_slug)}</Badge>}
      </div>
      {note.description && <p className="mb-1 line-clamp-1 text-xs text-muted-foreground">{note.description}</p>}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(note.created_at)}</span>
        {(note.tags ?? []).map((t: string) => <TagChip key={t} tag={t} />)}
      </div>
    </div>
    <div className="flex shrink-0 items-center gap-2">
      <button onClick={onView} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted">
        <Eye className="h-3.5 w-3.5" /> Read Notes
      </button>
      <button onClick={onDownload} className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:brightness-110">
        <Download className="h-3.5 w-3.5" /> Download
      </button>
    </div>
  </div>
);

// One PYQ card for every surface that lists papers (the general /pyqs
// browser, the LW hub, unit pages, topic pages) — the markup used to be
// copy-pasted four times and had already drifted (view counts showed on
// one page only). Title → public paper landing page; button → reader.
export const PYQCard = ({ pyq, showSubject = false, showViews = false }: { pyq: any; showSubject?: boolean; showViews?: boolean }) => {
  const discipline = showSubject ? getDiscipline(pyq.subject) : null;
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground">
        {/* Title and button are two different destinations (paper details
            vs. the reader) — the chevron signals the title itself goes
            somewhere, not just styled text. */}
        <Link to={`/pyqs/paper/${pyq.id}`} className="group/title inline-flex items-center gap-1 hover:text-accent-deep hover:underline">
          {pyq.title}
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/title:opacity-100" />
        </Link>
      </h3>
      <div className="flex flex-wrap items-center gap-1.5">
        {discipline && <Badge variant="subject" size="sm">{discipline.short}</Badge>}
        {(pyq.unit_tags ?? []).map((n: number) => (
          <Badge key={n} variant="unit" size="sm">
            Unit {unitRoman(n)}{getUnitByNumber(n) ? `: ${getUnitByNumber(n)!.title}` : ""}
          </Badge>
        ))}
        {(pyq.tags ?? []).map((t: string) => <TagChip key={t} tag={t} />)}
        {pyq.answer_key_url && (
          <Badge variant="success" size="sm"><FileCheck2 className="h-3 w-3" /> Answer key included</Badge>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        {showViews && (pyq.view_count ?? 0) > 0 ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Eye className="h-3 w-3" /> {pyq.view_count} views</span>
        ) : <span />}
        <Link to={`/pyqs/view/${pyq.id}`} className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:brightness-110">
          <BookOpenCheck className="h-3.5 w-3.5" /> Read Online
        </Link>
      </div>
    </div>
  );
};

export const QuizCard = ({ quiz, questionCount }: { quiz: any; questionCount: number }) => (
  <div className="flex flex-col gap-2 rounded-md border border-border p-4">
    <div className="flex flex-wrap items-center gap-1.5">
      <h3 className="text-sm font-semibold text-foreground">{quiz.title}</h3>
      {quiz.topic_slug && <Badge variant="unit" size="sm">{getTopicLabel(quiz.topic_slug)}</Badge>}
    </div>
    <p className="flex items-center gap-1 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" /> {questionCount} questions
    </p>
    <Link to={`/quizzes/${quiz.id}`} className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:brightness-110">
      Take Quiz <ChevronRight className="h-3.5 w-3.5" />
    </Link>
  </div>
);
