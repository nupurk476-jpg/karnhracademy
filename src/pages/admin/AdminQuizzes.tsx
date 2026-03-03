import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Upload, Loader2, FileText, Type } from "lucide-react";

const AdminQuizzes = () => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [qForm, setQForm] = useState({ question: "", options: ["", "", "", ""], correct_answer: 0, explanation: "" });
  const [uploading, setUploading] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [showPasteBox, setShowPasteBox] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const insertParsedQuestions = async (parsed: any[]) => {
    if (!selectedQuiz) return;
    const inserts = parsed.map((q: any) => ({
      quiz_id: selectedQuiz,
      question: q.question,
      options: Array.isArray(q.options) ? q.options.slice(0, 4) : ["", "", "", ""],
      correct_answer: typeof q.correct_answer === "number" ? q.correct_answer : 0,
      explanation: q.explanation || null,
    }));
    const { error } = await supabase.from("quiz_questions").insert(inserts);
    if (error) throw error;
    toast({ title: `${inserts.length} questions added` });
    loadQuestions(selectedQuiz);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedQuiz) return;

    const allowed = [".pdf", ".ppt", ".pptx", ".doc", ".docx"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowed.includes(ext)) {
      toast({ title: "Unsupported file type", description: "Upload PDF, PPT, or DOC files.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-quiz-pdf`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session?.access_token}` },
          body: formData,
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to parse file");

      const parsed = result.questions;
      if (!Array.isArray(parsed) || parsed.length === 0) {
        toast({ title: "No questions found in file", variant: "destructive" });
        return;
      }

      await insertParsedQuestions(parsed);
    } catch (err: any) {
      toast({ title: "File parsing failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleTextSubmit = async () => {
    if (!pasteText.trim() || !selectedQuiz) return;

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-quiz-pdf`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: pasteText }),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to generate questions");

      const parsed = result.questions;
      if (!Array.isArray(parsed) || parsed.length === 0) {
        toast({ title: "No questions generated from text", variant: "destructive" });
        return;
      }

      await insertParsedQuestions(parsed);
      setPasteText("");
      setShowPasteBox(false);
    } catch (err: any) {
      toast({ title: "Text parsing failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
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
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">Questions</h2>
              <div className="ml-auto flex gap-2">
                <input
                  type="file"
                  accept=".pdf,.ppt,.pptx,.doc,.docx"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  {uploading ? "Processing..." : "Upload File"}
                </button>
                <button
                  onClick={() => setShowPasteBox(!showPasteBox)}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                >
                  <Type className="h-4 w-4" />
                  Paste Text
                </button>
              </div>
            </div>

            {/* Paste text box */}
            {showPasteBox && (
              <div className="mb-4 rounded-lg border border-border bg-card p-4">
                <textarea
                  placeholder="Paste your paragraph, statement, or study material here..."
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  rows={5}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleTextSubmit}
                    disabled={uploading || !pasteText.trim()}
                    className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Generate Questions
                  </button>
                  <button
                    onClick={() => { setShowPasteBox(false); setPasteText(""); }}
                    className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Manual question form */}
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
