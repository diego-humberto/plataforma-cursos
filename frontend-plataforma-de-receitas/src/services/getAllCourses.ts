import { Course } from "@/models/models";
import api from "@/lib/api";

export async function getAllCourses(apiUrl: string) {
  try {
    const res = await api.get<Course[]>(`${apiUrl}/api/courses`);

    return res.data;
  } catch {
    return null;
  }
}
