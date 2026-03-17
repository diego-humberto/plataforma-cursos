import LessonViewer from "@/components/lesson/lesson-viewer";
import { CourseSidebar } from "@/components/lesson/course-sidebar";
import useApiUrl from "@/hooks/useApiUrl";
import useCourseCompletion from "@/hooks/useCourseCompletion";
import useSelectedLesson from "@/hooks/useSelectedLesson";
import { Lesson, NestedModules } from "@/models/models";
import { getLessons } from "@/services/getLessons";
import { getModuleLinks, type ModuleLinks } from "@/services/moduleLinks";
import api from "@/lib/api";
import { sortLessons } from "@/utils/sort-lessons";
import { setLastViewedLesson } from "@/utils/utils";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle, useDefaultLayout } from "react-resizable-panels";
import LessonSkeleton from "@/components/lesson/lesson-skeleton";
import { toast } from "sonner";
import type { MediaPlayerInstance } from "@vidstack/react";

const ACTIVE_TAB_KEY = "course-sidebar-tab";

export default function CoursePage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const playerTimeRef = useRef<number>(0);
  const playerInstanceRef = useRef<MediaPlayerInstance | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState(() => {
    try { return localStorage.getItem(ACTIVE_TAB_KEY) || "aulas"; } catch { return "aulas"; }
  });
  const [lessonSearch, setLessonSearch] = useState("");
  const [isSidebarHeaderOpen, setIsSidebarHeaderOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
  const [noteRefreshTrigger, setNoteRefreshTrigger] = useState(0);
  const [moduleLinks, setModuleLinks] = useState<ModuleLinks>({});

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "course-layout",
    storage: localStorage,
  });

  const { courseId } = useParams<{ courseId: string }>();
  const { selectedLesson, clearSelection, selectLesson } = useSelectedLesson();
  const { apiUrl } = useApiUrl();

  const { fetchCompletion } = useCourseCompletion();

  async function onFetch(minimal: boolean = false) {
    try {
      if (!minimal) {
        setIsLoading(true);
      }

      const lessons: Lesson[] = await getLessons(apiUrl, Number(courseId));

      sortLessons(lessons);

      setLessons(lessons);
    } catch {
      toast.error("Erro ao carregar aulas. Tente novamente.");
    } finally {
      if (!minimal) {
        setIsLoading(false);
      }
    }
  }

  const modules = useMemo<NestedModules>(() => {
    const nested: NestedModules = {};
    lessons.forEach((l) => {
      const parts = l.module.split("/");
      const section = parts[0] || "(Raiz)";
      const subgroup = parts.length >= 2 ? parts.slice(1).join("/") : "(Geral)";

      if (!nested[section]) {
        nested[section] = {};
      }
      if (!nested[section][subgroup]) {
        nested[section][subgroup] = [];
      }
      nested[section][subgroup].push(l);
    });
    return nested;
  }, [lessons]);

  useEffect(() => {
    onFetch();
    clearSelection();
    if (courseId) {
      getModuleLinks(apiUrl, Number(courseId)).then(setModuleLinks).catch(() => {});
    }
  }, [courseId, apiUrl]);

  // Auto-scroll para aula ativa ao carregar
  useEffect(() => {
    if (!selectedLesson || !sidebarRef.current) return;
    const scrollToActive = () => {
      const activeEl = sidebarRef.current?.querySelector('[data-active-lesson="true"]');
      activeEl?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    const t1 = setTimeout(scrollToActive, 300);
    const t2 = setTimeout(scrollToActive, 700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [selectedLesson?.id]);

  // Atualizar "última aula assistida" sempre que trocar de aula
  useEffect(() => {
    if (selectedLesson && courseId && lessons.length > 0) {
      // Só salvar se a lesson pertence a este curso (evita contaminar o localStorage ao trocar de curso)
      const belongsToCourse = lessons.some(l => l.id === selectedLesson.id);
      if (belongsToCourse) {
        setLastViewedLesson(courseId, selectedLesson);
      }
    }
  }, [selectedLesson?.id, courseId, lessons]);

  // Lista plana na ordem dos módulos (mesma ordem do sidebar)
  const lessonsInModuleOrder = useMemo(() => {
    const result: Lesson[] = [];
    const sortedSections = Object.entries(modules).sort((a, b) =>
      a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: "base" })
    );
    for (const [, subgroups] of sortedSections) {
      const sortedSubs = Object.entries(subgroups).sort((a, b) =>
        a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: "base" })
      );
      for (const [, subs] of sortedSubs) {
        result.push(...subs);
      }
    }
    return result;
  }, [modules]);

  const nextLesson = useMemo(() => {
    if (!selectedLesson) return null;
    const idx = lessonsInModuleOrder.findIndex((l) => l.id === selectedLesson.id);
    if (idx < 0) return null;
    // Pular documentos (PDF, HTML, TXT) e encontrar o próximo vídeo
    for (let i = idx + 1; i < lessonsInModuleOrder.length; i++) {
      const url = (lessonsInModuleOrder[i].pdf_url || lessonsInModuleOrder[i].video_url || "").toLowerCase();
      if (!url.endsWith(".pdf") && !url.endsWith(".html") && !url.endsWith(".txt")) {
        return lessonsInModuleOrder[i];
      }
    }
    return null;
  }, [selectedLesson, lessonsInModuleOrder]);

  const handleBatchToggle = useCallback((lessonIds: number[], isCompleted: boolean) => {
    setLessons((prev) =>
      prev.map((l) =>
        lessonIds.includes(l.id) ? { ...l, isCompleted: isCompleted ? 1 : 0 } : l
      )
    );
    fetchCompletion(apiUrl, Number(courseId));
    api.post(`${apiUrl}/api/batch-update-lessons`, { lessonIds, isCompleted }).catch(() => {
      onFetch(true);
    });
  }, [apiUrl, courseId]);

  const handleSidebarUpdate = useCallback(() => {
    onFetch(true);
    fetchCompletion(apiUrl, Number(courseId));
  }, [apiUrl, courseId]);

  const handleSeek = useCallback((time: number) => {
    if (playerInstanceRef.current) {
      playerInstanceRef.current.currentTime = time;
    }
  }, []);

  // Janela flutuante de anotações (window.open — coexiste com Video PiP)
  const [isNotesPipOpen, setIsNotesPipOpen] = useState(false);
  const notesPipWindowRef = useRef<Window | null>(null);

  const openNotesPip = useCallback(() => {
    // Se já está aberto, focar a janela existente
    if (notesPipWindowRef.current && !notesPipWindowRef.current.closed) {
      notesPipWindowRef.current.focus();
      return;
    }

    if (!selectedLesson) return;
    const params = new URLSearchParams({
      lessonId: String(selectedLesson.id),
      ...(courseId ? { courseId } : {}),
      title: encodeURIComponent(selectedLesson.title),
    });

    const windowFeatures = [
      "popup=yes",
      "width=460",
      "height=650",
      "left=50",
      "top=100",
      "toolbar=no",
      "menubar=no",
      "location=no",
      "status=no",
      "scrollbars=no",
      "resizable=yes",
    ].join(",");

    const popup = window.open(
      `/notas-popup?${params.toString()}`,
      "notes-popup",
      windowFeatures
    );

    if (popup) {
      notesPipWindowRef.current = popup;
      setIsNotesPipOpen(true);
    }
  }, [selectedLesson, courseId]);

  // Detectar fechamento da janela popup via polling
  useEffect(() => {
    if (!isNotesPipOpen) return;
    const interval = setInterval(() => {
      if (!notesPipWindowRef.current || notesPipWindowRef.current.closed) {
        setIsNotesPipOpen(false);
        notesPipWindowRef.current = null;
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isNotesPipOpen]);

  // BroadcastChannel para sincronizar com popup de anotações (fallback window.open)
  useEffect(() => {
    const channel = new BroadcastChannel("notes-channel");

    // Enviar tempo do player a cada 500ms
    const interval = setInterval(() => {
      channel.postMessage({ type: "time-update", time: playerTimeRef.current });
    }, 500);

    // Receber mensagens do popup
    channel.onmessage = (event) => {
      switch (event.data.type) {
        case "popup-ready":
          setIsNotesPipOpen(true);
          break;
        case "popup-closing":
          setIsNotesPipOpen(false);
          notesPipWindowRef.current = null;
          break;
        case "seek":
          if (playerInstanceRef.current) {
            playerInstanceRef.current.currentTime = event.data.time;
          }
          break;
        case "note-saved":
          setNoteRefreshTrigger((n) => n + 1);
          break;
        case "navigate-to-lesson": {
          const lesson = lessons.find((l) => l.id === event.data.lessonId);
          if (lesson) selectLesson(lesson);
          break;
        }
      }
    };

    return () => {
      clearInterval(interval);
      channel.close();
    };
  }, [lessons, selectLesson]);

  // Notificar popup quando trocar de aula
  useEffect(() => {
    if (!selectedLesson) return;
    const channel = new BroadcastChannel("notes-channel");
    channel.postMessage({
      type: "lesson-changed",
      lessonId: selectedLesson.id,
      courseId,
      title: selectedLesson.title,
    });
    channel.close();
  }, [selectedLesson?.id, courseId]);

  const handleNavigateToLesson = useCallback((id: number) => {
    const lesson = lessons.find((l) => l.id === id);
    if (lesson) selectLesson(lesson);
  }, [lessons, selectLesson]);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    try { localStorage.setItem(ACTIVE_TAB_KEY, value); } catch {}
    if (value === "aulas") {
      // Aguardar render completo da aba + accordions antes de scrollar
      setTimeout(() => {
        const activeEl = sidebarRef.current?.querySelector('[data-active-lesson="true"]');
        if (activeEl) {
          activeEl.scrollIntoView({ behavior: "instant", block: "center" });
        } else if (sidebarRef.current) {
          sidebarRef.current.scrollTop = 0;
        }
      }, 350);
    }
  }, []);

  // Ctrl+K para focar busca de aulas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        handleTabChange("aulas");
        requestAnimationFrame(() => searchInputRef.current?.focus());
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleTabChange]);

  const filteredModules = useMemo(() => {
    if (!lessonSearch.trim()) return modules;
    const term = lessonSearch.toLowerCase();
    const result: NestedModules = {};
    for (const [section, subgroups] of Object.entries(modules)) {
      for (const [sub, lessons] of Object.entries(subgroups)) {
        const matched = lessons.filter((l) => l.title.toLowerCase().includes(term));
        if (matched.length > 0) {
          if (!result[section]) result[section] = {};
          result[section][sub] = matched;
        }
      }
    }
    return result;
  }, [modules, lessonSearch]);

  // Aulas da mesma subpasta (siblings) para navegação rápida acima do player
  const siblingLessons = useMemo(() => {
    if (!selectedLesson?.module) return [];
    return lessons.filter((l) => l.module === selectedLesson.module);
  }, [lessons, selectedLesson]);

  // Breadcrumb: mostrar caminho completo de pastas da aula selecionada
  const breadcrumbParts = useMemo(() => {
    if (!selectedLesson?.module) return [];
    return selectedLesson.module.split("/").filter(Boolean);
  }, [selectedLesson]);

  // Scroll suave até o conteúdo (vídeo/PDF) ao clicar no breadcrumb
  const scrollToContent = useCallback(() => {
    setActiveTab("aulas");
    setLessonSearch("");
    requestAnimationFrame(() => {
      contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  if (!courseId) {
    return "Sem id de curso";
  }

  if (isLoading) {
    return <LessonSkeleton />;
  }

  return (
    <div className="space-y-2">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground px-1 flex-wrap">
        <Link to="/" className="flex items-center gap-1 hover:text-foreground transition-colors shrink-0">
          <Home className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Meus Cursos</span>
        </Link>
        {selectedLesson?.course_title && (
          <>
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
            <Link to="/" className="hover:text-foreground transition-colors truncate max-w-[180px]" title={selectedLesson.course_title}>
              {selectedLesson.course_title}
            </Link>
          </>
        )}
        {breadcrumbParts.map((part, i) => {
          const isLast = i === breadcrumbParts.length - 1;
          return (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
              <button
                onClick={scrollToContent}
                className={`hover:text-foreground transition-colors truncate max-w-[200px] ${isLast ? "text-foreground font-medium" : ""}`}
                title={part}
              >
                {part}
              </button>
            </span>
          );
        })}
      </nav>

      {isDesktop ? (
        <PanelGroup orientation="horizontal" defaultLayout={defaultLayout} onLayoutChanged={onLayoutChanged} className="gap-2">
          <Panel id="player" defaultSize="70%" minSize="50%">
            <div ref={contentRef} className="w-full max-h-max bg-card rounded-md h-full">
              <LessonViewer
                lesson={selectedLesson}
                nextLesson={nextLesson}
                playerTimeRef={playerTimeRef}
                onPlayerReady={(p) => { playerInstanceRef.current = p; }}
                siblingLessons={siblingLessons}
                allLessons={lessons}
                onSelectLesson={selectLesson}
                onOpenNotesPip={openNotesPip}
                isNotesPipOpen={isNotesPipOpen}
                onLessonCompleted={() => {
                  onFetch(true);
                  fetchCompletion(apiUrl, Number(courseId));
                }}
              />
            </div>
          </Panel>

          <PanelResizeHandle className="resize-handle" />

          <Panel id="sidebar" defaultSize="30%" minSize="15%" maxSize="45%" collapsible collapsedSize="0%">
            <CourseSidebar
              sidebarRef={sidebarRef}
              courseTitle={selectedLesson?.course_title}
              courseId={courseId}
              isSidebarHeaderOpen={isSidebarHeaderOpen}
              onToggleSidebarHeader={() => setIsSidebarHeaderOpen((v) => !v)}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              lessonSearch={lessonSearch}
              onLessonSearchChange={setLessonSearch}
              filteredModules={filteredModules}
              onUpdate={handleSidebarUpdate}
              onBatchToggle={handleBatchToggle}
              moduleLinks={moduleLinks}
              onModuleLinksChange={setModuleLinks}
              apiUrl={apiUrl}
              selectedLessonId={selectedLesson?.id ?? null}
              playerTimeRef={playerTimeRef}
              onSeek={handleSeek}
              onNavigateToLesson={handleNavigateToLesson}
              refreshTrigger={noteRefreshTrigger}
            />
          </Panel>
        </PanelGroup>
      ) : (
        /* Mobile: layout empilhado sem resize */
        <div className="flex flex-col gap-2">
          <div ref={contentRef} className="w-full max-h-max bg-card rounded-md">
            <LessonViewer
              lesson={selectedLesson}
              nextLesson={nextLesson}
              playerTimeRef={playerTimeRef}
              onPlayerReady={(p) => { playerInstanceRef.current = p; }}
              siblingLessons={siblingLessons}
              allLessons={lessons}
              onSelectLesson={selectLesson}
              onLessonCompleted={() => {
                onFetch(true);
                fetchCompletion(apiUrl, Number(courseId));
              }}
            />
          </div>
          <CourseSidebar
            sidebarRef={sidebarRef}
            courseTitle={selectedLesson?.course_title}
            courseId={courseId}
            isSidebarHeaderOpen={isSidebarHeaderOpen}
            onToggleSidebarHeader={() => setIsSidebarHeaderOpen((v) => !v)}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            lessonSearch={lessonSearch}
            onLessonSearchChange={setLessonSearch}
            filteredModules={filteredModules}
            onUpdate={handleSidebarUpdate}
            onBatchToggle={handleBatchToggle}
            moduleLinks={moduleLinks}
            onModuleLinksChange={setModuleLinks}
            apiUrl={apiUrl}
            selectedLessonId={selectedLesson?.id ?? null}
            playerTimeRef={playerTimeRef}
            onSeek={handleSeek}
            onNavigateToLesson={handleNavigateToLesson}
            className="w-full"
          />
        </div>
      )}

    </div>
  );
}
