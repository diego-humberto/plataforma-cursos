import { useState, useEffect, useCallback } from "react";
import useApiUrl from "@/hooks/useApiUrl";
import { getNotesByDate, exportDailyNotesPdf, updateNote, DailyNotesResponse } from "@/services/notes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BookOpen, ChevronLeft, ChevronRight, Download, Loader2, Pencil, StickyNote } from "lucide-react";
import { toast } from "sonner";
import TiptapEditor from "@/components/ui/tiptap-editor";

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
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

export default function DailyReviewPage() {
  const { apiUrl } = useApiUrl();
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState<DailyNotesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getNotesByDate(apiUrl, date);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, date]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleExport = async () => {
    try {
      await exportDailyNotesPdf(apiUrl, date);
    } catch {
      toast.error("Erro ao exportar PDF. Verifique se há anotações nesta data.");
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
      toast.success("Anotação atualizada.");
    } catch {
      toast.error("Erro ao editar anotação.");
    } finally {
      setIsSaving(false);
    }
  };

  const isToday = date === todayStr();

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Revisão Diária</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Revise suas anotações por dia de estudo
        </p>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => setDate(shiftDate(date, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 w-auto text-sm"
          />
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => setDate(shiftDate(date, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {!isToday && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => setDate(todayStr())}
          >
            Hoje
          </Button>
        )}

        {data && data.total_notes > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 ml-auto"
                  onClick={handleExport}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Exportar PDF do dia</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Stats */}
      {data && data.total_notes > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Anotações</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{data.total_notes}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Aulas</p>
            <p className="text-2xl font-bold">{data.total_lessons}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Cursos</p>
            <p className="text-2xl font-bold">{data.total_courses}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && (!data || data.total_notes === 0) && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <StickyNote className="h-12 w-12 opacity-30" />
          <p className="text-sm font-medium">Nenhuma anotação nesta data</p>
          <p className="text-xs opacity-70">
            Selecione outro dia ou comece a anotar durante seus estudos.
          </p>
        </div>
      )}

      {/* Notes grouped by course > lesson */}
      {!isLoading && data && data.courses.map((course) => (
        <div key={course.course_id} className="mb-8">
          {/* Course header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-md bg-purple-500/10 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-purple-500" />
            </div>
            <h2 className="text-sm font-semibold">{course.course_name}</h2>
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {course.note_count} {course.note_count === 1 ? "nota" : "notas"}
            </span>
          </div>

          {course.lessons.map((lesson) => (
            <div key={lesson.lesson_id} className="mb-4">
              {/* Lesson subheader */}
              <div className="text-xs text-muted-foreground border-l-2 border-muted-foreground/20 pl-3 py-1 mb-3 ml-1">
                {lesson.display_path}
              </div>

              {/* Notes */}
              <div className="space-y-2 ml-1">
                {lesson.notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50 group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 px-2.5 py-0.5 rounded-full">
                          {formatTimestamp(note.timestamp)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {lesson.lesson_title}
                        </span>
                      </div>
                      {editingId !== note.id && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setEditingId(note.id);
                            setEditContent(note.content);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {editingId === note.id ? (
                      <div className="space-y-2">
                        <TiptapEditor
                          content={editContent}
                          onChange={setEditContent}
                          onSubmit={() => handleUpdate(note.id)}
                          autoFocus
                          apiUrl={apiUrl}
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">
                            Ctrl+Enter para salvar
                          </span>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                              disabled={isSaving}
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleUpdate(note.id)}
                              disabled={isSaving}
                            >
                              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
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
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
