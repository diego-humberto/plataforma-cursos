import { useState, useEffect } from "react";
import { Calendar, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MODE_LABELS } from "./constants";
import { getFocusSessions, deleteFocusSession } from "@/services/focusSessions";
import useApiUrl from "@/hooks/useApiUrl";
import type { FocusSession, TimerMode } from "@/models/models";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}min` : `${h}h`;
  return `${m}min`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function SessionHistory() {
  const { apiUrl } = useApiUrl();
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSessions = () => {
    setLoading(true);
    getFocusSessions(apiUrl, date)
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSessions();
  }, [apiUrl, date]);

  const handleDelete = async (id: number) => {
    try {
      await deleteFocusSession(apiUrl, id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {}
  };

  const focusSessions = sessions.filter((s) => s.mode === "focus");
  const totalSeconds = focusSessions.reduce((sum, s) => sum + s.duration_seconds, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-auto"
        />
        {focusSessions.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {focusSessions.length} sessões - {formatDuration(totalSeconds)} de foco
          </span>
        )}
      </div>

      {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {!loading && sessions.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma sessão nesta data.</p>
      )}

      <div className="space-y-2">
        {sessions.map((session) => (
          <Card key={session.id} className="group">
            <CardContent className="py-3 px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs">
                  {MODE_LABELS[session.mode as TimerMode] ?? session.mode}
                </Badge>
                <span className="text-sm font-medium">{session.subject_name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{formatTime(session.started_at)}</span>
                <span>{formatDuration(session.duration_seconds)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                  onClick={() => session.id && handleDelete(session.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
