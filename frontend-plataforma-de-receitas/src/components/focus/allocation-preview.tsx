import useFocusTimer from "@/hooks/useFocusTimer";

export function AllocationPreview() {
  const subjects = useFocusTimer((s) => s.cycleConfig.subjects);
  const subjectProgress = useFocusTimer((s) => s.cycle.subjectProgress);
  const todayHours = useFocusTimer((s) => s.getTodayHours());

  if (subjects.length === 0) return null;

  const totalAllocated = subjects.reduce((sum, s) => sum + s.allocatedMinutes, 0);
  const totalAvailable = todayHours * 60;
  const isOver = totalAllocated > totalAvailable;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Alocação de Hoje ({todayHours}h)
        </h3>
        <span className={`text-xs font-semibold tabular-nums ${isOver ? "text-destructive" : "text-emerald-500"}`}>
          {totalAllocated}min / {totalAvailable}min
        </span>
      </div>
      {isOver && (
        <p className="text-xs text-destructive">
          ⚠️ O total alocado excede o tempo disponível hoje em {totalAllocated - totalAvailable}min.
        </p>
      )}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-2 font-medium">Matéria</th>
              <th className="text-center p-2 font-medium">Ênfase</th>
              <th className="text-right p-2 font-medium">Minutos</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject, idx) => {
              const mins = subjectProgress[idx]?.allocatedMinutes ?? subject.allocatedMinutes;
              return (
                <tr key={subject.id} className="border-t">
                  <td className="p-2 flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: subject.color }}
                    />
                    {subject.name}
                  </td>
                  <td className="p-2 text-center text-muted-foreground">
                    {subject.emphasis}
                  </td>
                  <td className="p-2 text-right font-medium">{mins}min</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
