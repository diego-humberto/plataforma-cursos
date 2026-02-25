import { Play, Pause, RotateCcw, SkipForward, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useFocusTimer from "@/hooks/useFocusTimer";

export function TimerControls() {
  const status = useFocusTimer((s) => s.timer.status);
  const startTimer = useFocusTimer((s) => s.startTimer);
  const pauseTimer = useFocusTimer((s) => s.pauseTimer);
  const resumeTimer = useFocusTimer((s) => s.resumeTimer);
  const resetTimer = useFocusTimer((s) => s.resetTimer);
  const skipTimer = useFocusTimer((s) => s.skipTimer);
  const saveAndStopTimer = useFocusTimer((s) => s.saveAndStopTimer);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={resetTimer}
              disabled={status === "idle"}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Resetar</TooltipContent>
        </Tooltip>

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

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={skipTimer}
              disabled={status === "idle"}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Pular</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={saveAndStopTimer}
              disabled={status === "idle"}
            >
              <Save className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Salvar progresso e parar</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
