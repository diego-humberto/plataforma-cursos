import { Input } from "@/components/ui/input";
import { WEEKDAY_LABELS } from "./constants";
import useFocusTimer from "@/hooks/useFocusTimer";
import type { DailyHoursConfig } from "@/models/models";

export function WeeklyHoursConfig() {
  const dailyHours = useFocusTimer((s) => s.cycleConfig.dailyHours);
  const updateDailyHours = useFocusTimer((s) => s.updateDailyHours);

  const days = Object.keys(WEEKDAY_LABELS) as (keyof DailyHoursConfig)[];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Horas por Dia da Semana</h3>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => (
          <div key={day} className="flex flex-col items-center gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              {WEEKDAY_LABELS[day]}
            </label>
            <Input
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={dailyHours[day]}
              onChange={(e) =>
                updateDailyHours({ [day]: parseFloat(e.target.value) || 0 })
              }
              className="text-center w-full"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
