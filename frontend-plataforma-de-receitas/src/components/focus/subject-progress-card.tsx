import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import useFocusTimer from "@/hooks/useFocusTimer";

function formatMinutes(ms: number): string {
  const mins = Math.floor(ms / 60000);
  return `${mins}min`;
}

export function SubjectProgressCard() {
  const subjects = useFocusTimer((s) => s.cycleConfig.subjects);
  const currentIndex = useFocusTimer((s) => s.cycle.currentSubjectIndex);
  const subjectProgress = useFocusTimer((s) => s.cycle.subjectProgress);

  const subject = subjects[currentIndex];
  const progress = subjectProgress[currentIndex];

  if (!subject || !progress) return null;

  const allocatedMs = progress.allocatedMinutes * 60000;
  const pct = allocatedMs > 0 ? Math.min(100, (progress.completedMs / allocatedMs) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color }} />
          {subject.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Progress value={pct} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatMinutes(progress.completedMs)} estudados</span>
          <span>Meta: {progress.allocatedMinutes}min</span>
        </div>
      </CardContent>
    </Card>
  );
}
