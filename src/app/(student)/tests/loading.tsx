import { Skeleton } from "@/components/ui/skeleton";

export default function TestsLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-16 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-10 rounded-md" />
        <Skeleton className="h-12 rounded-xl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
