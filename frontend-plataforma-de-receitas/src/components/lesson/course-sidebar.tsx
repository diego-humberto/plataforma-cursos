import CoursePercentage from "@/components/course-percentage";
import LastWatchedCard from "@/components/lesson/last-watched-card";
import ModuleList from "@/components/lesson/module-list";
import NoteList from "@/components/lesson/note-list";
import { NestedModules } from "@/models/models";
import { type ModuleLinks } from "@/services/moduleLinks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import React from "react";

interface CourseSidebarProps {
  sidebarRef: React.RefObject<HTMLDivElement>;
  courseTitle?: string;
  courseId: string;
  isSidebarHeaderOpen: boolean;
  onToggleSidebarHeader: () => void;
  activeTab: string;
  onTabChange: (value: string) => void;
  lessonSearch: string;
  onLessonSearchChange: (value: string) => void;
  filteredModules: NestedModules;
  onUpdate: () => void;
  onBatchToggle: (lessonIds: number[], isCompleted: boolean) => void;
  moduleLinks: ModuleLinks;
  onModuleLinksChange: (links: ModuleLinks) => void;
  apiUrl: string;
  selectedLessonId: number | null;
  playerTimeRef: React.RefObject<number>;
  onSeek: (time: number) => void;
  onNavigateToLesson: (id: number) => void;
  refreshTrigger?: number;
  className?: string;
}

export function CourseSidebar({
  sidebarRef,
  courseTitle,
  courseId,
  isSidebarHeaderOpen,
  onToggleSidebarHeader,
  activeTab,
  onTabChange,
  lessonSearch,
  onLessonSearchChange,
  filteredModules,
  onUpdate,
  onBatchToggle,
  moduleLinks,
  onModuleLinksChange,
  apiUrl,
  selectedLessonId,
  playerTimeRef,
  onSeek,
  onNavigateToLesson,
  refreshTrigger,
  className = "",
}: CourseSidebarProps) {
  return (
    <div
      ref={sidebarRef}
      className={`max-h-screen bg-card rounded-md border overflow-y-scroll h-full ${className}`}
    >
      {/* Header colapsável */}
      <button
        onClick={onToggleSidebarHeader}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors"
      >
        <div className="text-left min-w-0 flex-1">
          <h3 className="font-semibold text-sm truncate">{courseTitle}</h3>
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
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
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
                onChange={(e) => onLessonSearchChange(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
              {lessonSearch && (
                <button
                  onClick={() => onLessonSearchChange("")}
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
            onUpdate={onUpdate}
            onBatchToggle={onBatchToggle}
            courseId={courseId}
            moduleLinks={moduleLinks}
            onModuleLinksChange={onModuleLinksChange}
            apiUrl={apiUrl}
          />
        </TabsContent>
        <TabsContent value="anotacoes" forceMount className="mt-0 data-[state=inactive]:hidden">
          <NoteList
            lessonId={selectedLessonId}
            courseId={courseId}
            playerTimeRef={playerTimeRef}
            onSeek={onSeek}
            onNavigateToLesson={onNavigateToLesson}
            refreshTrigger={refreshTrigger}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
