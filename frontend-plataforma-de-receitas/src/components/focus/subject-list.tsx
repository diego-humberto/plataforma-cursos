import { Trash2, Info, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useFocusTimer from "@/hooks/useFocusTimer";
import { AddSubjectForm } from "./add-subject-form";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SubjectList() {
  const subjects = useFocusTimer((s) => s.cycleConfig.subjects);
  const updateSubject = useFocusTimer((s) => s.updateSubject);
  const removeSubject = useFocusTimer((s) => s.removeSubject);
  const moveSubject = useFocusTimer((s) => s.moveSubject);
  const status = useFocusTimer((s) => s.timer.status);

  const totalEmphasis = subjects.reduce((sum, s) => sum + s.emphasis, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">Matérias do Ciclo</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p className="text-xs">
                A <strong>ênfase</strong> define o peso relativo de cada matéria (escala 1-10).
                Matérias com ênfase maior recebem mais tempo proporcionalmente.
                Ex: ênfase 8 recebe o dobro de tempo que ênfase 4.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {subjects.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhuma matéria adicionada. Adicione abaixo para começar.
        </p>
      )}

      <div className="space-y-2">
        {subjects.map((subject, index) => {
          const pct = totalEmphasis > 0 ? Math.round((subject.emphasis / totalEmphasis) * 100) : 0;
          return (
            <div key={subject.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              {status === "idle" && subjects.length > 1 && (
                <div className="flex flex-col shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => moveSubject(index, "up")}
                    disabled={index === 0}
                    className="h-5 w-5 p-0"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => moveSubject(index, "down")}
                    disabled={index === subjects.length - 1}
                    className="h-5 w-5 p-0"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              <input
                type="color"
                value={subject.color}
                onChange={(e) => updateSubject(subject.id, { color: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer border-0 p-0 shrink-0"
                title="Cor da matéria"
              />
              <Input
                value={subject.name}
                onChange={(e) => updateSubject(subject.id, { name: e.target.value })}
                className="flex-1 min-w-0"
                disabled={status !== "idle"}
              />
              <div className="flex items-center gap-2 shrink-0">
                <label className="text-xs text-muted-foreground whitespace-nowrap">Ênfase</label>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  max="10"
                  value={subject.emphasis}
                  onChange={(e) => updateSubject(subject.id, { emphasis: parseInt(e.target.value) || 5 })}
                  className="w-16 text-center"
                  disabled={status !== "idle"}
                />
                <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">{pct}%</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeSubject(subject.id)}
                disabled={status !== "idle"}
                className="text-destructive hover:text-destructive shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      {status === "idle" && <AddSubjectForm />}

      {subjects.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Ênfase de 1 (menor prioridade) a 10 (maior prioridade). O tempo é distribuído proporcionalmente entre as matérias.
        </p>
      )}
    </div>
  );
}
