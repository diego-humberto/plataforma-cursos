import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import useFocusTimer from "@/hooks/useFocusTimer";

export function DailyProgressCard() {
  const subjectProgress = useFocusTimer((s) => s.cycle.subjectProgress);
  const todayHours = useFocusTimer((s) => s.getTodayHours());

  const totalCompletedMs = subjectProgress.reduce((sum, sp) => sum + sp.completedMs, 0);
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
