import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

const AdminQuizzes = () => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [qForm, setQForm] = useState({ question: "", options: ["", "", "", ""], correct_answer: 0, explanation: "" });
  const { toast } = useToast();

  const loadQuizzes = () => {
    supabase.from("quizzes").select("*").order("created_at", { ascending: false }).then(({ data }) => data && setQuizzes(data));
  };

  const loadQuestions = (quizId: string) => {
    supabase.from("quiz_questions").select("*").eq("quiz_id", quizId).order("created_at").then(({ data }) => data && setQuestions(data));
  };

  useEffect(() => { loadQuizzes(); }, []);
  useEffect(() => { if (selectedQuiz) loadQuestions(selectedQuiz); }, [selectedQuiz]);

  const createQuiz = async () => {
    if (!title || !topic) return;
    await supabase.from("quizzes").insert({ title, topic });
    setTitle(""); setTopic("");
    toast({ title: "Quiz created" });
    loadQuizzes();
  };

  const deleteQuiz = async (id: string) => {
    await supabase.from("quizzes").delete().eq("id", id);
    if (selectedQuiz === id) { setSelectedQuiz(null); setQuestions([]); }
    toast({ title: "Quiz deleted" });
    loadQuizzes();
  };

  const addQuestion = async () => {
    if (!selectedQuiz || !qForm.question || qForm.options.some(o => !o)) return;
    await supabase.from("quiz_questions").insert({
      quiz_id: selectedQuiz,
      question: qForm.question,
      options: qForm.options,
      correct_answer: qForm.correct_answer,
      explanation: qForm.explanation || null,
    });
    setQForm({ question: "", options: ["", "", "", ""], correct_answer: 0, explanation: "" });
    toast({ title: "Question added" });
    loadQuestions(selectedQuiz);
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from("quiz_questions").delete().eq("id", id);
    if (selectedQuiz) loadQuestions(selectedQuiz);
  };

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-foreground">Quizzes</h1>

      {/* Create quiz */}
      <div className="mb-8 flex gap-3 rounded-lg border border-border bg-card p-4">
        <input placeholder="Quiz Title" value={title} onChange={e => setTitle(e.target.value)} className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input placeholder="Topic" value={topic} onChange={e => setTopic(e.target.value)} className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <button onClick={createQuiz} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quiz list */}
        <div className="space-y-2">
          <h2 className="mb-2 text-lg font-semibold text-foreground">All Quizzes</h2>
          {quizzes.map((q) => (
            <div key={q.id} className={`flex cursor-pointer items-center justify-between rounded-md border px-4 py-3 transition-colors ${selectedQuiz === q.id ? "border-accent bg-accent/5" : "border-border bg-card hover:bg-muted"}`} onClick={() => setSelectedQuiz(q.id)}>
              <div>
                <span className="font-medium text-foreground">{q.title}</span>
                <span className="ml-2 text-xs text-muted-foreground">{q.topic}</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); deleteQuiz(q.id); }} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Questions */}
        {selectedQuiz && (
          <div>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Questions</h2>
            <div className="mb-4 space-y-3 rounded-lg border border-border bg-card p-4">
              <input placeholder="Question" value={qForm.question} onChange={e => setQForm({ ...qForm, question: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              {qForm.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="radio" name="correct" checked={qForm.correct_answer === i} onChange={() => setQForm({ ...qForm, correct_answer: i })} />
                  <input placeholder={`Option ${i + 1}`} value={opt} onChange={e => { const o = [...qForm.options]; o[i] = e.target.value; setQForm({ ...qForm, options: o }); }} className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
              ))}
              <input placeholder="Explanation (shown after answer)" value={qForm.explanation} onChange={e => setQForm({ ...qForm, explanation: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              <button onClick={addQuestion} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110">Add Question</button>
            </div>
            <div className="space-y-2">
              {questions.map((q, i) => (
                <div key={q.id} className="flex items-start justify-between rounded-md border border-border bg-card px-4 py-3">
                  <span className="text-sm text-foreground">{i + 1}. {q.question}</span>
                  <button onClick={() => deleteQuestion(q.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminQuizzes;
