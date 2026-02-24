import { Lesson } from "@/models/models";

import api from "@/lib/api";

export async function getLessons(
  apiUrl: string,
  courseId: number
): Promise<Lesson[]> {
  try {
    const res = await api.get<Lesson[]>(
      `${apiUrl}/api/courses/${courseId}/lessons`
    );

    return res.data;
  } catch {
    return [];
  }
}
