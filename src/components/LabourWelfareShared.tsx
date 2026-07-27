import { Link } from "react-router-dom";
import { ChevronRight, Calendar, Clock, Eye, Download } from "lucide-react";
import { getTopicLabel } from "@/lib/disciplines";

// Small display bits shared by the Labour Welfare hub and its per-unit
// subpages, so a note/quiz card looks and behaves identically wherever a
// student encounters it.

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export const TagChip = ({ tag }: { tag: string }) => (
  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">#{tag}</span>
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
        {note.topic_slug && (
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent-deep">
            {getTopicLabel(note.topic_slug)}
          </span>
        )}
      </div>
      {note.description && <p className="mb-1 line-clamp-1 text-xs text-muted-foreground">{note.description}</p>}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(note.created_at)}</span>
        {(note.tags ?? []).map((t: string) => <TagChip key={t} tag={t} />)}
      </div>
    </div>
    <div className="flex shrink-0 items-center gap-2">
      <button onClick={onView} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted">
        <Eye className="h-3.5 w-3.5" /> View Notes
      </button>
      <button onClick={onDownload} className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:brightness-110">
        <Download className="h-3.5 w-3.5" /> Download
      </button>
    </div>
  </div>
);

export const QuizCard = ({ quiz, questionCount }: { quiz: any; questionCount: number }) => (
  <div className="flex flex-col gap-2 rounded-md border border-border p-4">
    <div className="flex flex-wrap items-center gap-1.5">
      <h3 className="text-sm font-semibold text-foreground">{quiz.title}</h3>
      {quiz.topic_slug && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent-deep">{getTopicLabel(quiz.topic_slug)}</span>}
    </div>
    <p className="flex items-center gap-1 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" /> {questionCount} questions
    </p>
    <Link to={`/quizzes/${quiz.id}`} className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:brightness-110">
      Take Quiz <ChevronRight className="h-3.5 w-3.5" />
    </Link>
  </div>
);
