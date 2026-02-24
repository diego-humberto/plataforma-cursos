import api from "@/lib/api";
import type { FocusSession, CycleConfig, TimerState, CycleState } from "@/models/models";

export async function getFocusSessions(apiUrl: string, date?: string) {
  const params = date ? { date } : {};
  const res = await api.get(`${apiUrl}/api/focus/sessions`, { params });
  return res.data as FocusSession[];
}

export async function createFocusSession(apiUrl: string, session: Omit<FocusSession, "id">) {
  const res = await api.post(`${apiUrl}/api/focus/sessions`, session);
  return res.data as FocusSession;
}

export async function deleteFocusSession(apiUrl: string, id: number) {
  await api.delete(`${apiUrl}/api/focus/sessions/${id}`);
}

export async function getFocusStats(
  apiUrl: string,
  from?: string,
  to?: string
) {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  const res = await api.get(`${apiUrl}/api/focus/sessions/stats`, { params });
  return res.data as {
    total_seconds: number;
    total_sessions: number;
    by_subject: Record<string, number>;
    by_date: Record<string, number>;
  };
}

export async function getCycleConfig(apiUrl: string): Promise<CycleConfig | null> {
  const res = await api.get(`${apiUrl}/api/focus/cycle-config`);
  if (!res.data || !res.data.subjects) return null;
  return res.data as CycleConfig;
}

export async function saveCycleConfig(apiUrl: string, config: CycleConfig) {
  await api.put(`${apiUrl}/api/focus/cycle-config`, config);
}

export async function getTimerState(apiUrl: string): Promise<{ timer: TimerState; cycle: CycleState } | null> {
  const res = await api.get(`${apiUrl}/api/focus/timer-state`);
  if (!res.data || !res.data.timer) return null;
  return res.data as { timer: TimerState; cycle: CycleState };
}

export async function saveTimerState(apiUrl: string, state: { timer: TimerState; cycle: CycleState }) {
  await api.put(`${apiUrl}/api/focus/timer-state`, state);
}
