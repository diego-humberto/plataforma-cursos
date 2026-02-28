import { Lesson } from "@/models/models";
import { formatDuration } from "@/utils/format-duration";
import { Checkbox } from "../ui/checkbox";
import { memo, useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import useApiUrl from "@/hooks/useApiUrl";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

type Props = {
  lesson: Lesson;
  selectedLessonId: number | undefined;
  index: number;
  onSelect: () => void;
  onComplete: () => void;
};

const LessonListItem = memo(function LessonListItem({
  lesson,
  selectedLessonId,
  index,
  onSelect,
  onComplete,
}: Props) {
  const [isCompleted, setIsCompleted] = useState(Boolean(lesson.isCompleted));

  // Sincronizar estado local com prop (para batch toggle funcionar)
  useEffect(() => {
    setIsCompleted(Boolean(lesson.isCompleted));
  }, [lesson.isCompleted]);

  const { apiUrl } = useApiUrl();

  const filePath = lesson.pdf_url || lesson.video_url || "";
  const isDocument = filePath.toLowerCase().endsWith(".pdf") ||
    filePath.toLowerCase().endsWith(".html") ||
    filePath.toLowerCase().endsWith(".txt");

  const fileExt = (lesson.video_url || lesson.pdf_url).split(".").pop() ?? "";

  async function toggleIsCompleted() {
    setIsCompleted((v) => !v);

    try {
      await api.post(`${apiUrl}/api/update-lesson-progress`, {
        lessonId: lesson.id,
        isCompleted: !isCompleted,
      });
      onComplete();
    } catch {
      toast.error("Erro ao concluir aula");
    }
  }

  async function openExternally(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await api.post(`${apiUrl}/api/open-file`, { path: filePath });
    } catch {
      toast.error("Erro ao abrir arquivo.");
    }
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 w-full min-h-[3.5rem] my-1 px-3 py-3 border rounded-md transition-all hover:border-purple-500",
        selectedLessonId === lesson.id
          ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
          : "border-border bg-card"
      )}
    >
      <div
        className="flex-1 cursor-pointer flex items-start gap-2 min-w-0"
        onClick={onSelect}
      >
        <span className="text-xs text-muted-foreground font-mono w-6 shrink-0 text-right mt-0.5">
          {index}
        </span>

        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          <p className="text-xs font-medium leading-snug text-left break-words">
            {lesson.title}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <code className={cn(
              "px-1.5 py-0.5 rounded text-[10px] uppercase shrink-0 font-semibold border",
              fileExt.toLowerCase() === "mp4" || fileExt.toLowerCase() === "mkv" || fileExt.toLowerCase() === "avi" || fileExt.toLowerCase() === "webm"
                ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                : fileExt.toLowerCase() === "pdf"
                ? "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700"
            )}>
              {fileExt}
            </code>

            {lesson.duration != "0" && (
              <code className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-muted-foreground border border-neutral-200 dark:border-neutral-700 rounded text-[10px] shrink-0">
                {formatDuration(Number(lesson.duration))}
              </code>
            )}

            {isDocument && (
              <button
                onClick={openExternally}
                className="p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors"
                title="Abrir externamente"
              >
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      <Checkbox
        checked={isCompleted}
        onCheckedChange={toggleIsCompleted}
        className="shrink-0 mt-0.5"
      />
    </div>
  );
}, (prev, next) => {
  return (
    prev.lesson.id === next.lesson.id &&
    prev.lesson.isCompleted === next.lesson.isCompleted &&
    prev.selectedLessonId === next.selectedLessonId &&
    prev.index === next.index
  );
});

export default LessonListItem;
