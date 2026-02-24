import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import useFocusTimer from "@/hooks/useFocusTimer";

export function TimerControls() {
  const status = useFocusTimer((s) => s.timer.status);
  const startTimer = useFocusTimer((s) => s.startTimer);
  const pauseTimer = useFocusTimer((s) => s.pauseTimer);
  const resumeTimer = useFocusTimer((s) => s.resumeTimer);
  const resetTimer = useFocusTimer((s) => s.resetTimer);
  const skipTimer = useFocusTimer((s) => s.skipTimer);

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="icon"
        onClick={resetTimer}
        disabled={status === "idle"}
        title="Resetar"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>

      {status === "running" ? (
        <Button size="lg" onClick={pauseTimer} className="px-8">
          <Pause className="h-5 w-5 mr-2" />
          Pausar
        </Button>
      ) : status === "paused" ? (
        <Button size="lg" onClick={resumeTimer} className="px-8">
          <Play className="h-5 w-5 mr-2" />
          Retomar
        </Button>
      ) : (
        <Button size="lg" onClick={startTimer} className="px-8">
          <Play className="h-5 w-5 mr-2" />
          Iniciar
        </Button>
      )}

      <Button
        variant="outline"
        size="icon"
        onClick={skipTimer}
        disabled={status === "idle"}
        title="Pular"
      >
        <SkipForward className="h-4 w-4" />
      </Button>
    </div>
  );
}
