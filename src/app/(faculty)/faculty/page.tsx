import type { Metadata } from "next";
import Link from "next/link";
import {
  Upload,
  ListChecks,
  CopyX,
  FileStack,
  BookOpenCheck,
  CircleAlert,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Faculty overview" };

export default async function FacultyOverviewPage() {
  const supabase = await createClient();

  const [pending, published, total, openDupes, activeJobs, missingAnswers] = await Promise.all([
    supabase.from("questions").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("questions").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("questions").select("id", { count: "exact", head: true }).not("status", "in", '("rejected","duplicate")'),
    supabase.from("question_duplicates").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("ingestion_jobs").select("id", { count: "exact", head: true }).in("status", ["pending", "extracting", "parsing", "enriching"]),
    supabase.from("questions").select("id", { count: "exact", head: true }).eq("status", "pending_review").is("correct_options", null).is("answer_text", null),
  ]);

  const cards = [
    {
      label: "Awaiting review",
      value: pending.count ?? 0,
      hint: "Imported, needs human approval",
      icon: <ListChecks className="size-4" />,
    },
    {
      label: "Published",
      value: published.count ?? 0,
      hint: "Live for students",
      icon: <BookOpenCheck className="size-4" />,
    },
    {
      label: "Question bank",
      value: total.count ?? 0,
      hint: "All non-rejected questions",
      icon: <FileStack className="size-4" />,
    },
    {
      label: "Open duplicates",
      value: openDupes.count ?? 0,
      hint: "Pairs needing resolution",
      icon: <CopyX className="size-4" />,
    },
  ];

  return (
    <div className="container max-w-6xl animate-fade-in-up space-y-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content overview</h1>
          <p className="text-sm text-muted-foreground">
            Everything students see passes through your review.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/faculty/upload">
            <Upload className="size-4" /> Upload documents
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Needs your attention</h2>
          </div>
          <ul className="space-y-3 text-sm">
            <AttentionRow
              show={(pending.count ?? 0) > 0}
              href="/faculty/review"
              label={`${pending.count} questions waiting in the review queue`}
            />
            <AttentionRow
              show={(missingAnswers.count ?? 0) > 0}
              href="/faculty/review?missing=answer"
              label={`${missingAnswers.count} imported questions have no answer yet`}
              tone="warn"
            />
            <AttentionRow
              show={(openDupes.count ?? 0) > 0}
              href="/faculty/duplicates"
              label={`${openDupes.count} potential duplicate pairs to resolve`}
            />
            <AttentionRow
              show={(activeJobs.count ?? 0) > 0}
              href="/faculty/processing"
              label={`${activeJobs.count} documents still processing`}
            />
            {(pending.count ?? 0) === 0 &&
              (openDupes.count ?? 0) === 0 &&
              (activeJobs.count ?? 0) === 0 && (
                <li className="flex items-center gap-2 text-muted-foreground">
                  All clear — upload new material to grow the bank.
                </li>
              )}
          </ul>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <h2 className="mb-3 font-semibold">How ingestion works</h2>
          <ol className="space-y-2.5 text-sm text-muted-foreground">
            {[
              "Upload PDFs, Word docs, spreadsheets or scans — any format, any mess.",
              "AI extracts text (OCR when needed), splits questions and captures every field it can find. It never invents missing answers.",
              "Each question gets confidence scores, topic classification, difficulty, keywords and duplicate checks.",
              "Everything lands in the Review Queue. Only questions you publish reach students.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <Badge variant="secondary" className="h-5 shrink-0 rounded-full px-2 tabular-nums">
                  {i + 1}
                </Badge>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function AttentionRow({
  show,
  href,
  label,
  tone,
}: {
  show: boolean;
  href: string;
  label: string;
  tone?: "warn";
}) {
  if (!show) return null;
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center justify-between gap-2 rounded-lg border p-3 transition-colors hover:bg-muted"
      >
        <span className="flex items-center gap-2">
          {tone === "warn" && <CircleAlert className="size-4 shrink-0 text-warning" />}
          {label}
        </span>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Link>
    </li>
  );
}
