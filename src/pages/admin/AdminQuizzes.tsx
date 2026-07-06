import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Pencil, X, Copy, Eye, EyeOff, ChevronDown, ChevronRight,
  ArrowUp, ArrowDown, CheckCircle2,
} from "lucide-react";
import { DISCIPLINES, getDiscipline, getTopicLabel } from "@/lib/disciplines";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];

const emptyQuestion = { question: "", options: ["", "", "", ""], correct_answer: 0, explanation: "", difficulty: "", marks: 1 };

// PostgREST answers PGRST204 (or a "schema cache" message) when a write
// references a column that doesn't exist yet — i.e. the LMS database update
// hasn't been applied. Every write below retries without the new columns so
// the admin keeps working either way.
const isMissingColumn = (e: any) => e?.code === "PGRST204" || /schema cache/i.test(e?.message || "");
const COMPAT_HINT = "Saved without the new fields (description / publish / difficulty / marks / ordering) — run the pending database update to enable them.";

const AdminQuizzes = () => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);

  // Quiz meta form (create or edit)
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("hrm");
  const [topicSlug, setTopicSlug] = useState("");

  // Question editor
  const [expandedQ, setExpandedQ] = useState<string | "new" | null>(null);
  const [qForm, setQForm] = useState<any>({ ...emptyQuestion });
  const [savingQ, setSavingQ] = useState(false);

  const [previewQuiz, setPreviewQuiz] = useState<any | null>(null);
  const { toast } = useToast();

  const loadQuizzes = () => {
    supabase.from("quizzes").select("*").order("created_at", { ascending: false }).then(({ data, error }) => {
      if (error) { toast({ title: "Failed to load quizzes", description: error.message, variant: "destructive" }); return; }
      if (data) setQuizzes(data);
    });
  };

  const loadQuestions = async (quizId: string) => {
    // Ordering by position fails outright if that column doesn't exist yet.
    let { data, error } = await supabase.from("quiz_questions").select("*").eq("quiz_id", quizId)
      .order("position" as any, { ascending: true, nullsFirst: false })
      .order("created_at");
    if (error) {
      ({ data, error } = await supabase.from("quiz_questions").select("*").eq("quiz_id", quizId).order("created_at"));
    }
    if (error) { toast({ title: "Failed to load questions", description: error.message, variant: "destructive" }); return; }
    if (data) setQuestions(data);
  };

  useEffect(() => { loadQuizzes(); }, []);
  useEffect(() => { if (selectedQuiz) loadQuestions(selectedQuiz); else setQuestions([]); }, [selectedQuiz]);

  // ── Quiz meta ──────────────────────────────────────────────────────────────
  const resetQuizForm = () => {
    setEditingQuizId(null);
    setTitle(""); setTopic(""); setDescription(""); setTopicSlug(""); setSubject("hrm");
  };

  const startEditQuiz = (q: any) => {
    setEditingQuizId(q.id);
    setTitle(q.title ?? ""); setTopic(q.topic ?? ""); setDescription(q.description ?? "");
    setSubject(q.subject ?? "hrm"); setTopicSlug(q.topic_slug ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveQuiz = async () => {
    if (!title || !topic) return;
    const fullRow = { title, topic, description: description || null, subject, topic_slug: topicSlug || null };
    const legacyRow = { title, topic, subject, topic_slug: topicSlug || null };
    const write = (row: any) => editingQuizId
      ? supabase.from("quizzes").update(row).eq("id", editingQuizId)
      : supabase.from("quizzes").insert(row);
    let { error } = await write(fullRow);
    let compat = false;
    if (error && isMissingColumn(error)) {
      compat = true;
      ({ error } = await write(legacyRow));
    }
    if (error) { toast({ title: "Failed to save quiz", description: error.message, variant: "destructive" }); return; }
    toast({ title: editingQuizId ? "Quiz updated" : "Quiz created", description: compat ? COMPAT_HINT : undefined });
    resetQuizForm();
    loadQuizzes();
  };

  const deleteQuiz = async (id: string) => {
    if (!window.confirm("Delete this quiz and all its questions? This cannot be undone.")) return;
    await supabase.from("quizzes").delete().eq("id", id);
    if (selectedQuiz === id) setSelectedQuiz(null);
    if (editingQuizId === id) resetQuizForm();
    toast({ title: "Quiz deleted" });
    loadQuizzes();
  };

  const togglePublish = async (q: any) => {
    const next = !(q.published ?? true);
    const { error } = await supabase.from("quizzes").update({ published: next } as any).eq("id", q.id);
    if (error) {
      toast({
        title: "Publish/unpublish unavailable",
        description: isMissingColumn(error) ? "This needs the pending database update to be applied first." : error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: next ? "Quiz published" : "Quiz unpublished (hidden from students)" });
    loadQuizzes();
  };

  const duplicateQuiz = async (q: any) => {
    let { data: newQuiz, error } = await supabase.from("quizzes")
      .insert({ title: `${q.title} (Copy)`, topic: q.topic, description: q.description, subject: q.subject, topic_slug: q.topic_slug, published: false } as any)
      .select().single();
    let compat = false;
    if (error && isMissingColumn(error)) {
      compat = true;
      ({ data: newQuiz, error } = await supabase.from("quizzes")
        .insert({ title: `${q.title} (Copy)`, topic: q.topic, subject: q.subject, topic_slug: q.topic_slug } as any)
        .select().single());
    }
    if (error || !newQuiz) { toast({ title: "Failed to duplicate quiz", description: error?.message, variant: "destructive" }); return; }
    let { data: qs, error: loadErr } = await supabase.from("quiz_questions").select("*").eq("quiz_id", q.id)
      .order("position" as any, { ascending: true, nullsFirst: false }).order("created_at");
    if (loadErr) ({ data: qs } = await supabase.from("quiz_questions").select("*").eq("quiz_id", q.id).order("created_at"));
    if (qs && qs.length > 0) {
      const fullCopies = qs.map((qq: any, i: number) => ({
        quiz_id: (newQuiz as any).id, question: qq.question, options: qq.options,
        correct_answer: qq.correct_answer, explanation: qq.explanation,
        difficulty: qq.difficulty, marks: qq.marks ?? 1, position: i + 1,
      }));
      let { error: qErr } = await supabase.from("quiz_questions").insert(fullCopies as any);
      if (qErr && isMissingColumn(qErr)) {
        const legacyCopies = qs.map((qq: any) => ({
          quiz_id: (newQuiz as any).id, question: qq.question, options: qq.options,
          correct_answer: qq.correct_answer, explanation: qq.explanation,
        }));
        ({ error: qErr } = await supabase.from("quiz_questions").insert(legacyCopies as any));
      }
      if (qErr) { toast({ title: "Quiz copied but questions failed", description: qErr.message, variant: "destructive" }); }
    }
    toast({ title: `Duplicated: ${q.title} (Copy)`, description: compat ? COMPAT_HINT : "Created as a draft." });
    loadQuizzes();
  };

  // ── Questions ──────────────────────────────────────────────────────────────
  const openNewQuestion = () => { setQForm({ ...emptyQuestion }); setExpandedQ("new"); };

  const openEditQuestion = (q: any) => {
    setQForm({
      question: q.question ?? "", options: Array.isArray(q.options) ? [...q.options] : ["", "", "", ""],
      correct_answer: q.correct_answer ?? 0, explanation: q.explanation ?? "",
      difficulty: q.difficulty ?? "", marks: q.marks ?? 1,
    });
    setExpandedQ(q.id);
  };

  const saveQuestion = async () => {
    if (!selectedQuiz || !qForm.question || qForm.options.some((o: string) => !o)) {
      toast({ title: "Fill in the question and all four options", variant: "destructive" });
      return;
    }
    setSavingQ(true);
    const row = {
      question: qForm.question, options: qForm.options, correct_answer: qForm.correct_answer,
      explanation: qForm.explanation || null, difficulty: qForm.difficulty || null, marks: qForm.marks || 1,
    };
    const legacyRow = {
      question: qForm.question, options: qForm.options, correct_answer: qForm.correct_answer,
      explanation: qForm.explanation || null,
    };
    const write = (r: any) => expandedQ === "new"
      ? supabase.from("quiz_questions").insert({ ...r, quiz_id: selectedQuiz } as any)
      : supabase.from("quiz_questions").update(r as any).eq("id", expandedQ!);
    let { error } = await write({ ...row, ...(expandedQ === "new" ? { position: questions.length + 1 } : {}) });
    let compat = false;
    if (error && isMissingColumn(error)) {
      compat = true;
      ({ error } = await write(legacyRow));
    }
    setSavingQ(false);
    if (error) { toast({ title: "Failed to save question", description: error.message, variant: "destructive" }); return; }
    toast({ title: expandedQ === "new" ? "Question added" : "Question saved", description: compat ? COMPAT_HINT : undefined });
    if (expandedQ === "new") setQForm({ ...emptyQuestion }); // keep form open for rapid entry
    else setExpandedQ(null);
    loadQuestions(selectedQuiz);
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from("quiz_questions").delete().eq("id", id);
    if (expandedQ === id) setExpandedQ(null);
    if (selectedQuiz) loadQuestions(selectedQuiz);
  };

  const duplicateQuestion = async (q: any) => {
    if (!selectedQuiz) return;
    let { error } = await supabase.from("quiz_questions").insert({
      quiz_id: selectedQuiz, question: `${q.question}`, options: q.options,
      correct_answer: q.correct_answer, explanation: q.explanation,
      difficulty: q.difficulty, marks: q.marks ?? 1, position: questions.length + 1,
    } as any);
    if (error && isMissingColumn(error)) {
      ({ error } = await supabase.from("quiz_questions").insert({
        quiz_id: selectedQuiz, question: `${q.question}`, options: q.options,
        correct_answer: q.correct_answer, explanation: q.explanation,
      } as any));
    }
    if (error) { toast({ title: "Failed to duplicate", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Question duplicated (added at end)" });
    loadQuestions(selectedQuiz);
  };

  const moveQuestion = async (index: number, dir: -1 | 1) => {
    const other = index + dir;
    if (other < 0 || other >= questions.length || !selectedQuiz) return;
    const a = questions[index], b = questions[other];
    const posA = a.position ?? index + 1, posB = b.position ?? other + 1;
    const { error } = await supabase.from("quiz_questions").update({ position: posB } as any).eq("id", a.id);
    if (error) {
      toast({
        title: "Reordering unavailable",
        description: isMissingColumn(error) ? "Reordering needs the pending database update to be applied first." : error.message,
        variant: "destructive",
      });
      return;
    }
    await supabase.from("quiz_questions").update({ position: posA } as any).eq("id", b.id);
    loadQuestions(selectedQuiz);
  };

  const activeQuizObj = quizzes.find(q => q.id === selectedQuiz);

  // ── Question form fields (shared by new + edit) ────────────────────────────
  const renderQuestionFields = () => (
    <div className="space-y-3 border-t border-border pt-3">
      <textarea placeholder="Question text" value={qForm.question} rows={2}
        onChange={e => setQForm({ ...qForm, question: e.target.value })}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      {qForm.options.map((opt: string, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <input type="radio" name="correct" checked={qForm.correct_answer === i}
            onChange={() => setQForm({ ...qForm, correct_answer: i })}
            aria-label={`Mark option ${String.fromCharCode(65 + i)} correct`} />
          <span className="w-5 text-xs font-bold text-muted-foreground">{String.fromCharCode(65 + i)}.</span>
          <input placeholder={`Option ${String.fromCharCode(65 + i)}`} value={opt}
            onChange={e => { const o = [...qForm.options]; o[i] = e.target.value; setQForm({ ...qForm, options: o }); }}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
      ))}
      <input placeholder="Explanation shown after answering (optional)" value={qForm.explanation}
        onChange={e => setQForm({ ...qForm, explanation: e.target.value })}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      <div className="flex flex-wrap items-center gap-3">
        <select value={qForm.difficulty} onChange={e => setQForm({ ...qForm, difficulty: e.target.value })}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">Difficulty (optional)</option>
          {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Marks
          <input type="number" min={1} max={100} value={qForm.marks}
            onChange={e => setQForm({ ...qForm, marks: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-16 rounded-md border border-input bg-background px-2 py-2 text-sm" />
        </label>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setExpandedQ(null)} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted">Cancel</button>
          <button onClick={saveQuestion} disabled={savingQ}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50">
            {savingQ ? "Saving…" : expandedQ === "new" ? "Add Question" : "Save Question"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-foreground">Quizzes</h1>

      {/* Create / edit quiz */}
      <div className={`mb-8 space-y-4 rounded-lg border bg-card p-4 ${editingQuizId ? "border-accent" : "border-border"}`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">{editingQuizId ? "Edit Quiz" : "Create Quiz"}</h2>
          {editingQuizId && (
            <button onClick={resetQuizForm} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">
              <X className="h-3.5 w-3.5" /> Cancel Edit
            </button>
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input placeholder="Quiz Title" value={title} onChange={e => setTitle(e.target.value)} className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input placeholder="Topic label (shown on cards)" value={topic} onChange={e => setTopic(e.target.value)} className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <input placeholder="Short description (optional)" value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />

        {/* Discipline selector — same taxonomy as Notes */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Select Discipline</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {DISCIPLINES.map(d => {
              const Icon = d.icon;
              const isActive = subject === d.value;
              return (
                <button key={d.value} type="button"
                  onClick={() => { setSubject(d.value); setTopicSlug(""); }}
                  className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-left text-sm transition-all ${isActive ? d.activeColor : d.color + " hover:brightness-95"}`}>
                  <div className={`flex-shrink-0 rounded p-1 ${isActive ? "bg-white/20" : "bg-white"}`}>
                    <Icon className={`h-4 w-4 ${isActive ? "text-white" : d.iconColor}`} />
                  </div>
                  <span className="font-semibold leading-tight">{d.short}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-topic chips */}
        {(getDiscipline(subject)?.topics.length ?? 0) > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Sub Topic (optional)</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setTopicSlug("")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${topicSlug === "" ? "bg-accent text-accent-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted"}`}>
                All Topics
              </button>
              {getDiscipline(subject)?.topics.map(t => (
                <button key={t.slug} type="button" onClick={() => setTopicSlug(t.slug)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${topicSlug === t.slug ? "bg-accent text-accent-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted"}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <button onClick={saveQuiz} disabled={!title || !topic}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50">
          {editingQuizId ? <><Pencil className="h-4 w-4" /> Save Changes</> : <><Plus className="h-4 w-4" /> Create Quiz</>}
        </button>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Quiz list */}
        <div className="space-y-2">
          <h2 className="mb-2 text-lg font-semibold text-foreground">All Quizzes ({quizzes.length})</h2>
          {quizzes.length === 0 && <p className="text-sm text-muted-foreground">No quizzes yet — create your first one above.</p>}
          {quizzes.map((q) => {
            const isPublished = q.published ?? true;
            return (
              <div key={q.id}
                className={`cursor-pointer rounded-md border px-4 py-3 transition-colors ${selectedQuiz === q.id ? "border-accent bg-accent/5" : "border-border bg-card hover:bg-muted"}`}
                onClick={() => setSelectedQuiz(q.id)}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-medium text-foreground">{q.title}</span>
                    {!isPublished && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Draft</span>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setPreviewQuiz(q)} title="Preview" aria-label={`Preview ${q.title}`} className="text-muted-foreground hover:text-accent"><Eye className="h-4 w-4" /></button>
                    <button onClick={() => startEditQuiz(q)} title="Edit" aria-label={`Edit ${q.title}`} className="text-muted-foreground hover:text-accent"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => duplicateQuiz(q)} title="Duplicate" aria-label={`Duplicate ${q.title}`} className="text-muted-foreground hover:text-accent"><Copy className="h-4 w-4" /></button>
                    <button onClick={() => togglePublish(q)} title={isPublished ? "Unpublish" : "Publish"} aria-label={`${isPublished ? "Unpublish" : "Publish"} ${q.title}`}
                      className={isPublished ? "text-emerald-600 hover:text-amber-600" : "text-amber-600 hover:text-emerald-600"}>
                      {isPublished ? <CheckCircle2 className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button onClick={() => deleteQuiz(q.id)} title="Delete" aria-label={`Delete ${q.title}`} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{q.topic}</span>
                  {q.subject && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{getDiscipline(q.subject)?.short ?? q.subject.toUpperCase()}</span>}
                  {q.topic_slug && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-accent">{getTopicLabel(q.topic_slug)}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Question editor */}
        {selectedQuiz && (
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-foreground">
                Questions <span className="text-sm font-normal text-muted-foreground">({questions.length} in "{activeQuizObj?.title}")</span>
              </h2>
              <button onClick={openNewQuestion}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110">
                <Plus className="h-4 w-4" /> Add Question
              </button>
            </div>

            {/* New question block */}
            {expandedQ === "new" && (
              <div className="mb-3 rounded-md border border-accent bg-card p-4">
                <p className="mb-2 text-sm font-semibold text-foreground">New Question (Q{questions.length + 1})</p>
                {renderQuestionFields()}
              </div>
            )}

            {/* Collapsible question blocks */}
            <div className="space-y-2">
              {questions.map((q, i) => {
                const isOpen = expandedQ === q.id;
                return (
                  <div key={q.id} className={`rounded-md border bg-card ${isOpen ? "border-accent" : "border-border"}`}>
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <button onClick={() => (isOpen ? setExpandedQ(null) : openEditQuestion(q))}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        aria-expanded={isOpen} aria-label={`Question ${i + 1}: ${isOpen ? "collapse" : "expand"}`}>
                        {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-accent" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                        <span className="shrink-0 text-xs font-bold text-muted-foreground">Q{i + 1}</span>
                        <span className="truncate text-sm text-foreground">{q.question}</span>
                        {q.difficulty && <span className="hidden shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground sm:inline">{q.difficulty}</span>}
                        {(q.marks ?? 1) !== 1 && <span className="hidden shrink-0 text-[10px] text-muted-foreground sm:inline">{q.marks} marks</span>}
                      </button>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button onClick={() => moveQuestion(i, -1)} disabled={i === 0} aria-label="Move up" className="text-muted-foreground hover:text-foreground disabled:opacity-25"><ArrowUp className="h-3.5 w-3.5" /></button>
                        <button onClick={() => moveQuestion(i, 1)} disabled={i === questions.length - 1} aria-label="Move down" className="text-muted-foreground hover:text-foreground disabled:opacity-25"><ArrowDown className="h-3.5 w-3.5" /></button>
                        <button onClick={() => duplicateQuestion(q)} aria-label="Duplicate question" className="text-muted-foreground hover:text-accent"><Copy className="h-3.5 w-3.5" /></button>
                        <button onClick={() => deleteQuestion(q.id)} aria-label="Delete question" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    {isOpen && <div className="px-3 pb-3">{renderQuestionFields()}</div>}
                  </div>
                );
              })}
              {questions.length === 0 && expandedQ !== "new" && (
                <p className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                  No questions yet — click "Add Question" to start.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Preview dialog */}
      <Dialog open={!!previewQuiz} onOpenChange={(open) => !open && setPreviewQuiz(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview: {previewQuiz?.title}</DialogTitle>
            <DialogDescription>
              {previewQuiz?.topic}{previewQuiz && !(previewQuiz.published ?? true) ? " · Draft (hidden from students)" : ""}
            </DialogDescription>
          </DialogHeader>
          <QuizPreviewBody quizId={previewQuiz?.id} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Read-only rendering of a quiz's questions with the correct answer highlighted.
const QuizPreviewBody = ({ quizId }: { quizId?: string }) => {
  const [qs, setQs] = useState<any[]>([]);
  useEffect(() => {
    if (!quizId) { setQs([]); return; }
    (async () => {
      let { data, error } = await supabase.from("quiz_questions").select("*").eq("quiz_id", quizId)
        .order("position" as any, { ascending: true, nullsFirst: false }).order("created_at");
      if (error) ({ data } = await supabase.from("quiz_questions").select("*").eq("quiz_id", quizId).order("created_at"));
      setQs(data ?? []);
    })();
  }, [quizId]);

  if (!quizId) return null;
  if (qs.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">No questions in this quiz yet.</p>;
  return (
    <div className="space-y-4">
      {qs.map((q, i) => (
        <div key={q.id} className="rounded-md border border-border p-4">
          <p className="mb-2 text-sm font-semibold text-foreground">
            Q{i + 1}. {q.question}
            {q.difficulty && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-normal text-muted-foreground">{q.difficulty}</span>}
            <span className="ml-2 text-[10px] font-normal text-muted-foreground">{q.marks ?? 1} {(q.marks ?? 1) === 1 ? "mark" : "marks"}</span>
          </p>
          <div className="space-y-1.5">
            {(Array.isArray(q.options) ? q.options : []).map((opt: string, oi: number) => (
              <div key={oi} className={`rounded px-3 py-1.5 text-sm ${oi === q.correct_answer ? "bg-emerald-50 font-medium text-emerald-800 ring-1 ring-emerald-200" : "text-muted-foreground"}`}>
                {String.fromCharCode(65 + oi)}. {opt} {oi === q.correct_answer && "✓"}
              </div>
            ))}
          </div>
          {q.explanation && <p className="mt-2 text-xs text-muted-foreground"><span className="font-semibold">Explanation:</span> {q.explanation}</p>}
        </div>
      ))}
    </div>
  );
};

export default AdminQuizzes;
