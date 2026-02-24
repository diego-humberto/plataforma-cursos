import api from "@/lib/api";
import type { HeatmapData } from "@/models/models";

export async function getHeatmapData(apiUrl: string, year: number) {
  const res = await api.get(`${apiUrl}/api/study-days/heatmap`, { params: { year } });
  return res.data as HeatmapData;
}

export async function getStudyStreak(apiUrl: string) {
  const res = await api.get(`${apiUrl}/api/study-days/streak`);
  return res.data as { streak: number };
}
