import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";

const SUBJECT = "lw";

// Shared by the Labour Welfare hub and every per-unit subpage — both need
// the same three tables scoped to subject="lw", so this fetch (and its
// question-count paging, which a naive .select() would silently truncate
// once the combined question count across every LW quiz grows large
// enough) lives in one place instead of being duplicated per page.
export function useLabourWelfareContent() {
  const [notes, setNotes] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [pyqs, setPyqs] = useState<any[]>([]);
  const [lectures, setLectures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: noteData }, { data: quizData }, { data: pyqData }, { data: lectureData }] = await Promise.all([
        supabase.from("notes").select("*").eq("subject", SUBJECT).order("created_at", { ascending: false }),
        (supabase.from("quizzes") as any).select("*").eq("subject", SUBJECT).order("created_at", { ascending: false }),
        (supabase.from("pyq_papers" as any) as any).select("*").eq("subject", SUBJECT).order("year", { ascending: false }),
        (supabase.from("lectures" as any) as any).select("*").eq("subject", SUBJECT).order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      const publishedQuizzes = (quizData ?? []).filter((q: any) => q.published !== false);
      setNotes(noteData ?? []);
      setQuizzes(publishedQuizzes);
      setPyqs(pyqData ?? []);
      setLectures(lectureData ?? []);

      if (publishedQuizzes.length > 0) {
        const quizIds = publishedQuizzes.map((q: any) => q.id);
        const questions = await fetchAllRows<{ quiz_id: string }>(() =>
          supabase.from("quiz_questions").select("quiz_id").in("quiz_id", quizIds)
        );
        if (!cancelled) {
          const counts: Record<string, number> = {};
          questions.forEach((q) => { counts[q.quiz_id] = (counts[q.quiz_id] || 0) + 1; });
          setQuestionCounts(counts);
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return { notes, quizzes, questionCounts, pyqs, lectures, loading };
}
