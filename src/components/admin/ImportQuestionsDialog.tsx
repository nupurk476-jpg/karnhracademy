import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FileUp, ClipboardPaste, Loader2, AlertTriangle, Trash2, CheckCircle2 } from "lucide-react";
import { parseMcqText, type ParsedMcq } from "@/lib/mcq-parser";

// Reads the text out of a PDF in the browser. pdfjs is heavy, so it is only
// downloaded the first time an admin actually imports a PDF.
async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  let text = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // Rebuild line breaks from the glyph positions (y coordinate changes).
    let lastY: number | null = null;
    for (const item of content.items as any[]) {
      if (typeof item.str !== "string") continue;
      const y = item.transform?.[5];
      if (lastY !== null && typeof y === "number" && Math.abs(y - lastY) > 2) text += "\n";
      else if (text && !text.endsWith(" ") && !text.endsWith("\n") && item.str) text += " ";
      text += item.str;
      if (typeof y === "number") lastY = y;
    }
    text += "\n";
    lastY = null;
  }
  return text;
}

type Props = {
  open: boolean;
  onClose: () => void;
  quizTitle: string;
  /** Called with the reviewed questions; resolves true on success. */
  onImport: (questions: ParsedMcq[]) => Promise<boolean>;
};

const ImportQuestionsDialog = ({ open, onClose, quizTitle, onImport }: Props) => {
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsed, setParsed] = useState<ParsedMcq[] | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setParsed(null); setSkipped(0); setParseError(null);
    setPasteMode(false); setPasteText(""); setParsing(false); setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const close = () => { reset(); onClose(); };

  const runParse = (text: string) => {
    const { questions, skipped: sk } = parseMcqText(text);
    if (questions.length === 0) {
      setParseError("No questions could be read from this file. Make sure it contains numbered questions with A/B/C/D options, or use the paste option and tidy the text.");
      return;
    }
    setParsed(questions);
    setSkipped(sk);
    setParseError(null);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setParsing(true); setParseError(null);
    try {
      const text = file.type === "application/pdf" || /\.pdf$/i.test(file.name)
        ? await extractPdfText(file)
        : await file.text();
      runParse(text);
    } catch (e: any) {
      setParseError(`Could not read the file: ${e?.message ?? e}`);
    } finally {
      setParsing(false);
    }
  };

  const setCorrect = (qi: number, oi: number) =>
    setParsed(p => p!.map((q, i) => (i === qi ? { ...q, correct: oi } : q)));
  const removeQuestion = (qi: number) =>
    setParsed(p => {
      const next = p!.filter((_, i) => i !== qi);
      return next.length ? next : null;
    });

  const missing = parsed?.filter(q => q.correct === null).length ?? 0;

  const doImport = async () => {
    if (!parsed || missing > 0) return;
    setImporting(true);
    const ok = await onImport(parsed);
    setImporting(false);
    if (ok) close();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Questions</DialogTitle>
          <DialogDescription>
            Add questions to "{quizTitle}" from a PDF (or pasted text) — no retyping needed.
          </DialogDescription>
        </DialogHeader>

        {!parsed && (
          <div className="space-y-4">
            <div className="rounded-md bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
              <p className="mb-1 font-semibold text-foreground">Works with the usual MCQ layout:</p>
              <pre className="whitespace-pre-wrap font-mono">{`1. Question text?
A) Option one   B) Option two
C) Option three D) Option four
Answer: B`}</pre>
              <p className="mt-1">An "Answer Key" list at the end of the PDF also works. You'll review everything before it's added.</p>
            </div>

            {!pasteMode ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <button onClick={() => fileRef.current?.click()} disabled={parsing}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md border-2 border-dashed border-accent/50 bg-accent/5 px-4 py-8 text-sm font-semibold text-accent hover:bg-accent/10 disabled:opacity-50">
                  {parsing ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileUp className="h-5 w-5" />}
                  {parsing ? "Reading PDF…" : "Choose PDF file"}
                </button>
                <button onClick={() => setPasteMode(true)} disabled={parsing}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md border-2 border-dashed border-border px-4 py-8 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50">
                  <ClipboardPaste className="h-5 w-5" /> Paste text instead
                </button>
                <input ref={fileRef} type="file" accept=".pdf,.txt,application/pdf,text/plain" className="hidden"
                  aria-label="Upload question PDF"
                  onChange={e => handleFile(e.target.files?.[0])} />
              </div>
            ) : (
              <div className="space-y-2">
                <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} rows={10}
                  placeholder={"Paste your questions here…"}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs" />
                <div className="flex gap-2">
                  <button onClick={() => runParse(pasteText)} disabled={!pasteText.trim()}
                    className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50">
                    Read Questions
                  </button>
                  <button onClick={() => { setPasteMode(false); setParseError(null); }}
                    className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted">
                    Back
                  </button>
                </div>
              </div>
            )}

            {parseError && (
              <p className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {parseError}
              </p>
            )}
          </div>
        )}

        {parsed && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/60 px-3 py-2 text-sm">
              <span className="font-semibold text-foreground">
                {parsed.length} question{parsed.length === 1 ? "" : "s"} found
                {skipped > 0 && <span className="ml-2 font-normal text-muted-foreground">({skipped} unreadable block{skipped === 1 ? "" : "s"} skipped)</span>}
              </span>
              {missing > 0 ? (
                <span className="flex items-center gap-1.5 font-medium text-amber-600">
                  <AlertTriangle className="h-4 w-4" /> {missing} need the correct answer picked below
                </span>
              ) : (
                <span className="flex items-center gap-1.5 font-medium text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> All answers detected
                </span>
              )}
            </div>

            <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
              {parsed.map((q, qi) => (
                <div key={qi} className={`rounded-md border p-3 ${q.correct === null ? "border-amber-400 bg-amber-50/50" : "border-border bg-card"}`}>
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      <span className="mr-1.5 text-xs font-bold text-muted-foreground">Q{qi + 1}.</span>
                      {q.question}
                    </p>
                    <button onClick={() => removeQuestion(qi)} aria-label={`Remove question ${qi + 1}`}
                      className="shrink-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  {q.correct === null && <p className="mb-1.5 text-xs font-medium text-amber-700">Tap the correct option:</p>}
                  <div className="space-y-1">
                    {q.options.map((opt, oi) => (
                      <label key={oi} className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm ${q.correct === oi ? "bg-emerald-50 font-medium text-emerald-800 ring-1 ring-emerald-200" : "text-muted-foreground hover:bg-muted"}`}>
                        <input type="radio" name={`import-q-${qi}`} checked={q.correct === oi} onChange={() => setCorrect(qi, oi)} />
                        <span className="text-xs font-bold">{String.fromCharCode(65 + oi)}.</span> {opt}
                      </label>
                    ))}
                  </div>
                  {q.explanation && <p className="mt-1.5 text-xs text-muted-foreground"><span className="font-semibold">Explanation:</span> {q.explanation}</p>}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
              <button onClick={reset} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted">
                Start Over
              </button>
              <button onClick={doImport} disabled={missing > 0 || importing}
                title={missing > 0 ? "Pick the correct answer for the highlighted questions first" : undefined}
                className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-50">
                {importing && <Loader2 className="h-4 w-4 animate-spin" />}
                Add {parsed.length} Question{parsed.length === 1 ? "" : "s"} to Quiz
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImportQuestionsDialog;
