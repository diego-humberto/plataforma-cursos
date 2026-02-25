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
