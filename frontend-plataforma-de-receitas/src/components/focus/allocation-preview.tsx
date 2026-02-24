import useFocusTimer from "@/hooks/useFocusTimer";

export function AllocationPreview() {
  const subjects = useFocusTimer((s) => s.cycleConfig.subjects);
  const subjectProgress = useFocusTimer((s) => s.cycle.subjectProgress);
  const todayHours = useFocusTimer((s) => s.getTodayHours());

  if (subjects.length === 0) return null;

  const totalEmphasis = subjects.reduce((sum, s) => sum + s.emphasis, 0);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">
        Alocação de Hoje ({todayHours}h)
      </h3>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-2 font-medium">Matéria</th>
              <th className="text-center p-2 font-medium">Ênfase</th>
              <th className="text-center p-2 font-medium">%</th>
              <th className="text-right p-2 font-medium">Minutos</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject, idx) => {
              const pct = totalEmphasis > 0 ? (subject.emphasis / totalEmphasis) * 100 : 0;
              const mins = subjectProgress[idx]?.allocatedMinutes ?? 0;
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
                  <td className="p-2 text-center text-muted-foreground">
                    {pct.toFixed(0)}%
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
