"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SyllabusUnit } from "@/lib/types";

const STATUS_TABS = [
  { value: "pending_review", label: "Needs review" },
  { value: "approved", label: "Approved" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Archived" },
];

const MISSING_OPTIONS = [
  { value: "all", label: "Any completeness" },
  { value: "answer", label: "Missing answer" },
  { value: "explanation", label: "Missing explanation" },
  { value: "topic", label: "Unclassified" },
];

export function ReviewFilters({
  units,
  totalCount,
}: {
  units: SyllabusUnit[];
  totalCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value === null || value === "" || value === "all") next.delete(key);
      else next.set(key, value);
      next.delete("page");
      router.push(`${pathname}?${next.toString()}`);
    },
    [pathname, router, searchParams],
  );

  // Debounced stem search
  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (search === current) return;
    const t = setTimeout(() => setParam("q", search || null), 350);
    return () => clearTimeout(t);
  }, [search, searchParams, setParam]);

  const activeStatus = searchParams.get("status") ?? "pending_review";
  const jobFilter = searchParams.get("job");

  return (
    <div className="space-y-3">
      {/* Status tabs */}
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            aria-pressed={activeStatus === tab.value}
            onClick={() => setParam("status", tab.value === "pending_review" ? null : tab.value)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              activeStatus === tab.value
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            {tab.label}
            {activeStatus === tab.value && (
              <span className="ml-1.5 tabular-nums opacity-80">{totalCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search question text…"
            className="h-9 pl-8"
          />
        </div>

        <Select
          value={searchParams.get("unit") ?? "all"}
          onValueChange={(v) => setParam("unit", v)}
        >
          <SelectTrigger className="h-9 w-36 sm:w-44">
            <SelectValue placeholder="All units" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All units</SelectItem>
            {units.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.code} · {u.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("missing") ?? "all"}
          onValueChange={(v) => setParam("missing", v)}
        >
          <SelectTrigger className="h-9 w-40 sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MISSING_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={searchParams.get("confidence") === "low" ? "default" : "outline"}
          size="sm"
          className="h-9"
          onClick={() =>
            setParam("confidence", searchParams.get("confidence") === "low" ? null : "low")
          }
        >
          Low confidence
        </Button>

        {jobFilter && (
          <Button variant="secondary" size="sm" className="h-9 gap-1.5" onClick={() => setParam("job", null)}>
            Filtered by import <X className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
