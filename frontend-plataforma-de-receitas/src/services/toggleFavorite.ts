import api from "@/lib/api";

export async function toggleFavorite(apiUrl: string, courseId: number) {
  const res = await api.put(`${apiUrl}/api/courses/${courseId}/favorite`);
  return res.data as { id: number; isFavorite: number };
}
