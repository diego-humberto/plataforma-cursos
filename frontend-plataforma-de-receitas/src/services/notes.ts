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
