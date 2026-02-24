import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { Skeleton } from "../ui/skeleton";

export default function CourseSkeleton() {
  return (
    <Card className="bg-white dark:bg-neutral-900 shadow-sm border border-purple-100/50 border-b-4 border-b-purple-500/20 overflow-hidden">
      <CardHeader className="p-0">
        <Skeleton className="aspect-video w-full rounded-none" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4 py-0 pt-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-full" />
      </CardContent>
      <CardFooter className="p-4 border-t">
        <div className="flex gap-4 justify-end w-full items-center">
          <Skeleton className="h-8 w-20" />
        </div>
      </CardFooter>
    </Card>
  );
}

export function CourseSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <CourseSkeleton key={i} />
      ))}
    </div>
  );
}
