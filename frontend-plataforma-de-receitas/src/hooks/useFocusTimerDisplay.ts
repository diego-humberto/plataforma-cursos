import { useState, useEffect, useRef, useCallback } from "react";
import useFocusTimer from "./useFocusTimer";
import { MODE_LABELS } from "@/components/focus/constants";

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const originalTitle = document.title;

function playNotificationSound() {
  try {
    const ctx = new AudioContext();

    // Tríade ascendente (C5 → E5 → G5) para chamar mais atenção
    const notes = [
      { freq: 523, start: 0, end: 0.5 },
      { freq: 659, start: 0.3, end: 1.0 },
      { freq: 784, start: 0.6, end: 1.5 },
    ];

    notes.forEach(({ freq, start, end }, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.value = 0.35;
      osc.start(ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + end);
      osc.stop(ctx.currentTime + end);
      if (i === notes.length - 1) {
        osc.onended = () => ctx.close();
      }
    });
  } catch {
    // AudioContext not available
  }
}

function sendBrowserNotification(title: string, body: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/vite.svg" });
  }
}

export function useFocusTimerDisplay() {
  const timer = useFocusTimer((s) => s.timer);
  const cycleConfig = useFocusTimer((s) => s.cycleConfig);
  const completeTimer = useFocusTimer((s) => s.completeTimer);
  const getCurrentSubject = useFocusTimer((s) => s.getCurrentSubject);
  const [, setTick] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const prevModeRef = useRef(timer.mode);
  const prevPomodoroCountRef = useRef(timer.pomodoroCount);

  // Force re-render every second while running
  useEffect(() => {
    if (timer.status !== "running") return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [timer.status]);

  // Web Worker for background tab detection
  useEffect(() => {
    if (timer.status === "running" && timer.startedAt) {
      const remaining = timer.durationMs - timer.accumulatedMs;
      const target = timer.startedAt + remaining;

      try {
        if (!workerRef.current) {
          workerRef.current = new Worker("/focus-worker.js");
        }
        workerRef.current.onmessage = (e) => {
          if (e.data.type === "complete") {
            completeTimer();
          }
        };
        workerRef.current.postMessage({ type: "start", target });
      } catch {
        // Worker not supported
      }
    } else {
      workerRef.current?.postMessage({ type: "stop" });
    }

    return () => {
      workerRef.current?.postMessage({ type: "stop" });
    };
  }, [timer.status, timer.startedAt, timer.durationMs, timer.accumulatedMs, completeTimer]);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // Notification on timer completion (mode change OR pomodoroCount increase)
  // No modo contínuo, o mode nunca muda (sempre "focus"), então precisamos
  // também observar pomodoroCount para disparar a notificação.
  useEffect(() => {
    const prevMode = prevModeRef.current;
    const prevCount = prevPomodoroCountRef.current;

    const modeChanged = prevMode !== timer.mode;
    const countIncreased = timer.pomodoroCount > prevCount;

    prevModeRef.current = timer.mode;
    prevPomodoroCountRef.current = timer.pomodoroCount;

    if (!modeChanged && !countIncreased) return;

    if (cycleConfig.pomodoroSettings.soundEnabled) {
      playNotificationSound();
    }

    if (cycleConfig.pomodoroSettings.notificationsEnabled) {
      if (modeChanged) {
        // Pomodoro mode: transição entre foco e pausa
        sendBrowserNotification(
          `${MODE_LABELS[prevMode]} concluído!`,
          `Próximo: ${MODE_LABELS[timer.mode]}`
        );
      } else {
        // Continuous mode: bloco de estudo concluído
        const subject = getCurrentSubject();
        sendBrowserNotification(
          "Bloco de estudo concluído!",
          subject ? `Próxima matéria: ${subject.name}` : "Hora de continuar!"
        );
      }
    }
  }, [timer.mode, timer.pomodoroCount, cycleConfig.pomodoroSettings, getCurrentSubject]);

  const getRemainingMs = useCallback((): number => {
    if (timer.status === "idle") return timer.durationMs;
    const elapsed =
      timer.accumulatedMs +
      (timer.startedAt ? Date.now() - timer.startedAt : 0);
    return Math.max(0, timer.durationMs - elapsed);
  }, [timer]);

  const remainingMs = getRemainingMs();
  const progress =
    timer.durationMs > 0
      ? 1 - remainingMs / timer.durationMs
      : 0;
  const display = formatTime(remainingMs);

  // Dynamic tab title
  useEffect(() => {
    if (timer.status !== "idle") {
      document.title = `${display} - ${MODE_LABELS[timer.mode]} | Cursos`;
    } else {
      document.title = originalTitle;
    }
    return () => {
      document.title = originalTitle;
    };
  }, [display, timer.mode, timer.status]);

  // Auto-complete when time reaches zero (fallback)
  useEffect(() => {
    if (timer.status === "running" && remainingMs <= 0) {
      completeTimer();
    }
  }, [timer.status, remainingMs, completeTimer]);

  return {
    remainingMs,
    progress: Math.min(1, Math.max(0, progress)),
    display,
    mode: timer.mode,
    status: timer.status,
    pomodoroCount: timer.pomodoroCount,
    durationMs: timer.durationMs,
    focusMinutes: cycleConfig.pomodoroSettings.focusMinutes,
  };
}
