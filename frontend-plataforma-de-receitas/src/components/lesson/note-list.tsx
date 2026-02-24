import { Note } from "@/models/models";
import useApiUrl from "@/hooks/useApiUrl";
import { useEffect, useRef, useState, memo } from "react";
import { Button } from "../ui/button";
import TiptapEditor from "../ui/tiptap-editor";
import { BookOpen, Clock, Loader2, MessageSquareText, Pencil, StickyNote, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getNotes, createNote, updateNote, deleteNote } from "@/services/notes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}


type AnnotatedLesson = {
  lesson_id: number;
  title: string;
  note_count: number;
  module: string;
  hierarchy_path: string;
};

function buildAnnotatedTree(lessons: AnnotatedLesson[]) {
  const groups: Record<string, AnnotatedLesson[]> = {};
  for (const al of lessons) {
    const section = al.module?.split("/")[0] || "(Raiz)";
    if (!groups[section]) groups[section] = [];
    groups[section].push(al);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
    .map(([title, lessons]) => ({ title, lessons }));
}

const HTML_TAG_REGEX = /<[a-z][\s\S]*?>/i;

function NoteContent({ content }: { content: string }) {
  if (HTML_TAG_REGEX.test(content)) {
    return (
      <div
        className="text-sm leading-relaxed tiptap-display"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
  return <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>;
}

type Props = {
  lessonId: number | null;
  courseId?: string;
  playerTimeRef: React.RefObject<number>;
  onSeek: (time: number) => void;
  onNavigateToLesson?: (lessonId: number) => void;
  refreshTrigger?: number;
  onNoteSaved?: () => void;
};

export default memo(function NoteList({ lessonId, courseId, playerTimeRef, onSeek, onNavigateToLesson, refreshTrigger, onNoteSaved }: Props) {
  const { apiUrl } = useApiUrl();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newContent, setNewContent] = useState("");
  const [capturedTime, setCapturedTime] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const inputAreaRef = useRef<HTMLDivElement>(null);
  const [annotatedLessons, setAnnotatedLessons] = useState<AnnotatedLesson[]>([]);

  const fetchNotes = async () => {
    if (!lessonId) return;
    setIsLoading(true);
    try {
      const data = await getNotes(apiUrl, lessonId);
      setNotes(data);
    } catch {
      toast.error("Erro ao carregar anotações.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnnotatedLessons = async () => {
    if (!courseId) return;
    try {
      const res = await import("@/lib/api").then((m) => m.default.get(`${apiUrl}/api/courses/${courseId}/annotated-lessons`));
      setAnnotatedLessons(res.data);
    } catch { /* silent */ }
  };

  useEffect(() => {
    setNotes([]);
    setNewContent("");
    setCapturedTime(null);
    setEditingId(null);
    fetchNotes();
    fetchAnnotatedLessons();
  }, [lessonId]);

  // Refresh quando anotação rápida é salva
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchNotes();
      fetchAnnotatedLessons();
    }
  }, [refreshTrigger]);

  // Clicar fora da área de anotação reseta o timestamp capturado
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        inputAreaRef.current &&
        !inputAreaRef.current.contains(e.target as Node) &&
        !newContent.trim()
      ) {
        setCapturedTime(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [newContent]);

  const handleFocus = () => {
    if (capturedTime === null) {
      setCapturedTime(playerTimeRef.current ?? 0);
    }
  };

  const handleSave = async () => {
    if (!lessonId || !newContent.trim() || isSaving) return;

    setIsSaving(true);
    try {
      await createNote(apiUrl, lessonId, {
        timestamp: capturedTime ?? 0,
        content: newContent.trim(),
      });
      setNewContent("");
      setCapturedTime(null);
      fetchNotes();
      onNoteSaved?.();
    } catch {
      toast.error("Erro ao salvar anotação.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (noteId: number) => {
    if (!editContent.trim() || isSaving) return;

    setIsSaving(true);
    try {
      await updateNote(apiUrl, noteId, editContent.trim());
      setEditingId(null);
      setEditContent("");
      fetchNotes();
      onNoteSaved?.();
    } catch {
      toast.error("Erro ao editar anotação.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (noteId: number) => {
    try {
      await deleteNote(apiUrl, noteId);
      fetchNotes();
      onNoteSaved?.();
    } catch {
      toast.error("Erro ao excluir anotação.");
    }
  };

  if (!lessonId) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
        <BookOpen className="h-10 w-10 opacity-30" />
        <p className="text-sm">Selecione uma aula para ver as anotações.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Input area */}
      <div ref={inputAreaRef} className="p-3 border-b space-y-2">
        {capturedTime !== null && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-purple-500" />
            <span className="text-xs text-purple-600 dark:text-purple-400 font-mono bg-purple-100 dark:bg-purple-500/15 px-2 py-0.5 rounded-full">
              {formatTimestamp(capturedTime)}
            </span>
          </div>
        )}
        <TiptapEditor
          content={newContent}
          onChange={setNewContent}
          onFocus={handleFocus}
          onSubmit={handleSave}
          placeholder="Digite sua anotação... (Ctrl+Enter para salvar)"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            Ctrl+Enter para salvar
          </span>
          <div className="flex gap-2">
            {newContent.trim() && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setNewContent("");
                  setCapturedTime(null);
                }}
                disabled={isSaving}
              >
                Cancelar
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!newContent.trim() || isSaving}
            >
              {isSaving && !editingId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </div>
        </div>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
            <StickyNote className="h-10 w-10 opacity-30" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Nenhuma anotação nesta aula</p>
              <p className="text-xs opacity-70">Clique no campo acima para começar a anotar.</p>
            </div>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {notes.map((note) => (
              <div
                key={note.id}
                className="rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50 group"
              >
                {/* Header: timestamp + actions */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSeek(note.timestamp)}
                      className="inline-flex items-center gap-1 text-xs font-mono bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full hover:bg-purple-200 dark:hover:bg-purple-500/25 transition-colors cursor-pointer"
                    >
                      <Clock className="h-2.5 w-2.5" />
                      {formatTimestamp(note.timestamp)}
                    </button>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => {
                        setEditingId(note.id);
                        setEditContent(note.content);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir anotação</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir esta anotação? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(note.id)}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* Content or edit mode */}
                {editingId === note.id ? (
                  <div className="space-y-2">
                    <TiptapEditor
                      content={editContent}
                      onChange={setEditContent}
                      onSubmit={() => handleUpdate(note.id)}
                      autoFocus
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        Ctrl+Enter para salvar · Esc para cancelar
                      </span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} disabled={isSaving}>
                          Cancelar
                        </Button>
                        <Button size="sm" onClick={() => handleUpdate(note.id)} disabled={isSaving}>
                          {isSaving && editingId === note.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <NoteContent content={note.content} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Aulas com anotações - navegação por hierarquia */}
      {annotatedLessons.length > 1 && onNavigateToLesson && (
        <div className="border-t p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <MessageSquareText className="h-3 w-3" />
            Aulas com anotações
          </p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {buildAnnotatedTree(annotatedLessons).map((group) => (
              <div key={group.title}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1 mt-1">
                  {group.title}
                </p>
                {group.lessons.map((al) => {
                  const subPath = al.module?.split("/").slice(1).join(" > ");
                  const fullPath = subPath ? `${subPath} > ${al.title}` : al.title;
                  return (
                    <button
                      key={al.lesson_id}
                      onClick={() => onNavigateToLesson(al.lesson_id)}
                      className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors flex items-start justify-between gap-2 ${
                        al.lesson_id === lessonId
                          ? "bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300"
                          : "hover:bg-accent text-muted-foreground hover:text-foreground"
                      }`}
                      title={fullPath}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{al.title}</span>
                        {subPath && (
                          <span className="block truncate text-[10px] opacity-60">{subPath}</span>
                        )}
                      </div>
                      <span className="text-[10px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded-full shrink-0 mt-0.5">
                        {al.note_count}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
})
