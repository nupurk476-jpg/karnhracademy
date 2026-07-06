import { Skeleton } from "@/components/ui/skeleton";

export default function BookmarksLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-full rounded-md sm:w-52" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
