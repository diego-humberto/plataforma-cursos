import CoursePercentage from "@/components/course-percentage";
import LastWatchedCard from "@/components/lesson/last-watched-card";
import LessonViewer from "@/components/lesson/lesson-viewer";
import ModuleList from "@/components/lesson/module-list";
import NoteList from "@/components/lesson/note-list";
import useApiUrl from "@/hooks/useApiUrl";
import useCourseCompletion from "@/hooks/useCourseCompletion";
import useSelectedLesson from "@/hooks/useSelectedLesson";
import { Lesson, NestedModules } from "@/models/models";
import { getLessons } from "@/services/getLessons";
import { getModuleLinks, type ModuleLinks } from "@/services/moduleLinks";
import api from "@/lib/api";
import { sortLessons } from "@/utils/sort-lessons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronDown, ChevronRight, ChevronUp, Home, Search, X } from "lucide-react";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle, useDefaultLayout } from "react-resizable-panels";
import LessonSkeleton from "@/components/lesson/lesson-skeleton";
import { Input } from "@/components/ui/input";

type Props = {};

export default function CoursePage({}: Props) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modules, setModules] = useState<NestedModules>({});
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const playerTimeRef = useRef<number>(0);
  const playerInstanceRef = useRef<any>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("aulas");
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
      console.log("Ocorreu um erro");
    } finally {
      if (!minimal) {
        setIsLoading(false);
      }
    }
  }

  async function onOrganize() {
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
    setModules(nested);
  }

  useEffect(() => {
    onOrganize();
  }, [lessons]);

  useEffect(() => {
    onFetch();
    clearSelection();
    if (courseId) {
      getModuleLinks(apiUrl, Number(courseId)).then(setModuleLinks).catch(() => {});
    }
  }, [courseId]);

  const currentIndex = useMemo(() => {
    if (!selectedLesson) return -1;
    return lessons.findIndex((l) => l.id === selectedLesson.id);
  }, [lessons, selectedLesson]);

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < lessons.length - 1;

  const goToPrevious = () => {
    if (hasPrevious) selectLesson(lessons[currentIndex - 1]);
  };

  const goToNext = () => {
    if (hasNext) selectLesson(lessons[currentIndex + 1]);
  };

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

  const handleSeek = useCallback((time: number) => {
    if (playerInstanceRef.current) {
      playerInstanceRef.current.currentTime = time;
    }
  }, []);

  const handleQuickNoteSaved = useCallback(() => {
    setNoteRefreshTrigger((n) => n + 1);
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
    if (value === "aulas") {
      // Rolar até a aula ativa ao voltar para a aba Aulas
      requestAnimationFrame(() => {
        const activeEl = sidebarRef.current?.querySelector('[data-active-lesson="true"]');
        if (activeEl) {
          activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (sidebarRef.current) {
          sidebarRef.current.scrollTop = 0;
        }
      });
    }
  }, []);

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
    if (isTheaterMode) setIsTheaterMode(false);
    requestAnimationFrame(() => {
      contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [isTheaterMode]);

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

      {isTheaterMode ? (
        <>
          <div ref={contentRef} className="-mx-6 bg-black">
            <div>
              <LessonViewer
                lesson={selectedLesson}
                nextLesson={nextLesson}
                onNext={goToNext}
                onPrevious={goToPrevious}
                hasNext={hasNext}
                hasPrevious={hasPrevious}
                isTheaterMode={isTheaterMode}
                onToggleTheaterMode={() => setIsTheaterMode(!isTheaterMode)}
                playerTimeRef={playerTimeRef}
                onPlayerReady={(p) => { playerInstanceRef.current = p; }}
                siblingLessons={siblingLessons}
                onSelectLesson={selectLesson}
                onNoteSaved={handleQuickNoteSaved}
                onOpenNotesPip={openNotesPip}
                isNotesPipOpen={isNotesPipOpen}
                onLessonCompleted={() => {
                  onFetch(true);
                  fetchCompletion(apiUrl, Number(courseId));
                }}
              />
            </div>
          </div>
          <div className="pt-2">
            <h3 className="text-left font-bold">{selectedLesson?.title}</h3>
          </div>
        </>
      ) : isDesktop ? (
        <PanelGroup orientation="horizontal" defaultLayout={defaultLayout} onLayoutChanged={onLayoutChanged} className="gap-2">
          <Panel id="player" defaultSize="70%" minSize="50%">
            <div ref={contentRef} className="w-full space-y-4 max-h-max bg-card rounded-md h-full">
              <LessonViewer
                lesson={selectedLesson}
                nextLesson={nextLesson}
                onNext={goToNext}
                onPrevious={goToPrevious}
                hasNext={hasNext}
                hasPrevious={hasPrevious}
                isTheaterMode={isTheaterMode}
                onToggleTheaterMode={() => setIsTheaterMode(!isTheaterMode)}
                playerTimeRef={playerTimeRef}
                onPlayerReady={(p) => { playerInstanceRef.current = p; }}
                siblingLessons={siblingLessons}
                onSelectLesson={selectLesson}
                onNoteSaved={handleQuickNoteSaved}
                onOpenNotesPip={openNotesPip}
                isNotesPipOpen={isNotesPipOpen}
                onLessonCompleted={() => {
                  onFetch(true);
                  fetchCompletion(apiUrl, Number(courseId));
                }}
              />
              <div className="p-4">
                <h3 className="text-left font-bold">{selectedLesson?.title}</h3>
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="resize-handle" />

          <Panel id="sidebar" defaultSize="30%" minSize="15%" maxSize="45%" collapsible collapsedSize="0%">
            <div ref={sidebarRef} className="max-h-screen bg-card rounded-md border overflow-y-scroll h-full">
              {/* Header colapsável */}
              <button
                onClick={() => setIsSidebarHeaderOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors"
              >
                <div className="text-left min-w-0 flex-1">
                  <h3 className="font-semibold text-sm truncate">{selectedLesson?.course_title}</h3>
                </div>
                {isSidebarHeaderOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                )}
              </button>
              {isSidebarHeaderOpen && (
                <div className="px-4 pb-3">
                  <CoursePercentage courseId={Number(courseId)} fromGlobal />
                </div>
              )}

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <div className="sticky top-0 z-10 bg-card border-y">
                  <TabsList className="w-full grid grid-cols-2 mx-0 rounded-none h-10 bg-transparent">
                    <TabsTrigger
                      value="aulas"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm"
                    >
                      Aulas
                    </TabsTrigger>
                    <TabsTrigger
                      value="anotacoes"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm"
                    >
                      Anotações
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="aulas" forceMount className="mt-0 data-[state=inactive]:hidden">
                  <div className="px-3 py-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="Buscar aula..."
                        value={lessonSearch}
                        onChange={(e) => setLessonSearch(e.target.value)}
                        className="pl-8 h-8 text-sm"
                      />
                      {lessonSearch && (
                        <button
                          onClick={() => setLessonSearch("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {!lessonSearch && <LastWatchedCard courseId={courseId} />}
                  <ModuleList
                    modules={filteredModules}
                    onUpdate={() => {
                      onFetch(true);
                      fetchCompletion(apiUrl, Number(courseId));
                    }}
                    onBatchToggle={handleBatchToggle}
                    courseId={courseId}
                    moduleLinks={moduleLinks}
                    onModuleLinksChange={setModuleLinks}
                    apiUrl={apiUrl}
                  />
                </TabsContent>
                <TabsContent value="anotacoes" forceMount className="mt-0 data-[state=inactive]:hidden">
                  <NoteList
                    lessonId={selectedLesson?.id ?? null}
                    courseId={courseId}
                    playerTimeRef={playerTimeRef}
                    onSeek={handleSeek}
                    onNavigateToLesson={handleNavigateToLesson}
                    refreshTrigger={noteRefreshTrigger}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </Panel>
        </PanelGroup>
      ) : (
        /* Mobile: layout empilhado sem resize */
        <div className="flex flex-col gap-2">
          <div ref={contentRef} className="w-full space-y-4 max-h-max bg-card rounded-md">
            <LessonViewer
              lesson={selectedLesson}
              nextLesson={nextLesson}
              onNext={goToNext}
              onPrevious={goToPrevious}
              hasNext={hasNext}
              hasPrevious={hasPrevious}
              isTheaterMode={isTheaterMode}
              onToggleTheaterMode={() => setIsTheaterMode(!isTheaterMode)}
              playerTimeRef={playerTimeRef}
              onPlayerReady={(p) => { playerInstanceRef.current = p; }}
              siblingLessons={siblingLessons}
              onSelectLesson={selectLesson}
              onLessonCompleted={() => {
                onFetch(true);
                fetchCompletion(apiUrl, Number(courseId));
              }}
            />
            <div className="p-4">
              <h3 className="text-left font-bold">{selectedLesson?.title}</h3>
            </div>
          </div>
          <div ref={sidebarRef} className="max-h-screen bg-card rounded-md border overflow-y-scroll w-full">
            {/* Header colapsável */}
            <button
              onClick={() => setIsSidebarHeaderOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors"
            >
              <div className="text-left min-w-0 flex-1">
                <h3 className="font-semibold text-sm truncate">{selectedLesson?.course_title}</h3>
              </div>
              {isSidebarHeaderOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
              )}
            </button>
            {isSidebarHeaderOpen && (
              <div className="px-4 pb-3">
                <CoursePercentage courseId={Number(courseId)} fromGlobal />
              </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <div className="sticky top-0 z-10 bg-card border-y">
                <TabsList className="w-full grid grid-cols-2 mx-0 rounded-none h-10 bg-transparent">
                  <TabsTrigger
                    value="aulas"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm"
                  >
                    Aulas
                  </TabsTrigger>
                  <TabsTrigger
                    value="anotacoes"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm"
                  >
                    Anotações
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="aulas" forceMount className="mt-0 data-[state=inactive]:hidden">
                <div className="px-3 py-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Buscar aula..."
                      value={lessonSearch}
                      onChange={(e) => setLessonSearch(e.target.value)}
                      className="pl-8 h-8 text-sm"
                    />
                    {lessonSearch && (
                      <button
                        onClick={() => setLessonSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {!lessonSearch && <LastWatchedCard courseId={courseId} />}
                <ModuleList
                  modules={filteredModules}
                  onUpdate={() => {
                    onFetch(true);
                    fetchCompletion(apiUrl, Number(courseId));
                  }}
                  onBatchToggle={handleBatchToggle}
                  courseId={courseId}
                  moduleLinks={moduleLinks}
                  onModuleLinksChange={setModuleLinks}
                  apiUrl={apiUrl}
                />
              </TabsContent>
              <TabsContent value="anotacoes" forceMount className="mt-0 data-[state=inactive]:hidden">
                <NoteList
                  lessonId={selectedLesson?.id ?? null}
                  courseId={courseId}
                  playerTimeRef={playerTimeRef}
                  onSeek={handleSeek}
                  onNavigateToLesson={handleNavigateToLesson}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}

    </div>
  );
}
