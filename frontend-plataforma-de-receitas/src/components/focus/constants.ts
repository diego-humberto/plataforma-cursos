import type { TimerMode, PomodoroSettings, DailyHoursConfig } from "@/models/models";

export const MODE_COLORS: Record<TimerMode, { bg: string; ring: string; text: string; badge: string }> = {
  focus: {
    bg: "bg-purple-500/10",
    ring: "stroke-purple-500",
    text: "text-purple-600 dark:text-purple-400",
    badge: "bg-purple-500/20 text-purple-700 dark:text-purple-300",
  },
  shortBreak: {
    bg: "bg-green-500/10",
    ring: "stroke-green-500",
    text: "text-green-600 dark:text-green-400",
    badge: "bg-green-500/20 text-green-700 dark:text-green-300",
  },
  longBreak: {
    bg: "bg-blue-500/10",
    ring: "stroke-blue-500",
    text: "text-blue-600 dark:text-blue-400",
    badge: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  },
};

export const MODE_LABELS: Record<TimerMode, string> = {
  focus: "Foco",
  shortBreak: "Pausa Curta",
  longBreak: "Pausa Longa",
};

export const SUBJECT_COLORS = [
  "#8b5cf6", "#3b82f6", "#ef4444", "#f59e0b", "#10b981",
  "#ec4899", "#6366f1", "#14b8a6", "#f97316", "#06b6d4",
  "#84cc16", "#a855f7",
];

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  timerType: "continuous",
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true,
  notificationsEnabled: true,
};

export const DEFAULT_DAILY_HOURS: DailyHoursConfig = {
  dom: 4,
  seg: 8,
  ter: 8,
  qua: 8,
  qui: 8,
  sex: 8,
  sab: 6,
};

export const WEEKDAY_LABELS: Record<keyof DailyHoursConfig, string> = {
  dom: "Dom",
  seg: "Seg",
  ter: "Ter",
  qua: "Qua",
  qui: "Qui",
  sex: "Sex",
  sab: "Sáb",
};

export const RING_STROKE_COLORS: Record<TimerMode, string> = {
  focus: "#8b5cf6",
  shortBreak: "#22c55e",
  longBreak: "#3b82f6",
};
