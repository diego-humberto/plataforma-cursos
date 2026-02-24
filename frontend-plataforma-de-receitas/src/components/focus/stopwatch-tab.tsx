import { useState, useEffect, useRef } from "react";
import { Play, Pause, Square, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useStopwatch from "@/hooks/useStopwatch";
import useApiUrl from "@/hooks/useApiUrl";
import { createFocusSession } from "@/services/focusSessions";
import { toast } from "sonner";

const QUICK_LABELS = ["Anki", "Leitura", "Revisão", "Exercícios"];

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toLocalDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function StopwatchTab() {
  const { apiUrl } = useApiUrl();
  const status = useStopwatch((s) => s.status);
  const label = useStopwatch((s) => s.label);
  const sessionStartedAt = useStopwatch((s) => s.sessionStartedAt);
  const setLabel = useStopwatch((s) => s.setLabel);
  const start = useStopwatch((s) => s.start);
  const pause = useStopwatch((s) => s.pause);
  const resume = useStopwatch((s) => s.resume);
  const reset = useStopwatch((s) => s.reset);
  const getElapsedMs = useStopwatch((s) => s.getElapsedMs);

  const [display, setDisplay] = useState("00:00:00");
  const [saving, setSaving] = useState(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (status !== "running") {
      setDisplay(formatTime(getElapsedMs()));
      return;
    }

    let active = true;
    const tick = () => {
      if (!active) return;
      setDisplay(formatTime(getElapsedMs()));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [status, getElapsedMs]);

  const handleStopAndSave = async () => {
    if (status === "running") pause();

    const elapsedMs = getElapsedMs();
    const durationSeconds = Math.round(elapsedMs / 1000);

    if (durationSeconds < 1) {
      toast.error("Sessão muito curta para salvar.");
      reset();
      return;
    }

    setSaving(true);
    try {
      const now = new Date();
      await createFocusSession(apiUrl, {
        subject_name: label,
        subject_id: toSlug(label),
        started_at: sessionStartedAt?.toISOString() || now.toISOString(),
        ended_at: now.toISOString(),
        duration_seconds: durationSeconds,
        mode: "focus",
        completed: true,
        date: toLocalDateStr(),
      });
      toast.success(`${label} - ${formatTime(elapsedMs)} salvo!`);
      reset();
    } catch {
      toast.error("Erro ao salvar sessão.");
    } finally {
      setSaving(false);
    }
  };

  const isIdle = status === "idle";
  const isRunning = status === "running";
  const isPaused = status === "paused";

  return (
    <div className="space-y-6">
      {/* Label input */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Atividade</h3>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex: Anki, Leitura, Revisão..."
          disabled={!isIdle}
        />
        {isIdle && (
          <div className="flex flex-wrap gap-2">
            {QUICK_LABELS.map((ql) => (
              <button
                key={ql}
                onClick={() => setLabel(ql)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  label === ql
                    ? "bg-purple-500 text-white border-purple-500"
                    : "bg-card hover:bg-accent/50 border-border"
                }`}
              >
                {ql}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Timer display */}
      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          {!isIdle && (
            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
              {label}
            </span>
          )}
          <span className="text-6xl font-mono font-bold tabular-nums tracking-tight text-foreground">
            {display}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {isIdle && (
            <Button
              onClick={start}
              disabled={!label.trim()}
              size="lg"
              className="gap-2 bg-purple-600 hover:bg-purple-700"
            >
              <Play className="h-5 w-5" />
              Iniciar
            </Button>
          )}

          {isRunning && (
            <>
              <Button onClick={pause} variant="outline" size="lg" className="gap-2">
                <Pause className="h-5 w-5" />
                Pausar
              </Button>
              <Button
                onClick={handleStopAndSave}
                size="lg"
                className="gap-2 bg-green-600 hover:bg-green-700"
                disabled={saving}
              >
                <Save className="h-5 w-5" />
                Parar e Salvar
              </Button>
            </>
          )}

          {isPaused && (
            <>
              <Button onClick={resume} size="lg" className="gap-2 bg-purple-600 hover:bg-purple-700">
                <Play className="h-5 w-5" />
                Retomar
              </Button>
              <Button
                onClick={handleStopAndSave}
                size="lg"
                className="gap-2 bg-green-600 hover:bg-green-700"
                disabled={saving}
              >
                <Save className="h-5 w-5" />
                Parar e Salvar
              </Button>
              <Button onClick={reset} variant="ghost" size="lg" className="gap-2 text-destructive">
                <Square className="h-5 w-5" />
                Descartar
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
