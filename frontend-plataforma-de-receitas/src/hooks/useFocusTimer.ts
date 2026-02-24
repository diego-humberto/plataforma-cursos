import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  TimerMode,
  TimerStatus,
  CycleSubject,
  PomodoroSettings,
  DailyHoursConfig,
  SubjectProgress,
  CycleConfig,
  TimerState,
  CycleState,
} from "@/models/models";
import {
  DEFAULT_POMODORO_SETTINGS,
  DEFAULT_DAILY_HOURS,
  SUBJECT_COLORS,
} from "@/components/focus/constants";
import { getCycleConfig, saveCycleConfig, createFocusSession, getTimerState, saveTimerState } from "@/services/focusSessions";

const WEEKDAY_KEYS: (keyof DailyHoursConfig)[] = [
  "dom", "seg", "ter", "qua", "qui", "sex", "sab",
];

function getTodayKey(): keyof DailyHoursConfig {
  return WEEKDAY_KEYS[new Date().getDay()];
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function calcAllocations(
  subjects: CycleSubject[],
  dailyHours: DailyHoursConfig
): SubjectProgress[] {
  const dayKey = getTodayKey();
  const hoursToday = dailyHours[dayKey];
  const totalEmphasis = subjects.reduce((sum, s) => sum + s.emphasis, 0);
  if (totalEmphasis === 0) return [];

  return subjects.map((s) => ({
    subjectId: s.id,
    allocatedMinutes: Math.round((hoursToday * 60 * s.emphasis) / totalEmphasis),
    completedMs: 0,
    pomodorosCompleted: 0,
  }));
}

function getModeDuration(mode: TimerMode, settings: PomodoroSettings): number {
  switch (mode) {
    case "focus":
      return settings.focusMinutes * 60 * 1000;
    case "shortBreak":
      return settings.shortBreakMinutes * 60 * 1000;
    case "longBreak":
      return settings.longBreakMinutes * 60 * 1000;
  }
}

interface FocusStore {
  // Config
  cycleConfig: CycleConfig;

  // Timer
  timer: TimerState;

  // Cycle
  cycle: CycleState;

  // Timer actions
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  skipTimer: () => void;
  completeTimer: () => void;

  // Subject actions
  addSubject: (name: string, emphasis: number) => void;
  removeSubject: (id: string) => void;
  updateSubject: (id: string, updates: Partial<Pick<CycleSubject, "name" | "emphasis" | "color">>) => void;
  switchToSubject: (index: number) => void;

  // Config actions
  updatePomodoroSettings: (settings: Partial<PomodoroSettings>) => void;
  updateDailyHours: (hours: Partial<DailyHoursConfig>) => void;
  recalculateAllocations: () => void;

  // Helpers
  getCurrentSubject: () => CycleSubject | null;
  getTodayHours: () => number;
  getRemainingMs: () => number;
}

const useFocusTimer = create<FocusStore>()(
  persist(
    (set, get) => ({
      cycleConfig: {
        subjects: [],
        dailyHours: DEFAULT_DAILY_HOURS,
        pomodoroSettings: DEFAULT_POMODORO_SETTINGS,
      },

      timer: {
        status: "idle" as TimerStatus,
        mode: "focus" as TimerMode,
        startedAt: null,
        accumulatedMs: 0,
        durationMs: DEFAULT_POMODORO_SETTINGS.focusMinutes * 60 * 1000,
        pomodoroCount: 0,
      },

      cycle: {
        currentSubjectIndex: 0,
        subjectProgress: [],
        cycleDate: getTodayStr(),
        completedCycles: 0,
      },

      startTimer: () => {
        const { timer, cycle, cycleConfig } = get();
        const today = getTodayStr();
        const { pomodoroSettings } = cycleConfig;

        // Reset daily progress if new day
        let newCycle = cycle;
        if (cycle.cycleDate !== today) {
          newCycle = {
            ...cycle,
            cycleDate: today,
            completedCycles: 0,
            subjectProgress: calcAllocations(
              cycleConfig.subjects,
              cycleConfig.dailyHours
            ),
          };
        }

        // Init progress if empty
        if (newCycle.subjectProgress.length === 0 && cycleConfig.subjects.length > 0) {
          newCycle = {
            ...newCycle,
            subjectProgress: calcAllocations(
              cycleConfig.subjects,
              cycleConfig.dailyHours
            ),
          };
        }

        let durationMs: number;
        if (pomodoroSettings.timerType === "continuous") {
          // Continuous: duration = remaining allocated time for current subject
          const progress = newCycle.subjectProgress[newCycle.currentSubjectIndex];
          if (progress) {
            const remainingMs = Math.max(0, progress.allocatedMinutes * 60000 - progress.completedMs);
            durationMs = remainingMs > 0 ? remainingMs : progress.allocatedMinutes * 60000;
          } else {
            durationMs = 60 * 60000; // fallback 60min
          }
        } else {
          durationMs = getModeDuration(timer.mode, pomodoroSettings);
        }

        set({
          timer: {
            ...timer,
            status: "running",
            startedAt: Date.now(),
            accumulatedMs: 0,
            durationMs,
          },
          cycle: newCycle,
        });
      },

      pauseTimer: () => {
        const { timer } = get();
        if (timer.status !== "running" || !timer.startedAt) return;

        const elapsed = Date.now() - timer.startedAt;
        set({
          timer: {
            ...timer,
            status: "paused",
            accumulatedMs: timer.accumulatedMs + elapsed,
            startedAt: null,
          },
        });
      },

      resumeTimer: () => {
        const { timer } = get();
        if (timer.status !== "paused") return;

        set({
          timer: {
            ...timer,
            status: "running",
            startedAt: Date.now(),
          },
        });
      },

      resetTimer: () => {
        const { cycleConfig, timer, cycle } = get();
        const { pomodoroSettings } = cycleConfig;
        let durationMs: number;
        if (pomodoroSettings.timerType === "continuous") {
          const progress = cycle.subjectProgress[cycle.currentSubjectIndex];
          if (progress) {
            // Usar tempo restante (alocado - já completado) para não ignorar progresso anterior
            const remainingMs = Math.max(0, progress.allocatedMinutes * 60000 - progress.completedMs);
            durationMs = remainingMs > 0 ? remainingMs : progress.allocatedMinutes * 60000;
          } else {
            durationMs = 60 * 60000;
          }
        } else {
          durationMs = getModeDuration(timer.mode, pomodoroSettings);
        }
        // Reseta APENAS o timer do bloco atual.
        // pomodoroCount é preservado via ...timer spread.
        // cycle (subjectProgress, completedCycles) NÃO é modificado.
        set({
          timer: {
            ...timer,
            status: "idle",
            startedAt: null,
            accumulatedMs: 0,
            durationMs,
          },
        });
      },

      skipTimer: () => {
        get().completeTimer();
      },

      completeTimer: () => {
        const { timer, cycle, cycleConfig } = get();
        const { pomodoroSettings } = cycleConfig;
        let newPomodoroCount = timer.pomodoroCount;

        // Track focus time on current subject
        let newProgress = [...cycle.subjectProgress];
        if (timer.mode === "focus") {
          const elapsed = timer.accumulatedMs + (timer.startedAt ? Date.now() - timer.startedAt : 0);
          const idx = cycle.currentSubjectIndex;
          if (newProgress[idx]) {
            newProgress[idx] = {
              ...newProgress[idx],
              completedMs: newProgress[idx].completedMs + elapsed,
              pomodorosCompleted: newProgress[idx].pomodorosCompleted + 1,
            };
          }
          newPomodoroCount += 1;
        }

        // --- Continuous mode ---
        if (pomodoroSettings.timerType === "continuous") {
          const nextIndex = (cycle.currentSubjectIndex + 1) % cycleConfig.subjects.length;

          // Check if all subjects completed their allocated time
          const allDone = newProgress.length > 0 && newProgress.every(
            (p) => p.completedMs >= p.allocatedMinutes * 60000
          );

          if (allDone) {
            // Cycle complete — increment counter, reset progress for new cycle
            const freshProgress = calcAllocations(cycleConfig.subjects, cycleConfig.dailyHours);
            const firstProgress = freshProgress[0];
            const firstDuration = firstProgress
              ? firstProgress.allocatedMinutes * 60000
              : 60 * 60000;

            set({
              timer: {
                status: "idle",
                mode: "focus",
                startedAt: null,
                accumulatedMs: 0,
                durationMs: firstDuration,
                pomodoroCount: newPomodoroCount,
              },
              cycle: {
                ...cycle,
                currentSubjectIndex: 0,
                subjectProgress: freshProgress,
                completedCycles: (cycle.completedCycles || 0) + 1,
              },
            });
            return;
          }

          // Advance to next subject
          const nextProgress = newProgress[nextIndex];
          const nextDuration = nextProgress
            ? Math.max(0, nextProgress.allocatedMinutes * 60000 - nextProgress.completedMs) || nextProgress.allocatedMinutes * 60000
            : 60 * 60000;

          set({
            timer: {
              status: "idle",
              mode: "focus",
              startedAt: null,
              accumulatedMs: 0,
              durationMs: nextDuration,
              pomodoroCount: newPomodoroCount,
            },
            cycle: {
              ...cycle,
              currentSubjectIndex: nextIndex,
              subjectProgress: newProgress,
            },
          });
          return;
        }

        // --- Pomodoro mode ---
        let newMode: TimerMode;
        if (timer.mode === "focus") {
          if (newPomodoroCount % pomodoroSettings.longBreakInterval === 0) {
            newMode = "longBreak";
          } else {
            newMode = "shortBreak";
          }
        } else {
          newMode = "focus";
        }

        const nextDuration = getModeDuration(newMode, pomodoroSettings);
        const shouldAutoStart =
          (newMode === "focus" && pomodoroSettings.autoStartFocus) ||
          (newMode !== "focus" && pomodoroSettings.autoStartBreaks);

        set({
          timer: {
            status: shouldAutoStart ? "running" : "idle",
            mode: newMode,
            startedAt: shouldAutoStart ? Date.now() : null,
            accumulatedMs: 0,
            durationMs: nextDuration,
            pomodoroCount: newPomodoroCount,
          },
          cycle: {
            ...cycle,
            subjectProgress: newProgress,
          },
        });
      },

      addSubject: (name, emphasis) => {
        const { cycleConfig } = get();
        const usedColors = cycleConfig.subjects.map((s) => s.color);
        const nextColor = SUBJECT_COLORS.find((c) => !usedColors.includes(c)) || SUBJECT_COLORS[0];

        const newSubject: CycleSubject = {
          id: crypto.randomUUID(),
          name,
          emphasis,
          color: nextColor,
        };

        const newSubjects = [...cycleConfig.subjects, newSubject];
        set({
          cycleConfig: { ...cycleConfig, subjects: newSubjects },
        });
        get().recalculateAllocations();
      },

      removeSubject: (id) => {
        const { cycleConfig, cycle } = get();
        const newSubjects = cycleConfig.subjects.filter((s) => s.id !== id);
        let newIndex = cycle.currentSubjectIndex;
        if (newIndex >= newSubjects.length) {
          newIndex = Math.max(0, newSubjects.length - 1);
        }
        set({
          cycleConfig: { ...cycleConfig, subjects: newSubjects },
          cycle: { ...cycle, currentSubjectIndex: newIndex },
        });
        get().recalculateAllocations();
      },

      updateSubject: (id, updates) => {
        const { cycleConfig } = get();
        const newSubjects = cycleConfig.subjects.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        );
        set({
          cycleConfig: { ...cycleConfig, subjects: newSubjects },
        });
        get().recalculateAllocations();
      },

      switchToSubject: (index) => {
        const { cycle, cycleConfig, timer } = get();
        if (index >= 0 && index < cycleConfig.subjects.length) {
          const updates: any = { cycle: { ...cycle, currentSubjectIndex: index } };
          // Sync idle timer duration in continuous mode
          if (timer.status === "idle" && cycleConfig.pomodoroSettings.timerType === "continuous") {
            const progress = cycle.subjectProgress[index];
            if (progress) {
              const remainingMs = Math.max(0, progress.allocatedMinutes * 60000 - progress.completedMs);
              updates.timer = {
                ...timer,
                durationMs: remainingMs > 0 ? remainingMs : progress.allocatedMinutes * 60000,
              };
            }
          }
          set(updates);
        }
      },

      updatePomodoroSettings: (settings) => {
        const { cycleConfig, timer, cycle } = get();
        const newSettings = { ...cycleConfig.pomodoroSettings, ...settings };
        const newConfig = { ...cycleConfig, pomodoroSettings: newSettings };

        // Update duration if timer is idle
        const updates: Partial<{ cycleConfig: CycleConfig; timer: TimerState }> = {
          cycleConfig: newConfig,
        };
        if (timer.status === "idle") {
          if (newSettings.timerType === "continuous") {
            const progress = cycle.subjectProgress[cycle.currentSubjectIndex];
            if (progress) {
              const remainingMs = Math.max(0, progress.allocatedMinutes * 60000 - progress.completedMs);
              updates.timer = {
                ...timer,
                mode: "focus",
                durationMs: remainingMs > 0 ? remainingMs : progress.allocatedMinutes * 60000,
              };
            }
          } else {
            updates.timer = {
              ...timer,
              durationMs: getModeDuration(timer.mode, newSettings),
            };
          }
        }
        set(updates as any);
      },

      updateDailyHours: (hours) => {
        const { cycleConfig } = get();
        set({
          cycleConfig: {
            ...cycleConfig,
            dailyHours: { ...cycleConfig.dailyHours, ...hours },
          },
        });
        get().recalculateAllocations();
      },

      recalculateAllocations: () => {
        const { cycleConfig, cycle, timer } = get();
        const fresh = calcAllocations(cycleConfig.subjects, cycleConfig.dailyHours);
        // Preserve completed progress
        const merged = fresh.map((fp) => {
          const existing = cycle.subjectProgress.find(
            (sp) => sp.subjectId === fp.subjectId
          );
          return existing
            ? { ...fp, completedMs: existing.completedMs, pomodorosCompleted: existing.pomodorosCompleted }
            : fp;
        });

        const updates: any = { cycle: { ...cycle, subjectProgress: merged } };

        // Sync idle timer duration in continuous mode
        if (timer.status === "idle" && cycleConfig.pomodoroSettings.timerType === "continuous") {
          const progress = merged[cycle.currentSubjectIndex];
          if (progress) {
            const remainingMs = Math.max(0, progress.allocatedMinutes * 60000 - progress.completedMs);
            updates.timer = {
              ...timer,
              durationMs: remainingMs > 0 ? remainingMs : progress.allocatedMinutes * 60000,
            };
          }
        }

        set(updates);
      },

      getCurrentSubject: () => {
        const { cycleConfig, cycle } = get();
        return cycleConfig.subjects[cycle.currentSubjectIndex] ?? null;
      },

      getTodayHours: () => {
        const { cycleConfig } = get();
        return cycleConfig.dailyHours[getTodayKey()];
      },

      getRemainingMs: () => {
        const { timer } = get();
        if (timer.status === "idle") return timer.durationMs;
        const elapsed = timer.accumulatedMs + (timer.startedAt ? Date.now() - timer.startedAt : 0);
        return Math.max(0, timer.durationMs - elapsed);
      },
    }),
    {
      name: "focus-timer-store",
      version: 4,
      migrate: (persisted: any, version: number) => {
        const state = persisted as any;
        if (version < 2) {
          // Migrate emphasis from decimal (0.1-5.0) to integer (1-10) scale
          if (state?.cycleConfig?.subjects) {
            state.cycleConfig.subjects = state.cycleConfig.subjects.map((s: any) => ({
              ...s,
              emphasis: s.emphasis < 1
                ? Math.max(1, Math.round(s.emphasis * 10))
                : Math.max(1, Math.min(10, Math.round(s.emphasis))),
            }));
          }
        }
        if (version < 3) {
          // Add timerType to existing settings
          if (state?.cycleConfig?.pomodoroSettings && !state.cycleConfig.pomodoroSettings.timerType) {
            state.cycleConfig.pomodoroSettings.timerType = "continuous";
          }
        }
        if (version < 4) {
          // Add completedCycles to cycle state
          if (state?.cycle && state.cycle.completedCycles === undefined) {
            state.cycle.completedCycles = 0;
          }
        }
        return persisted;
      },
      onRehydrateStorage: () => {
        return (state) => {
          if (!state) return;
          const { cycleConfig, timer } = state;

          // Se o timer estava rodando quando a página fechou/recarregou,
          // pausar e calcular o tempo acumulado corretamente
          if (timer.status === "running" && timer.startedAt) {
            const elapsed = Date.now() - timer.startedAt;
            const totalAccumulated = Math.min(timer.accumulatedMs + elapsed, timer.durationMs);

            state.timer = {
              ...timer,
              status: "paused",
              startedAt: null,
              accumulatedMs: totalAccumulated,
            };
          }

          // Sync idle/paused timer duration after rehydration (continuous mode)
          const currentTimer = state.timer;
          if (currentTimer.status === "idle" && cycleConfig.pomodoroSettings.timerType === "continuous") {
            const progress = state.cycle.subjectProgress[state.cycle.currentSubjectIndex];
            if (progress) {
              const remainingMs = Math.max(0, progress.allocatedMinutes * 60000 - progress.completedMs);
              state.timer = {
                ...currentTimer,
                durationMs: remainingMs > 0 ? remainingMs : progress.allocatedMinutes * 60000,
              };
            }
          }

          // Load from backend (backend has priority)
          const apiUrl = localStorage.getItem("apiUrl") || "http://localhost:9823";

          // 1. Load cycleConfig from backend
          getCycleConfig(apiUrl)
            .then((backendConfig) => {
              if (backendConfig && backendConfig.subjects && backendConfig.subjects.length > 0) {
                useFocusTimer.setState({ cycleConfig: backendConfig });
                useFocusTimer.getState().recalculateAllocations();
              } else if (cycleConfig.subjects.length > 0) {
                saveCycleConfig(apiUrl, cycleConfig).catch(() => {});
              }
            })
            .catch(() => {});

          // 2. Load timer+cycle state from backend (cross-browser persistence)
          getTimerState(apiUrl)
            .then((backendState) => {
              if (!backendState) {
                // Backend empty — push current localStorage state
                const current = useFocusTimer.getState();
                saveTimerState(apiUrl, { timer: current.timer, cycle: current.cycle }).catch(() => {});
                return;
              }

              const bt = backendState.timer;
              const bc = backendState.cycle;

              // Se o timer estava rodando no backend, pausar e calcular tempo acumulado
              if (bt.status === "running" && bt.startedAt) {
                const elapsed = Date.now() - bt.startedAt;
                const totalAccumulated = Math.min(bt.accumulatedMs + elapsed, bt.durationMs);
                bt.status = "paused";
                bt.startedAt = null;
                bt.accumulatedMs = totalAccumulated;
              }

              // Sync idle timer duration (continuous mode)
              if (bt.status === "idle") {
                const settings = useFocusTimer.getState().cycleConfig.pomodoroSettings;
                if (settings.timerType === "continuous") {
                  const progress = bc.subjectProgress[bc.currentSubjectIndex];
                  if (progress) {
                    const remainingMs = Math.max(0, progress.allocatedMinutes * 60000 - progress.completedMs);
                    bt.durationMs = remainingMs > 0 ? remainingMs : progress.allocatedMinutes * 60000;
                  }
                }
              }

              useFocusTimer.setState({ timer: bt, cycle: bc });
            })
            .catch(() => {});
        };
      },
      partialize: (state) => ({
        cycleConfig: state.cycleConfig,
        timer: state.timer,
        cycle: state.cycle,
      }),
    }
  )
);

// Auto-save cycleConfig to backend with debounce
let _saveConfigTimeout: ReturnType<typeof setTimeout> | null = null;
let _lastConfigJson = "";

useFocusTimer.subscribe((state) => {
  const json = JSON.stringify(state.cycleConfig);
  if (json === _lastConfigJson) return;
  _lastConfigJson = json;

  if (_saveConfigTimeout) clearTimeout(_saveConfigTimeout);
  _saveConfigTimeout = setTimeout(() => {
    const apiUrl = localStorage.getItem("apiUrl") || "http://localhost:9823";
    saveCycleConfig(apiUrl, state.cycleConfig).catch(() => {});
  }, 1000);
});

// Auto-save timer+cycle state to backend with debounce (cross-browser persistence)
let _saveTimerTimeout: ReturnType<typeof setTimeout> | null = null;
let _lastTimerJson = "";

useFocusTimer.subscribe((state) => {
  const json = JSON.stringify({ timer: state.timer, cycle: state.cycle });
  if (json === _lastTimerJson) return;
  _lastTimerJson = json;

  if (_saveTimerTimeout) clearTimeout(_saveTimerTimeout);
  _saveTimerTimeout = setTimeout(() => {
    const apiUrl = localStorage.getItem("apiUrl") || "http://localhost:9823";
    saveTimerState(apiUrl, { timer: state.timer, cycle: state.cycle }).catch(() => {});
  }, 500);
});

// Salvamento de sessão de foco no nível da store.
// Roda independente de qual componente React está montado,
// garantindo que sessões sejam salvas mesmo quando o usuário navega para fora de /foco.
let _sessionPrevPomodoroCount = useFocusTimer.getState().timer.pomodoroCount;
let _sessionStartIso: string | null = null;
let _sessionSubjectName: string | null = null;
let _sessionSubjectId: string | null = null;
let _sessionDurationMs = 0;

useFocusTimer.subscribe((state) => {
  // Rastrear quando uma sessão de foco começa
  if (state.timer.status === "running" && state.timer.mode === "focus" && !_sessionStartIso) {
    const subject = state.cycleConfig.subjects[state.cycle.currentSubjectIndex];
    if (subject) {
      _sessionStartIso = new Date().toISOString();
      _sessionSubjectName = subject.name;
      _sessionSubjectId = subject.id;
      _sessionDurationMs = state.timer.durationMs;
    }
  }

  // Limpar se timer volta a idle sem completar (ex: reset manual)
  if (state.timer.status === "idle" && state.timer.pomodoroCount === _sessionPrevPomodoroCount) {
    _sessionStartIso = null;
    _sessionSubjectName = null;
    _sessionSubjectId = null;
  }

  // Salvar quando pomodoroCount aumenta (= timer completou naturalmente)
  if (state.timer.pomodoroCount > _sessionPrevPomodoroCount) {
    if (_sessionStartIso && _sessionSubjectName && _sessionSubjectId) {
      const now = new Date();
      const durationSeconds = Math.round(_sessionDurationMs / 1000);
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      const apiUrl = localStorage.getItem("apiUrl") || "http://localhost:9823";
      createFocusSession(apiUrl, {
        subject_name: _sessionSubjectName,
        subject_id: _sessionSubjectId,
        started_at: _sessionStartIso,
        ended_at: now.toISOString(),
        duration_seconds: durationSeconds,
        mode: "focus",
        completed: true,
        date: dateStr,
      }).catch(() => {
        // Falha silenciosa - o usuário verá dados faltando no heatmap
      });

      _sessionStartIso = null;
      _sessionSubjectName = null;
      _sessionSubjectId = null;
    }
  }

  _sessionPrevPomodoroCount = state.timer.pomodoroCount;
});

// Antes de fechar/recarregar a página, pausar o timer e salvar no backend
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    const state = useFocusTimer.getState();
    const { timer } = state;
    let finalTimer = timer;

    if (timer.status === "running" && timer.startedAt) {
      const elapsed = Date.now() - timer.startedAt;
      const totalAccumulated = Math.min(timer.accumulatedMs + elapsed, timer.durationMs);

      finalTimer = {
        ...timer,
        status: "paused",
        startedAt: null,
        accumulatedMs: totalAccumulated,
      };

      useFocusTimer.setState({ timer: finalTimer });
    }

    // Salvar no backend via sendBeacon (funciona mesmo ao fechar a página)
    const apiUrl = localStorage.getItem("apiUrl") || "http://localhost:9823";
    const payload = JSON.stringify({ timer: finalTimer, cycle: state.cycle });
    navigator.sendBeacon(`${apiUrl}/api/focus/timer-state`, new Blob([payload], { type: "application/json" }));
  });
}

export default useFocusTimer;
