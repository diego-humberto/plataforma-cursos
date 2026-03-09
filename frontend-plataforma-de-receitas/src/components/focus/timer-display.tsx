import { CircularProgress } from "./circular-progress";
import { MODE_COLORS, MODE_LABELS } from "./constants";
import { Badge } from "@/components/ui/badge";
import { useFocusTimerDisplay } from "@/hooks/useFocusTimerDisplay";
import useFocusTimer from "@/hooks/useFocusTimer";

export function TimerDisplay() {
  const { progress, display, mode } = useFocusTimerDisplay();
  const currentSubject = useFocusTimer((s) => s.getCurrentSubject());
  const syncStatus = useFocusTimer((s) => s.syncStatus);
  const isHydrating = useFocusTimer((s) => s.isHydrating);
  const colors = MODE_COLORS[mode];

  return (
    <div className="flex flex-col items-center gap-4">
      <CircularProgress progress={progress} mode={mode}>
        <div className="flex flex-col items-center gap-2">
          <Badge variant="outline" className={colors.badge}>
            {MODE_LABELS[mode]}
          </Badge>
          <span className={`text-5xl font-mono font-bold tabular-nums ${colors.text}`}>
            {display}
          </span>
          {currentSubject && mode === "focus" && (
            <span className="text-sm text-muted-foreground max-w-[180px] truncate text-center">
              {currentSubject.name}
            </span>
          )}
        </div>
      </CircularProgress>

      {(isHydrating || syncStatus === "error") && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {isHydrating ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
              <span>Sincronizando...</span>
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              <span>Backend offline</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
