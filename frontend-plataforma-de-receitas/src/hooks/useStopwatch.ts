import { create } from "zustand";

type StopwatchStatus = "idle" | "running" | "paused";

interface StopwatchStore {
  status: StopwatchStatus;
  label: string;
  startedAt: number | null;
  accumulatedMs: number;
  sessionStartedAt: Date | null;

  setLabel: (label: string) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  getElapsedMs: () => number;
}

const useStopwatch = create<StopwatchStore>((set, get) => ({
  status: "idle",
  label: "",
  startedAt: null,
  accumulatedMs: 0,
  sessionStartedAt: null,

  setLabel: (label) => set({ label }),

  start: () => {
    set({
      status: "running",
      startedAt: Date.now(),
      accumulatedMs: 0,
      sessionStartedAt: new Date(),
    });
  },

  pause: () => {
    const { startedAt, accumulatedMs } = get();
    if (!startedAt) return;
    set({
      status: "paused",
      accumulatedMs: accumulatedMs + (Date.now() - startedAt),
      startedAt: null,
    });
  },

  resume: () => {
    set({
      status: "running",
      startedAt: Date.now(),
    });
  },

  reset: () => {
    set({
      status: "idle",
      startedAt: null,
      accumulatedMs: 0,
      sessionStartedAt: null,
    });
  },

  getElapsedMs: () => {
    const { accumulatedMs, startedAt } = get();
    if (!startedAt) return accumulatedMs;
    return accumulatedMs + (Date.now() - startedAt);
  },
}));

export default useStopwatch;
