import { Check, Trophy } from "lucide-react";
import useFocusTimer from "@/hooks/useFocusTimer";

export function CycleSubjectBar() {
  const subjects = useFocusTimer((s) => s.cycleConfig.subjects);
  const currentIndex = useFocusTimer((s) => s.cycle.currentSubjectIndex);
  const subjectProgress = useFocusTimer((s) => s.cycle.subjectProgress);
  const completedCycles = useFocusTimer((s) => s.cycle.completedCycles);
  const switchToSubject = useFocusTimer((s) => s.switchToSubject);
  const status = useFocusTimer((s) => s.timer.status);

  if (subjects.length === 0) return null;

  const doneCount = subjectProgress.filter(
    (p) => p.allocatedMinutes > 0 && p.completedMs >= p.allocatedMinutes * 60000
  ).length;
  const allDone = doneCount === subjects.length && subjects.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 justify-center">
        {subjects.map((subject, idx) => {
          const progress = subjectProgress[idx];
          const isDone =
            progress &&
            progress.allocatedMinutes > 0 &&
            progress.completedMs >= progress.allocatedMinutes * 60000;
          const isCurrent = idx === currentIndex;

          return (
            <button
              key={subject.id}
              onClick={() => {
                if (status === "idle") switchToSubject(idx);
              }}
              disabled={status !== "idle"}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all
                ${isCurrent
                  ? "ring-2 ring-offset-2 ring-offset-background text-white shadow-md"
                  : isDone
                    ? "bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }
                disabled:cursor-not-allowed
              `}
              style={isCurrent ? { backgroundColor: subject.color, "--tw-ring-color": subject.color } as React.CSSProperties : undefined}
            >
              {isDone && <Check className="h-3.5 w-3.5 shrink-0" />}
              {subject.name}
            </button>
          );
        })}
      </div>

      {/* Cycle progress indicator */}
      <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
        <span>{doneCount}/{subjects.length} matérias</span>
        {(completedCycles || 0) > 0 && (
          <span className="flex items-center gap-1 text-amber-500 font-medium">
            <Trophy className="h-3.5 w-3.5" />
            {completedCycles} {completedCycles === 1 ? "ciclo completo" : "ciclos completos"}
          </span>
        )}
      </div>

      {allDone && (completedCycles || 0) > 0 && (
        <div className="text-center py-2 px-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <p className="text-sm font-medium text-green-600 dark:text-green-400">
            Ciclo completo! Pronto para o próximo.
          </p>
        </div>
      )}
    </div>
  );
}
