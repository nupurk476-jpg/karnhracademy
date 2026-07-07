"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  KeyRound,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { createUpload, finalizeUpload } from "@/lib/actions/upload";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ACCEPT = ".pdf,.docx,.csv,.xlsx,.txt,.md,.png,.jpg,.jpeg,.webp";
const MAX_BYTES = 50 * 1024 * 1024;

type FileState =
  | { phase: "queued" }
  | { phase: "uploading"; progress: number }
  | { phase: "processing" }
  | { phase: "done"; jobId: string }
  | { phase: "error"; message: string };

interface QueuedFile {
  id: string;
  file: File;
  state: FileState;
}

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["csv", "xlsx", "xls"].includes(ext)) return FileSpreadsheet;
  if (["png", "jpg", "jpeg", "webp"].includes(ext)) return ImageIcon;
  return FileText;
}

export function UploadCenter({
  linkableDocuments,
}: {
  linkableDocuments: { id: string; file_name: string; created_at: string }[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [isAnswerKey, setIsAnswerKey] = useState(false);
  const [linkedDocId, setLinkedDocId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const updateFile = useCallback((id: string, state: FileState) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, state } : f)));
  }, []);

  const addFiles = useCallback((list: FileList | File[]) => {
    const next: QueuedFile[] = [];
    for (const file of Array.from(list)) {
      if (file.size > MAX_BYTES) {
        toast.error(`"${file.name}" is over the 50 MB limit.`);
        continue;
      }
      next.push({ id: crypto.randomUUID(), file, state: { phase: "queued" } });
    }
    if (next.length > 0) setFiles((prev) => [...prev, ...next]);
  }, []);

  async function uploadOne(item: QueuedFile): Promise<boolean> {
    const { file } = item;
    updateFile(item.id, { phase: "uploading", progress: 10 });

    const prepared = await createUpload({
      fileName: file.name,
      sizeBytes: file.size,
      mimeType: file.type || undefined,
    });
    if (!prepared.ok) {
      updateFile(item.id, { phase: "error", message: prepared.error });
      return false;
    }

    updateFile(item.id, { phase: "uploading", progress: 35 });
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("ingestion")
      .uploadToSignedUrl(prepared.data.path, prepared.data.token, file, {
        contentType: file.type || "application/octet-stream",
      });
    if (uploadError) {
      updateFile(item.id, { phase: "error", message: "Upload failed — check your connection and retry." });
      return false;
    }

    updateFile(item.id, { phase: "processing" });
    const finalized = await finalizeUpload({
      path: prepared.data.path,
      fileName: file.name,
      sizeBytes: file.size,
      mimeType: file.type || undefined,
      kind: isAnswerKey ? "answer_key" : "unknown",
      linkedDocumentId: isAnswerKey ? linkedDocId : null,
    });
    if (!finalized.ok) {
      updateFile(item.id, { phase: "error", message: finalized.error });
      return false;
    }

    updateFile(item.id, { phase: "done", jobId: finalized.data.jobId });
    return true;
  }

  async function startUpload() {
    if (isAnswerKey && !linkedDocId) {
      toast.error("Choose which question document this answer key belongs to.");
      return;
    }
    setBusy(true);
    let succeeded = 0;
    let failed = 0;
    for (const item of files) {
      if (item.state.phase === "queued" || item.state.phase === "error") {
        const success = await uploadOne(item);
        if (success) succeeded++;
        else failed++;
      }
    }
    setBusy(false);
    if (failed > 0) {
      // Stay on this screen so the per-file error messages remain visible.
      toast.error(
        succeeded > 0
          ? `${succeeded} queued, but ${failed} ${failed === 1 ? "file" : "files"} failed — see details below.`
          : "Upload failed — see the details below and retry.",
      );
      return;
    }
    if (succeeded > 0) {
      toast.success("Files queued — processing has started.");
      router.push("/faculty/processing");
    }
  }

  const pendingCount = files.filter(
    (f) => f.state.phase === "queued" || f.state.phase === "error",
  ).length;

  return (
    <div className="space-y-5">
      {/* Dropzone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
          dragOver ? "border-primary bg-accent" : "border-border bg-card hover:bg-muted/50",
        )}
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <UploadCloud className="size-6" />
        </div>
        <div>
          <p className="font-medium">Drop files here or tap to browse</p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF · DOCX · CSV · XLSX · TXT · images & scans — up to 50 MB each
          </p>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Answer-key mode */}
      <div className="space-y-3 rounded-2xl border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <KeyRound className="size-4 text-muted-foreground" />
            <div>
              <Label htmlFor="answer-key-mode" className="cursor-pointer font-medium">
                This is a separate answer key
              </Label>
              <p className="text-xs text-muted-foreground">
                Answers will be matched by question number to a previous upload.
              </p>
            </div>
          </div>
          <Switch id="answer-key-mode" checked={isAnswerKey} onCheckedChange={setIsAnswerKey} />
        </div>
        {isAnswerKey && (
          <Select value={linkedDocId ?? ""} onValueChange={(v) => setLinkedDocId(v || null)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select the question document it belongs to…" />
            </SelectTrigger>
            <SelectContent>
              {linkableDocuments.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">
                  No previous uploads yet — upload the question document first.
                </div>
              ) : (
                linkableDocuments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.file_name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Queue */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((item) => {
            const Icon = fileIcon(item.file.name);
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl border bg-card p-3"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.file.name}</p>
                  {item.state.phase === "uploading" ? (
                    <Progress value={item.state.progress} className="mt-1.5 h-1.5" />
                  ) : (
                    <p
                      className={cn(
                        "text-xs",
                        item.state.phase === "error" ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {item.state.phase === "queued" && `${(item.file.size / 1024 / 1024).toFixed(1)} MB · ready`}
                      {item.state.phase === "processing" && "Registering…"}
                      {item.state.phase === "done" && "Queued for AI processing"}
                      {item.state.phase === "error" && item.state.message}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  {item.state.phase === "done" && <CheckCircle2 className="size-5 text-success" />}
                  {item.state.phase === "error" && <XCircle className="size-5 text-destructive" />}
                  {(item.state.phase === "uploading" || item.state.phase === "processing") && (
                    <Spinner className="size-4" />
                  )}
                  {item.state.phase === "queued" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${item.file.name}`}
                      onClick={() => setFiles((prev) => prev.filter((f) => f.id !== item.id))}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          <div className="flex justify-end pt-1">
            <Button onClick={startUpload} disabled={busy || pendingCount === 0} className="gap-2">
              {busy ? (
                <>
                  <Spinner className="size-4" /> Uploading…
                </>
              ) : (
                <>
                  Process {pendingCount} {pendingCount === 1 ? "file" : "files"}
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
