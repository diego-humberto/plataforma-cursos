import { useFocusTimerDisplay } from "@/hooks/useFocusTimerDisplay";
import useFocusTimer from "@/hooks/useFocusTimer";

export function PomodoroCounter() {
  const { pomodoroCount } = useFocusTimerDisplay();
  const longBreakInterval = useFocusTimer(
    (s) => s.cycleConfig.pomodoroSettings.longBreakInterval
  );

  const currentInSet = pomodoroCount % longBreakInterval;
  const dots = Array.from({ length: longBreakInterval }, (_, i) => i < currentInSet);

  return (
    <div className="flex items-center gap-1.5">
      {dots.map((filled, i) => (
        <div
          key={i}
          className={`w-2.5 h-2.5 rounded-full transition-colors ${
            filled ? "bg-purple-500" : "bg-muted-foreground/30"
          }`}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-2">
        {pomodoroCount} pomodoro{pomodoroCount !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
