import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import useFocusTimer from "@/hooks/useFocusTimer";
import type { TimerType } from "@/models/models";

export function PomodoroSettingsForm() {
  const settings = useFocusTimer((s) => s.cycleConfig.pomodoroSettings);
  const status = useFocusTimer((s) => s.timer.status);
  const update = useFocusTimer((s) => s.updatePomodoroSettings);

  const isContinuous = settings.timerType === "continuous";

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold">Modo do Timer</h3>

      <div className="grid grid-cols-2 gap-3">
        {(["continuous", "pomodoro"] as TimerType[]).map((type) => (
          <button
            key={type}
            onClick={() => {
              if (status === "idle") update({ timerType: type });
            }}
            disabled={status !== "idle"}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              settings.timerType === type
                ? "border-purple-500 bg-purple-500/10"
                : "border-muted hover:border-muted-foreground/30"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <p className="text-sm font-semibold">
              {type === "continuous" ? "Contínuo" : "Pomodoro"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {type === "continuous"
                ? "Timer = tempo alocado da matéria. Ao completar, avança para a próxima."
                : "Ciclos de foco/pausa (25/5/15min). Pausas curtas e longas automáticas."}
            </p>
          </button>
        ))}
      </div>

      {!isContinuous && (
        <>
          <h3 className="text-sm font-semibold">Configurações do Pomodoro</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="focus-min">Foco (min)</Label>
              <Input
                id="focus-min"
                type="number"
                min="1"
                max="120"
                value={settings.focusMinutes}
                onChange={(e) => update({ focusMinutes: parseInt(e.target.value) || 25 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="short-break">Pausa Curta (min)</Label>
              <Input
                id="short-break"
                type="number"
                min="1"
                max="30"
                value={settings.shortBreakMinutes}
                onChange={(e) => update({ shortBreakMinutes: parseInt(e.target.value) || 5 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="long-break">Pausa Longa (min)</Label>
              <Input
                id="long-break"
                type="number"
                min="1"
                max="60"
                value={settings.longBreakMinutes}
                onChange={(e) => update({ longBreakMinutes: parseInt(e.target.value) || 15 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="long-interval">Pausa longa a cada</Label>
            <div className="flex items-center gap-2">
              <Input
                id="long-interval"
                type="number"
                min="2"
                max="10"
                value={settings.longBreakInterval}
                className="w-20"
                onChange={(e) => update({ longBreakInterval: parseInt(e.target.value) || 4 })}
              />
              <span className="text-sm text-muted-foreground">pomodoros</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="auto-breaks"
                checked={settings.autoStartBreaks}
                onCheckedChange={(checked) => update({ autoStartBreaks: !!checked })}
              />
              <Label htmlFor="auto-breaks" className="text-sm font-normal cursor-pointer">
                Iniciar pausas automaticamente
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="auto-focus"
                checked={settings.autoStartFocus}
                onCheckedChange={(checked) => update({ autoStartFocus: !!checked })}
              />
              <Label htmlFor="auto-focus" className="text-sm font-normal cursor-pointer">
                Iniciar foco automaticamente após pausa
              </Label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
