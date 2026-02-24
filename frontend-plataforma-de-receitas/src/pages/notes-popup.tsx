import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import NoteList from "@/components/lesson/note-list";
import { Pencil } from "lucide-react";

const CHANNEL_NAME = "notes-channel";

export default function NotesPopupPage() {
  const [searchParams] = useSearchParams();
  const [lessonId, setLessonId] = useState<number | null>(
    Number(searchParams.get("lessonId")) || null
  );
  const [courseId, setCourseId] = useState<string | undefined>(
    searchParams.get("courseId") || undefined
  );
  const [lessonTitle, setLessonTitle] = useState(
    decodeURIComponent(searchParams.get("title") || "Anotações")
  );
  const playerTimeRef = useRef<number>(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // BroadcastChannel para comunicação com a janela principal
  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (event) => {
      const { type, ...data } = event.data;
      switch (type) {
        case "time-update":
          playerTimeRef.current = data.time;
          break;
        case "lesson-changed":
          setLessonId(data.lessonId);
          setCourseId(data.courseId);
          setLessonTitle(data.title || "Anotações");
          setRefreshTrigger((n) => n + 1);
          break;
        case "note-saved-from-main":
          setRefreshTrigger((n) => n + 1);
          break;
      }
    };

    channel.postMessage({ type: "popup-ready" });

    // Notificar janela principal ao fechar
    const handleBeforeUnload = () => {
      channel.postMessage({ type: "popup-closing" });
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      channel.close();
    };
  }, []);

  const handleSeek = useCallback((time: number) => {
    channelRef.current?.postMessage({ type: "seek", time });
  }, []);

  const handleNavigateToLesson = useCallback((id: number) => {
    channelRef.current?.postMessage({ type: "navigate-to-lesson", lessonId: id });
  }, []);

  const handleNoteSaved = useCallback(() => {
    channelRef.current?.postMessage({ type: "note-saved" });
  }, []);

  // Título da janela
  useEffect(() => {
    document.title = `Anotações — ${lessonTitle}`;
  }, [lessonTitle]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header compacto */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-card shrink-0">
        <Pencil className="h-4 w-4 text-purple-500" />
        <h1 className="text-sm font-semibold truncate flex-1">{lessonTitle}</h1>
      </div>

      {/* NoteList ocupa o resto */}
      <div className="flex-1 overflow-hidden">
        <NoteList
          lessonId={lessonId}
          courseId={courseId}
          playerTimeRef={playerTimeRef}
          onSeek={handleSeek}
          onNavigateToLesson={handleNavigateToLesson}
          refreshTrigger={refreshTrigger}
          onNoteSaved={handleNoteSaved}
        />
      </div>
    </div>
  );
}
