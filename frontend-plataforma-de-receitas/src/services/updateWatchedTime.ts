import api from "@/lib/api";

export async function updateWatchedTime(
  apiUrl: string,
  lessonId: number,
  currentTime: number
) {
  try {
    await api.post(`${apiUrl}/api/update-lesson-progress`, {
      time_elapsed: currentTime,
      lessonId,
    });
  } catch {
    console.log("erro ao atualizar tempo decorrido");
  }
}
