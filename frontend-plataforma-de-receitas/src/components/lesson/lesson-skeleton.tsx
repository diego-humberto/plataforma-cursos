import { Skeleton } from "../ui/skeleton";

export default function LessonSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-2">
      <div className="lg:col-span-7 space-y-4 bg-white dark:bg-neutral-900 rounded-md">
        <Skeleton className="aspect-video w-full rounded-md" />
        <div className="flex justify-between items-center px-4 py-2">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="p-4">
          <Skeleton className="h-6 w-2/3" />
        </div>
      </div>
      <div className="lg:col-span-3 bg-white dark:bg-neutral-900 py-4 space-y-4">
        <div className="px-4 space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-3 w-full" />
        </div>
        <div className="px-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full shrink-0" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
