import { Lesson } from "@/models/models";
import { Player } from "../player/player";
import useApiUrl from "@/hooks/useApiUrl";
import { updateWatchedTime } from "@/services/updateWatchedTime";
import { Button } from "../ui/button";
import { Check, ChevronLeft, ChevronRight, FileText, Maximize, Minimize, MonitorPlay, Pencil, Play, X } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";

const isDocumentFile = (url: string): boolean => {
  return (
    url.toLowerCase().endsWith(".txt") ||
    url.toLowerCase().endsWith(".pdf") ||
    url.toLowerCase().endsWith(".html")
  );
};

const getResourcePath = (lesson: Lesson): string => {
  return `/serve-content?path=${encodeURIComponent(
    lesson.pdf_url || lesson.video_url || ""
  )}`;
};

const getFileExt = (lesson: Lesson): string => {
  const url = lesson.pdf_url || lesson.video_url || "";
  const ext = url.split(".").pop()?.toLowerCase() || "";
  return ext;
};

const isVideoExt = (ext: string) => ["mp4", "avi", "mov", "wmv", "flv", "mkv", "webm"].includes(ext);

const LANGUAGE_LABELS: Record<string, string> = {
  pt: "Português",
  "pt-BR": "Português (BR)",
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  ja: "日本語",
  ko: "한국어",
  zh: "中文",
};

function buildSubtitleTracks(
  subtitleUrls: string[],
  apiUrl: string
): { src: string; label: string; language: string; default: boolean }[] {
  return subtitleUrls.map((filePath, index) => {
    const fileName = filePath.split(/[/\\]/).pop() || "";
    const parts = fileName.replace(/\.(srt|vtt)$/i, "").split(".");
    // parts: ["aula01"] ou ["aula01", "pt"] ou ["aula01", "pt-BR"]
    const langCode = parts.length > 1 ? parts[parts.length - 1] : "";
    const label = langCode
      ? LANGUAGE_LABELS[langCode] || langCode
      : "Legenda";
    const language = langCode || "pt";
    const src = `${apiUrl}/serve-content?path=${encodeURIComponent(filePath)}`;
    return { src, label, language, default: index === 0 };
  });
}

const NEXT_LESSON_COUNTDOWN = 10;
const AUTOPLAY_KEY = "autoPlayNextLesson";

type Props = {
  lesson: Lesson | null;
  nextLesson?: Lesson | null;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  isTheaterMode?: boolean;
  onToggleTheaterMode?: () => void;
  playerTimeRef?: React.RefObject<number>;
  onPlayerReady?: (player: any) => void;
  siblingLessons?: Lesson[];
  onSelectLesson?: (lesson: Lesson) => void;
  onNoteSaved?: () => void;
  onOpenNotesPip?: () => void;
  isNotesPipOpen?: boolean;
  onLessonCompleted?: () => void;
};

export default function LessonViewer({
  lesson,
  nextLesson,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
  isTheaterMode = false,
  onToggleTheaterMode,
  playerTimeRef,
  onPlayerReady,
  siblingLessons = [],
  onSelectLesson,
  onNoteSaved,
  onOpenNotesPip,
  isNotesPipOpen = false,
  onLessonCompleted,
}: Props) {
  const [elapsedTime, setElapsedTime] = useState<number>(
    lesson?.time_elapsed || 0
  );
  const [isPip, setIsPip] = useState(false);
  const [showNextOverlay, setShowNextOverlay] = useState(false);
  const [countdown, setCountdown] = useState(NEXT_LESSON_COUNTDOWN);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [autoPlayNext, setAutoPlayNext] = useState(() =>
    localStorage.getItem(AUTOPLAY_KEY) !== "false"
  );
  const { apiUrl } = useApiUrl();
  const isDocument = lesson
    ? isDocumentFile(lesson.pdf_url || lesson.video_url)
    : false;

  const currentLessonIdRef = useRef<number | null>(null);

  // Próximo vídeo da mesma pasta (pula documentos), senão fallback para global
  const siblingIndex = lesson ? siblingLessons.findIndex((s) => s.id === lesson.id) : -1;
  const nextSibling = (() => {
    if (siblingIndex < 0) return null;
    for (let i = siblingIndex + 1; i < siblingLessons.length; i++) {
      const url = (siblingLessons[i].pdf_url || siblingLessons[i].video_url || "").toLowerCase();
      if (!url.endsWith(".pdf") && !url.endsWith(".html") && !url.endsWith(".txt")) {
        return siblingLessons[i];
      }
    }
    return null;
  })();
  const overlayLesson = nextSibling || nextLesson;

  // Limpar overlay ao trocar de aula
  useEffect(() => {
    setShowNextOverlay(false);
    setCountdown(NEXT_LESSON_COUNTDOWN);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, [lesson?.id]);

  // Navegar para overlayLesson via selectLesson (ordem dos módulos)
  const navigateToOverlay = useCallback(() => {
    if (overlayLesson && onSelectLesson) {
      onSelectLesson(overlayLesson);
    }
  }, [overlayLesson, onSelectLesson]);

  const toggleAutoPlay = useCallback(() => {
    setAutoPlayNext((prev) => {
      const next = !prev;
      localStorage.setItem(AUTOPLAY_KEY, String(next));
      if (!next && countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      return next;
    });
  }, []);

  // Countdown timer (só roda se autoPlayNext estiver ativo)
  useEffect(() => {
    if (!showNextOverlay || !overlayLesson || !autoPlayNext) return;
    setCountdown(NEXT_LESSON_COUNTDOWN);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          navigateToOverlay();
          setShowNextOverlay(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [showNextOverlay, navigateToOverlay, autoPlayNext]);

  const handleVideoEnded = useCallback(() => {
    if (overlayLesson) {
      setShowNextOverlay(true);
    }
  }, [overlayLesson]);

  const dismissOverlay = useCallback(() => {
    setShowNextOverlay(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const goNextNow = useCallback(() => {
    setShowNextOverlay(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
    navigateToOverlay();
  }, [navigateToOverlay]);

  useEffect(() => {
    if (!lesson) return;

    const fetchElapsedTime = async () => {
      try {
        const res = await api.get(`${apiUrl}/api/lessons/${lesson.id}`);
        setElapsedTime(Number(res.data.elapsedTime));
      } catch (error) {
        console.error("Erro ao buscar o tempo decorrido da aula:", error);
      }
    };

    fetchElapsedTime();

    currentLessonIdRef.current = lesson.id;
  }, [lesson, apiUrl]);

  const handleTimeUpdate = (currentTime: number) => {
    if (!lesson) return;
    const lessonId = currentLessonIdRef.current ?? lesson.id;
    updateWatchedTime(apiUrl, lessonId, currentTime);
  };

  const openInDefaultApp = async () => {
    if (!lesson) return;
    const filePath = lesson.pdf_url || lesson.video_url;
    try {
      await api.post(`${apiUrl}/api/open-file`, { path: filePath });
    } catch {
      toast.error("Erro ao abrir arquivo externamente.");
    }
  };

  if (!lesson) {
    return (
      <div className="flex-1 aspect-video bg-neutral-100 dark:bg-secondary rounded-md flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <MonitorPlay className="h-16 w-16 opacity-20" />
        <p className="text-sm">Selecione uma aula para começar</p>
      </div>
    );
  }

  return (
    <div className="flex-1">
      {isDocument ? (
        <div className={`w-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden ${isTheaterMode ? "" : "rounded-md"}`} style={{ height: "calc(100vh - 180px)" }}>
          <iframe
            className="w-full h-full border-0"
            src={`${apiUrl}${getResourcePath(lesson)}#zoom=100&view=FitH`}
          ></iframe>
        </div>
      ) : (
        <div className="relative">
          <Player
            title={lesson.title}
            src={`${apiUrl}${getResourcePath(lesson)}`}
            lessonId={currentLessonIdRef.current ?? lesson.id}
            onTimeUpdate={handleTimeUpdate}
            onComplete={handleVideoEnded}
            timeElapsed={elapsedTime}
            playerTimeRef={playerTimeRef}
            onPlayerReady={onPlayerReady}
            isTheaterMode={isTheaterMode}
            onPipChange={setIsPip}
            onLessonCompleted={onLessonCompleted}
            subtitles={
              lesson.subtitle_urls?.length
                ? buildSubtitleTracks(lesson.subtitle_urls, apiUrl)
                : undefined
            }
          />

          {/* Placeholder quando PiP está ativo */}
          {isPip && (
            <div className="absolute inset-0 z-40 bg-background/95 backdrop-blur-sm rounded-md flex flex-col items-center justify-center gap-3">
              <Pencil className="h-8 w-8 text-purple-500/30" />
              <p className="text-sm text-muted-foreground">Vídeo em PiP</p>
              {!isNotesPipOpen && onOpenNotesPip && (
                <Button variant="outline" size="sm" onClick={onOpenNotesPip}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Abrir anotações
                </Button>
              )}
            </div>
          )}

          {/* Overlay: próxima aula */}
          {showNextOverlay && overlayLesson && (
            <div className="absolute bottom-16 right-4 z-50 animate-in slide-in-from-right-5 fade-in duration-300">
              <div className="bg-black/90 backdrop-blur-sm rounded-lg border border-white/10 p-4 shadow-2xl w-72">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">
                    Próxima aula
                  </span>
                  <button
                    onClick={dismissOverlay}
                    className="text-white/40 hover:text-white transition-colors -mt-0.5"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm font-medium text-white leading-snug mb-3 line-clamp-2">
                  {overlayLesson.title}
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={goNextNow}
                    className="flex-1 flex items-center justify-center gap-2 bg-white text-black font-semibold text-sm py-2 px-4 rounded-md hover:bg-white/90 transition-colors"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Reproduzir
                  </button>
                  {autoPlayNext && (
                    <div className="relative h-9 w-9 shrink-0">
                      <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="2" />
                        <circle
                          cx="18" cy="18" r="15.5" fill="none" stroke="white" strokeWidth="2"
                          strokeDasharray={2 * Math.PI * 15.5}
                          strokeDashoffset={2 * Math.PI * 15.5 * (1 - countdown / NEXT_LESSON_COUNTDOWN)}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-linear"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                        {countdown}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-2">
                  <span className="text-[11px] text-white/50">Reprodução automática</span>
                  <button
                    onClick={toggleAutoPlay}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${autoPlayNext ? "bg-green-500" : "bg-white/20"}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${autoPlayNext ? "translate-x-[19px]" : "translate-x-[3px]"}`} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Barra de navegação entre aulas da mesma pasta */}
      {siblingLessons.length > 1 && onSelectLesson && (
        <div className="px-2 pt-2">
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
            {siblingLessons.map((sibling) => {
              const isActive = sibling.id === lesson.id;
              const ext = getFileExt(sibling);
              const isVideo = isVideoExt(ext);
              return (
                <button
                  key={sibling.id}
                  onClick={() => onSelectLesson(sibling)}
                  title={sibling.title}
                  className={`
                    group relative flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-all shrink-0
                    ${isActive
                      ? "bg-purple-600 text-white shadow-sm shadow-purple-500/25"
                      : sibling.isCompleted
                        ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40"
                        : "bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/60"
                    }
                  `}
                >
                  {sibling.isCompleted && !isActive ? (
                    <Check className="h-3 w-3 shrink-0" />
                  ) : isVideo ? (
                    <Play className={`h-3 w-3 shrink-0 ${isActive ? "fill-current" : ""}`} />
                  ) : (
                    <FileText className="h-3 w-3 shrink-0" />
                  )}
                  <span className="truncate max-w-[160px]">{sibling.title}</span>
                </button>
              );
            })}
          </div>
          {/* Barra de progresso geral da pasta */}
          <div className="mt-1.5 h-[3px] w-full rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-purple-500 transition-all duration-300"
              style={{
                width: `${siblingLessons.length > 0
                  ? (siblingLessons.filter(s => s.isCompleted).length / siblingLessons.length) * 100
                  : 0}%`
              }}
            />
          </div>
        </div>
      )}

      <div className="flex justify-between items-center px-4 py-2 border-t border-transparent">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasPrevious}
            onClick={onPrevious}
            className={!hasPrevious ? "opacity-40" : ""}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNext}
            onClick={onNext}
            className={!hasNext ? "opacity-40" : ""}
          >
            Próxima
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <div className="flex gap-1">
          {!isDocument && onOpenNotesPip && (
            <Button
              variant={isNotesPipOpen ? "default" : "outline"}
              size="sm"
              onClick={onOpenNotesPip}
              title="Abrir anotações em janela flutuante"
            >
              <Pencil className="h-4 w-4 mr-1" />
              Anotar
            </Button>
          )}
          {onToggleTheaterMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleTheaterMode}
              title={isTheaterMode ? "Sair do modo teatro" : "Modo teatro"}
            >
              {isTheaterMode ? (
                <>
                  <Minimize className="h-4 w-4 mr-1" />
                  Modo padrão
                </>
              ) : (
                <>
                  <Maximize className="h-4 w-4 mr-1" />
                  Modo teatro
                </>
              )}
            </Button>
          )}
        </div>
      </div>

    </div>
  );
}
