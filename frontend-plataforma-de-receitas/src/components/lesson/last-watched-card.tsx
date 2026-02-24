import useSelectedLesson from "@/hooks/useSelectedLesson";
import { Lesson } from "@/models/models";
import { getLastViewedLesson } from "@/utils/utils";
import { formatDuration } from "@/utils/format-duration";
import { ChevronRight, FolderOpen, Play, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";

type Props = {
  courseId: string;
};

export default function LastWatchedCard({ courseId }: Props) {
  const [lesson, setLesson] = useState<Lesson | undefined>();

  const { selectLesson, selectedLesson } = useSelectedLesson();

  useEffect(() => {
    const lastWatched = getLastViewedLesson(courseId);

    if (lastWatched?.id != selectedLesson?.id && lastWatched != null) {
      setLesson(lastWatched);
    }
  }, []);

  if (!lesson) {
    return null;
  }

  const moduleParts = lesson.module?.split("/").filter(Boolean) || [];
  const ext = (lesson.video_url || lesson.pdf_url || "").split(".").pop()?.toLowerCase() || "";
  const isVideo = ["mp4", "avi", "mov", "wmv", "flv", "mkv", "webm"].includes(ext);

  return (
    <div className="m-2 rounded-lg bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 overflow-hidden">
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            Continuar de onde parou
          </span>
          <button
            onClick={() => setLesson(undefined)}
            className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {moduleParts.length > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1.5 flex-wrap">
            <FolderOpen className="h-3 w-3 shrink-0" />
            {moduleParts.map((part, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-2.5 w-2.5 shrink-0 opacity-50" />}
                <span className="truncate max-w-[120px]">{part}</span>
              </span>
            ))}
          </div>
        )}

        <p className="text-sm font-medium leading-snug line-clamp-2">{lesson.title}</p>

        <div className="flex items-center gap-2 mt-1.5">
          {ext && (
            <code className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-semibold border ${
              isVideo
                ? "bg-blue-500/10 text-blue-700 border-blue-200 dark:border-blue-900 dark:text-blue-400"
                : "bg-red-500/10 text-red-700 border-red-200 dark:border-red-900 dark:text-red-400"
            }`}>
              {ext}
            </code>
          )}
          {lesson.duration && lesson.duration !== "0" && (
            <span className="text-[10px] text-muted-foreground">
              {formatDuration(Number(lesson.duration))}
            </span>
          )}
        </div>
      </div>

      <Button
        size="sm"
        variant="default"
        className="w-full rounded-none h-8 text-xs gap-1.5"
        onClick={() => {
          selectLesson(lesson);
          setLesson(undefined);
        }}
      >
        <Play className="h-3 w-3 fill-current" />
        Continuar
      </Button>
    </div>
  );
}
