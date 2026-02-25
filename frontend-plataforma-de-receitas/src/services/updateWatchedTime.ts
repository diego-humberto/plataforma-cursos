import api from "@/lib/api";

let _debounceTimer: ReturnType<typeof setTimeout> | null = null;
let _lastLessonId: number | null = null;
let _lastTime: number = 0;

export async function updateWatchedTime(
  apiUrl: string,
  lessonId: number,
  currentTime: number
) {
  _lastLessonId = lessonId;
  _lastTime = currentTime;

  if (_debounceTimer) clearTimeout(_debounceTimer);

  _debounceTimer = setTimeout(async () => {
    try {
      await api.post(`${apiUrl}/api/update-lesson-progress`, {
        time_elapsed: _lastTime,
        lessonId: _lastLessonId,
      });
    } catch {
      // Falha silenciosa — progresso será reenviado no próximo debounce
    }
  }, 5000);
}
