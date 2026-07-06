"use client";

import { useEffect } from "react";
import { RefreshCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-6" />
      </div>
      <div>
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          An unexpected error occurred. Your work is safe — try again, and if it keeps
          happening let us know.
        </p>
      </div>
      <Button onClick={reset} className="gap-2">
        <RefreshCcw className="size-4" /> Try again
      </Button>
    </div>
  );
}
