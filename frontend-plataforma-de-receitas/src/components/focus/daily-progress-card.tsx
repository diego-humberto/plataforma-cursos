import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import useFocusTimer from "@/hooks/useFocusTimer";
import useApiUrl from "@/hooks/useApiUrl";
import { getFocusSessions } from "@/services/focusSessions";

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DailyProgressCard() {
  const { apiUrl } = useApiUrl();
  const subjectProgress = useFocusTimer((s) => s.cycle.subjectProgress);
  const todayHours = useFocusTimer((s) => s.getTodayHours());
  const pomodoroCount = useFocusTimer((s) => s.timer.pomodoroCount);

  const [stopwatchMs, setStopwatchMs] = useState(0);

  // Buscar sessões do cronômetro livre do banco
  useEffect(() => {
    const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(id);

    getFocusSessions(apiUrl, getTodayStr())
      .then((sessions) => {
        let total = 0;
        for (const s of sessions) {
          if (s.mode === "focus" && s.subject_id && !isUuid(s.subject_id)) {
            total += s.duration_seconds * 1000;
          }
        }
        setStopwatchMs(total);
      })
      .catch(() => {});
  }, [apiUrl, pomodoroCount]);

  // Ciclo (subjectProgress) + Cronômetro livre (banco)
  const cycleMs = subjectProgress.reduce((sum, sp) => sum + sp.completedMs, 0);
  const totalCompletedMs = cycleMs + stopwatchMs;
  const totalAllocatedMs = todayHours * 60 * 60 * 1000;
  const pct = totalAllocatedMs > 0 ? Math.min(100, (totalCompletedMs / totalAllocatedMs) * 100) : 0;

  const completedHours = Math.floor(totalCompletedMs / 3600000);
  const completedMins = Math.floor((totalCompletedMs % 3600000) / 60000);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Progresso do Dia</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Progress value={pct} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {completedHours > 0 ? `${completedHours}h ` : ""}
            {completedMins}min estudados
          </span>
          <span>Meta: {todayHours}h</span>
        </div>
      </CardContent>
    </Card>
  );
}
