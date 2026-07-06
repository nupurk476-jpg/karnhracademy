"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { saveUnit, saveTopic, toggleTaxonomyActive } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SyllabusUnit, Topic } from "@/lib/types";

export function SyllabusManager({
  units,
  topics,
  questionCounts,
}: {
  units: SyllabusUnit[];
  topics: Topic[];
  questionCounts: Record<string, number>;
}) {
  const router = useRouter();
  const [unitDialog, setUnitDialog] = useState<{ unit?: SyllabusUnit } | null>(null);
  const [topicDialog, setTopicDialog] = useState<{ unitId: string; topic?: Topic } | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleActive(table: "syllabus_units" | "topics", id: string, isActive: boolean) {
    startTransition(async () => {
      const result = await toggleTaxonomyActive({ table, id, isActive });
      if (!result.ok) toast.error(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setUnitDialog({})}>
          <Plus className="size-3.5" /> Add unit
        </Button>
      </div>

      {units.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="size-5" />}
          title="No syllabus yet"
          description="Add units and topics so the AI can classify imported questions."
        />
      ) : (
        units.map((unit) => {
          const unitTopics = topics.filter((t) => t.unit_id === unit.id);
          const unitCount = unitTopics.reduce(
            (sum, t) => sum + (questionCounts[t.id] ?? 0),
            0,
          );
          return (
            <section
              key={unit.id}
              className={cn("rounded-2xl border bg-card p-4", !unit.is_active && "opacity-60")}
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge variant="secondary" className="font-mono">
                  {unit.code}
                </Badge>
                <h2 className="font-semibold">{unit.title}</h2>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {unitCount} questions
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <Switch
                    checked={unit.is_active}
                    onCheckedChange={(v) => toggleActive("syllabus_units", unit.id, v)}
                    aria-label={`${unit.title} active`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Edit ${unit.title}`}
                    onClick={() => setUnitDialog({ unit })}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </div>
              </div>

              <ul className="mt-3 flex flex-wrap gap-2">
                {unitTopics.map((topic) => (
                  <li key={topic.id}>
                    <button
                      onClick={() => setTopicDialog({ unitId: unit.id, topic })}
                      className={cn(
                        "group flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-sm transition-colors hover:border-primary/50",
                        !topic.is_active && "opacity-50",
                      )}
                    >
                      {topic.title}
                      <span className="tabular-nums text-xs text-muted-foreground">
                        {questionCounts[topic.id] ?? 0}
                      </span>
                      <Pencil className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    onClick={() => setTopicDialog({ unitId: unit.id })}
                    className="flex items-center gap-1 rounded-full border border-dashed px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    <Plus className="size-3.5" /> Topic
                  </button>
                </li>
              </ul>
            </section>
          );
        })
      )}

      {unitDialog && (
        <UnitDialog
          unit={unitDialog.unit}
          nextOrder={units.length + 1}
          onClose={() => setUnitDialog(null)}
          onSaved={() => {
            setUnitDialog(null);
            router.refresh();
          }}
        />
      )}
      {topicDialog && (
        <TopicDialog
          unitId={topicDialog.unitId}
          topic={topicDialog.topic}
          nextOrder={topics.filter((t) => t.unit_id === topicDialog.unitId).length + 1}
          onToggleActive={(id, v) => toggleActive("topics", id, v)}
          pending={pending}
          onClose={() => setTopicDialog(null)}
          onSaved={() => {
            setTopicDialog(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function UnitDialog({
  unit,
  nextOrder,
  onClose,
  onSaved,
}: {
  unit?: SyllabusUnit;
  nextOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(unit?.code ?? `U${nextOrder}`);
  const [title, setTitle] = useState(unit?.title ?? "");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await saveUnit({
        id: unit?.id,
        code: code.trim(),
        title: title.trim(),
        order_index: unit?.order_index ?? nextOrder,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(unit ? "Unit updated." : "Unit added.");
      onSaved();
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{unit ? "Edit unit" : "New unit"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="unit-code">Code</Label>
            <Input id="unit-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="U1" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="unit-title">Title</Label>
            <Input
              id="unit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Networking Fundamentals"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !title.trim() || !code.trim()}>
            {pending ? <Spinner className="size-4" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TopicDialog({
  unitId,
  topic,
  nextOrder,
  onToggleActive,
  pending: togglePending,
  onClose,
  onSaved,
}: {
  unitId: string;
  topic?: Topic;
  nextOrder: number;
  onToggleActive: (id: string, value: boolean) => void;
  pending: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(topic?.title ?? "");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await saveTopic({
        id: topic?.id,
        unit_id: unitId,
        title: title.trim(),
        order_index: topic?.order_index ?? nextOrder,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(topic ? "Topic updated." : "Topic added.");
      onSaved();
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{topic ? "Edit topic" : "New topic"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="topic-title">Title</Label>
            <Input
              id="topic-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="OSI Model"
            />
          </div>
          {topic && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="topic-active" className="cursor-pointer text-sm">
                Active (available for classification)
              </Label>
              <Switch
                id="topic-active"
                checked={topic.is_active}
                disabled={togglePending}
                onCheckedChange={(v) => onToggleActive(topic.id, v)}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !title.trim()}>
            {pending ? <Spinner className="size-4" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
