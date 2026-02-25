import { Note } from "@/models/models";
import api from "@/lib/api";

export async function getNotes(apiUrl: string, lessonId: number): Promise<Note[]> {
  const res = await api.get<Note[]>(`${apiUrl}/api/lessons/${lessonId}/notes`);
  return res.data;
}

export async function createNote(
  apiUrl: string,
  lessonId: number,
  data: { timestamp: number; content: string }
): Promise<Note> {
  const res = await api.post<Note>(`${apiUrl}/api/lessons/${lessonId}/notes`, data);
  return res.data;
}

export async function updateNote(apiUrl: string, noteId: number, content: string): Promise<Note> {
  const res = await api.put<Note>(`${apiUrl}/api/notes/${noteId}`, { content });
  return res.data;
}

export async function deleteNote(apiUrl: string, noteId: number): Promise<void> {
  await api.delete(`${apiUrl}/api/notes/${noteId}`);
}

export async function exportLessonNotesPdf(apiUrl: string, lessonId: number): Promise<void> {
  const res = await api.get(`${apiUrl}/api/lessons/${lessonId}/notes/export-pdf`, {
    responseType: 'blob',
  });
  const contentDisposition = res.headers['content-disposition'];
  const match = contentDisposition?.match(/filename="?(.+?)"?$/);
  const filename = match?.[1] || `notas-aula-${lessonId}.pdf`;
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportCourseNotesPdf(apiUrl: string, courseId: string): Promise<void> {
  const res = await api.get(`${apiUrl}/api/courses/${courseId}/notes/export-pdf`, {
    responseType: 'blob',
  });
  const contentDisposition = res.headers['content-disposition'];
  const match = contentDisposition?.match(/filename="?(.+?)"?$/);
  const filename = match?.[1] || `notas-curso-${courseId}.pdf`;
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export type DailyNoteEntry = {
  id: number;
  lesson_id: number;
  timestamp: number;
  content: string;
  created_at: string;
};

export type DailyLessonGroup = {
  lesson_id: number;
  lesson_title: string;
  display_path: string;
  notes: DailyNoteEntry[];
};

export type DailyCourseGroup = {
  course_id: number;
  course_name: string;
  note_count: number;
  lessons: DailyLessonGroup[];
};

export type DailyNotesResponse = {
  date: string;
  total_notes: number;
  total_lessons: number;
  total_courses: number;
  courses: DailyCourseGroup[];
};

export async function getNotesByDate(apiUrl: string, date: string): Promise<DailyNotesResponse> {
  const res = await api.get<DailyNotesResponse>(`${apiUrl}/api/notes/by-date`, {
    params: { date },
  });
  return res.data;
}

export async function exportDailyNotesPdf(apiUrl: string, date: string): Promise<void> {
  const res = await api.get(`${apiUrl}/api/notes/by-date/export-pdf`, {
    params: { date },
    responseType: 'blob',
  });
  const contentDisposition = res.headers['content-disposition'];
  const match = contentDisposition?.match(/filename="?(.+?)"?$/);
  const filename = match?.[1] || `revisao-${date}.pdf`;
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
