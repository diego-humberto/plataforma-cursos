import { Lesson, NestedModules } from "@/models/models";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import LessonListItem from "./lesson-list-item";
import useSelectedLesson from "@/hooks/useSelectedLesson";

import {
  calculateCompletionPercentage,
  setLastViewedLesson,
} from "@/utils/utils";

import { toast } from "sonner";
import ProgressCard from "../progress-card";
import { CheckCircle2, ChevronDown, ChevronRight, FolderOpen, Paperclip, FileText, MoreVertical, ExternalLink, Link2, Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { createModuleLink, updateModuleLink, deleteModuleLink, getDistinctLabels, type ModuleLinks } from "@/services/moduleLinks";

type Props = {
  modules: NestedModules;
  onUpdate: () => void;
  onBatchToggle?: (lessonIds: number[], isCompleted: boolean) => void;
  courseId: string;
  moduleLinks?: ModuleLinks;
  onModuleLinksChange?: (links: ModuleLinks) => void;
  apiUrl?: string;
};

// --- Tree helpers ---

type SubgroupNode = {
  title: string;
  lessons: Lesson[];
  children: SubgroupNode[];
};

type GroupedNode = {
  title: string;
  allLessons: Lesson[];
  directLessons: Lesson[];
  subFolders: { name: string; lessons: Lesson[] }[];
};

function buildSubgroupTree(entries: [string, Lesson[]][]): SubgroupNode[] {
  if (entries.length === 0) return [];

  const groups = new Map<string, { main: Lesson[]; childEntries: [string, Lesson[]][] }>();

  for (const [path, lessons] of entries) {
    const slashIdx = path.indexOf("/");
    const first = slashIdx === -1 ? path : path.substring(0, slashIdx);
    const rest = slashIdx === -1 ? null : path.substring(slashIdx + 1);

    if (!groups.has(first)) {
      groups.set(first, { main: [], childEntries: [] });
    }
    const g = groups.get(first)!;
    if (rest === null) {
      g.main.push(...lessons);
    } else {
      g.childEntries.push([rest, lessons]);
    }
  }

  const nodes: SubgroupNode[] = [];
  for (const [title, { main, childEntries }] of groups) {
    nodes.push({
      title,
      lessons: main,
      children: buildSubgroupTree(childEntries),
    });
  }

  nodes.sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" })
  );
  return nodes;
}

/** If a node has no direct lessons and exactly one child, merge with the child (keeping parent title). */
function flattenSingleChildNodes(nodes: SubgroupNode[]): SubgroupNode[] {
  return nodes.map((node) => {
    const flatChildren = flattenSingleChildNodes(node.children);
    if (node.lessons.length === 0 && flatChildren.length === 1) {
      return { ...flatChildren[0], title: node.title };
    }
    return { ...node, children: flatChildren };
  });
}

function getAllNodeLessons(node: SubgroupNode): Lesson[] {
  return [...node.lessons, ...node.children.flatMap(getAllNodeLessons)];
}

function toGroupedNodes(entries: [string, Lesson[]][]): GroupedNode[] {
  const tree = flattenSingleChildNodes(buildSubgroupTree(entries));
  return tree.map((node) => ({
    title: node.title,
    allLessons: getAllNodeLessons(node),
    directLessons: node.lessons,
    subFolders: node.children.map((child) => ({
      name: child.title,
      lessons: getAllNodeLessons(child),
    })),
  }));
}

function getSubfolderIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("anexo")) return Paperclip;
  if (lower.includes("artigo")) return FileText;
  return FolderOpen;
}

// --- Component ---

export default function ModuleList({ modules, onUpdate, onBatchToggle, courseId, moduleLinks = {}, onModuleLinksChange, apiUrl }: Props) {
  const { selectLesson, selectedLesson } = useSelectedLesson();
  const activeLessonRef = useRef<HTMLDivElement>(null);

  // Menu de contexto do módulo
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Dialog de gerenciamento de links
  const [dialogModule, setDialogModule] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [editingLink, setEditingLink] = useState<{ id: number; label: string; url: string } | null>(null);
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [labelSuggestions, setLabelSuggestions] = useState<string[]>([]);

  // Fechar menu ao clicar fora
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const handleOpenLinkDialog = useCallback((sectionTitle: string) => {
    setDialogModule(sectionTitle);
    setNewLabel("");
    setNewUrl("");
    setEditingLink(null);
    setMenuOpen(null);
    if (apiUrl) {
      getDistinctLabels(apiUrl).then(setLabelSuggestions).catch(() => {});
    }
  }, [apiUrl]);

  const handleAddLink = useCallback(async () => {
    if (!dialogModule || !apiUrl || !newUrl.trim()) return;
    setIsSavingLink(true);
    try {
      const created = await createModuleLink(apiUrl, Number(courseId), dialogModule, newLabel.trim() || "Questões", newUrl.trim());
      const updated = { ...moduleLinks };
      if (!updated[dialogModule]) updated[dialogModule] = [];
      updated[dialogModule] = [...updated[dialogModule], created];
      onModuleLinksChange?.(updated);
      setNewLabel("");
      setNewUrl("");
    } catch {
      toast.error("Erro ao adicionar link.");
    } finally {
      setIsSavingLink(false);
    }
  }, [dialogModule, newLabel, newUrl, apiUrl, courseId, moduleLinks, onModuleLinksChange]);

  const handleUpdateLink = useCallback(async () => {
    if (!editingLink || !apiUrl || !dialogModule) return;
    setIsSavingLink(true);
    try {
      const result = await updateModuleLink(apiUrl, editingLink.id, editingLink.label, editingLink.url);
      const updated = { ...moduleLinks };
      updated[dialogModule] = (updated[dialogModule] || []).map((l) =>
        l.id === editingLink.id ? result : l
      );
      onModuleLinksChange?.(updated);
      setEditingLink(null);
    } catch {
      toast.error("Erro ao atualizar link.");
    } finally {
      setIsSavingLink(false);
    }
  }, [editingLink, apiUrl, dialogModule, moduleLinks, onModuleLinksChange]);

  const handleDeleteLink = useCallback(async (linkId: number) => {
    if (!apiUrl || !dialogModule) return;
    try {
      await deleteModuleLink(apiUrl, linkId);
      const updated = { ...moduleLinks };
      updated[dialogModule] = (updated[dialogModule] || []).filter((l) => l.id !== linkId);
      if (updated[dialogModule].length === 0) delete updated[dialogModule];
      onModuleLinksChange?.(updated);
    } catch {
      toast.error("Erro ao remover link.");
    }
  }, [apiUrl, dialogModule, moduleLinks, onModuleLinksChange]);

  // Seções ordenadas (memoizado para índice estável)
  const sortedSections = useMemo(() =>
    Object.entries(modules).sort((a, b) =>
      a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: "base" })
    ),
    [modules]
  );

  // Pré-computar groupedNodes para todas as seções (evita recálculo a cada render)
  const sectionGroupedNodes = useMemo(() =>
    sortedSections.map(([, subgroups]) => {
      const subgroupEntries = Object.entries(subgroups).sort((a, b) =>
        a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: "base" })
      );
      return toGroupedNodes(subgroupEntries);
    }),
    [sortedSections]
  );

  // Estado controlado: seções abertas (outer accordion)
  const [openSections, setOpenSections] = useState<string[]>([]);
  // Estado controlado: subgrupo aberto por seção (inner accordions)
  const [openGroups, setOpenGroups] = useState<Record<string, string | undefined>>({});

  // Estado dos sub-folders colapsáveis (overrides manuais do usuário)
  const [subFolderState, setSubFolderState] = useState<Map<string, boolean>>(new Map());

  const toggleSubFolder = useCallback((key: string, currentlyExpanded: boolean) => {
    setSubFolderState((prev) => {
      const next = new Map(prev);
      next.set(key, !currentlyExpanded);
      return next;
    });
  }, []);

  // Auto-abrir seção e subgrupo da aula selecionada
  useEffect(() => {
    if (!selectedLesson) return;

    const activeSectionIndex = sortedSections.findIndex(([, subgroups]) =>
      Object.values(subgroups).flat().some((l) => l.id === selectedLesson.id)
    );

    if (activeSectionIndex < 0) return;

    const sectionValue = `section-${activeSectionIndex}`;

    // Abrir a seção se não estiver aberta
    setOpenSections((prev) =>
      prev.includes(sectionValue) ? prev : [...prev, sectionValue]
    );

    // Encontrar o subgrupo ativo dentro da seção
    const groupedNodes = sectionGroupedNodes[activeSectionIndex];
    const activeNodeIndex = groupedNodes.findIndex((node) =>
      node.allLessons.some((l) => l.id === selectedLesson.id)
    );

    if (activeNodeIndex >= 0 && groupedNodes.length > 1) {
      setOpenGroups((prev) => ({
        ...prev,
        [sectionValue]: `group-${activeSectionIndex}-${activeNodeIndex}`,
      }));
    }

    // Auto-expandir sub-folder que contém a aula selecionada
    if (activeNodeIndex >= 0) {
      const activeNode = groupedNodes[activeNodeIndex];
      const sectionTitle = sortedSections[activeSectionIndex][0];
      for (const sub of activeNode.subFolders) {
        if (sub.lessons.some((l) => l.id === selectedLesson.id)) {
          const subKey = `${sectionTitle}/${activeNode.title}/${sub.name}`;
          setSubFolderState((prev) => {
            if (prev.get(subKey) === true) return prev;
            const next = new Map(prev);
            next.set(subKey, true);
            return next;
          });
          break;
        }
      }
    }

    // Scroll até a aula ativa apenas dentro da sidebar (sem mover a página)
    // Usa retry porque o accordion pode demorar para montar o conteúdo
    const tryScroll = (attempt: number) => {
      if (attempt > 4) return;
      requestAnimationFrame(() => {
        setTimeout(() => {
          const el = activeLessonRef.current;
          if (!el) {
            tryScroll(attempt + 1);
            return;
          }
          let scrollParent = el.parentElement;
          while (scrollParent && scrollParent.scrollHeight <= scrollParent.clientHeight) {
            scrollParent = scrollParent.parentElement;
          }
          if (!scrollParent) return;
          const elRect = el.getBoundingClientRect();
          const parentRect = scrollParent.getBoundingClientRect();
          const offset = elRect.top - parentRect.top - parentRect.height / 2 + elRect.height / 2;
          scrollParent.scrollBy({ top: offset, behavior: "smooth" });
        }, 150);
      });
    };
    tryScroll(0);
  }, [selectedLesson?.id, sortedSections, sectionGroupedNodes]);

  const handleCompleteLesson = useCallback(() => {
    try {
      onUpdate();
    } catch {
      toast.error("erro ao atualizar progresso");
    }
  }, [onUpdate]);

  const toggleAllLessons = useCallback((lessons: Lesson[], markCompleted: boolean) => {
    if (onBatchToggle) {
      onBatchToggle(lessons.map((l) => l.id), markCompleted);
    }
  }, [onBatchToggle]);

  function getAllLessonsFromSection(subgroups: { [key: string]: Lesson[] }): Lesson[] {
    return Object.values(subgroups).flat();
  }

  function sectionContainsLesson(subgroups: { [key: string]: Lesson[] }, lessonId?: number): boolean {
    if (!lessonId) return false;
    return Object.values(subgroups).flat().some((l) => l.id === lessonId);
  }

  function isAllCompleted(lessons: Lesson[]): boolean {
    return lessons.length > 0 && lessons.every((l) => l.isCompleted);
  }

  function isSomeCompleted(lessons: Lesson[]): boolean {
    return lessons.some((l) => l.isCompleted) && !lessons.every((l) => l.isCompleted);
  }

  function renderLessonItem(lesson: Lesson, index: number) {
    const isActive = lesson.id === selectedLesson?.id;
    return (
      <div key={lesson.id} ref={isActive ? activeLessonRef : undefined} data-active-lesson={isActive || undefined}>
        <LessonListItem
          lesson={lesson}
          index={index}
          onSelect={() => {
            selectLesson(lesson);
            setLastViewedLesson(courseId, lesson);
          }}
          selectedLessonId={selectedLesson?.id}
          onComplete={handleCompleteLesson}
        />
      </div>
    );
  }

  function renderGroupedContent(node: GroupedNode, nodeKey: string) {
    let counter = 0;
    let foundFirstIncomplete = false;

    return (
      <div className="ml-2 border-l-2 border-neutral-200 dark:border-neutral-700 pl-1">
        {node.directLessons.map((lesson) => {
          counter++;
          return renderLessonItem(lesson, counter);
        })}
        {node.subFolders.map((sub) => {
          const SubIcon = getSubfolderIcon(sub.name);
          const subAllCompleted = isAllCompleted(sub.lessons);
          const subSomeCompleted = isSomeCompleted(sub.lessons);
          const subKey = `${nodeKey}/${sub.name}`;

          // Default: primeiro sub-folder incompleto fica expandido
          let defaultExpanded = false;
          if (!subAllCompleted && !foundFirstIncomplete) {
            defaultExpanded = true;
            foundFirstIncomplete = true;
          }

          const isExpanded = subFolderState.has(subKey)
            ? subFolderState.get(subKey)!
            : defaultExpanded;

          // Sempre contar aulas para numeração correta
          const subStartCounter = counter;
          counter += sub.lessons.length;

          return (
            <div key={sub.name}>
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-2 mt-1 border-t border-dashed cursor-pointer rounded-sm transition-colors",
                  "hover:bg-accent/50",
                )}
                onClick={() => toggleSubFolder(subKey, isExpanded)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                )}
                {subAllCompleted ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                ) : (
                  <SubIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <span className="text-xs font-medium text-muted-foreground flex-1 truncate">
                  {sub.name}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {sub.lessons.filter((l) => l.isCompleted).length}/{sub.lessons.length}
                </span>
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={subAllCompleted ? true : subSomeCompleted ? "indeterminate" : false}
                    onCheckedChange={(checked) => toggleAllLessons(sub.lessons, checked === true)}
                    title={subAllCompleted ? "Desmarcar todas" : "Marcar todas como concluídas"}
                  />
                </div>
              </div>
              {isExpanded && (
                <div className="ml-2 border-l-2 border-neutral-300/50 dark:border-neutral-600/50 pl-1">
                  {sub.lessons.map((lesson, i) =>
                    renderLessonItem(lesson, subStartCounter + i + 1)
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <Accordion
        type="multiple"
        className="w-full"
        value={openSections}
        onValueChange={setOpenSections}
      >
        {sortedSections.map(([sectionTitle, subgroups], sectionIndex) => {
            const allSectionLessons = getAllLessonsFromSection(subgroups);
            const sectionCompletion = calculateCompletionPercentage(allSectionLessons);
            const isCompleteSection = sectionCompletion === 100;
            const isActiveSection = sectionContainsLesson(subgroups, selectedLesson?.id);

            const groupedNodes = sectionGroupedNodes[sectionIndex];
            const isSingleFlat = groupedNodes.length === 1 && groupedNodes[0].subFolders.length === 0;
            const sectionAllCompleted = isAllCompleted(allSectionLessons);
            const sectionSomeCompleted = isSomeCompleted(allSectionLessons);
            const sectionValue = `section-${sectionIndex}`;

            return (
              <AccordionItem
                className={cn(
                  "p-2 transition-colors",
                  isActiveSection && "bg-purple-50/50 dark:bg-purple-900/10"
                )}
                value={sectionValue}
                key={sectionValue}
              >
                <AccordionTrigger title={sectionTitle} className="hover:no-underline py-3">
                  <div className="w-full space-y-1.5">
                    <div className="flex items-start gap-2 px-2">
                      <div className="mt-1 shrink-0">
                        {isCompleteSection ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-sm text-left font-semibold leading-snug">
                          {sectionTitle}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-2">
                      <ProgressCard value={sectionCompletion} compact />
                      <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
                        {allSectionLessons.filter((l) => l.isCompleted).length}/{allSectionLessons.length}
                      </span>
                      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={sectionAllCompleted ? true : sectionSomeCompleted ? "indeterminate" : false}
                          onCheckedChange={(checked) => toggleAllLessons(allSectionLessons, checked === true)}
                          title={sectionAllCompleted ? "Desmarcar todas do módulo" : "Marcar todas do módulo como concluídas"}
                        />
                      </div>
                      {/* Menu de contexto do módulo */}
                      <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setMenuOpen(menuOpen === sectionTitle ? null : sectionTitle)}
                          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          title="Opções do módulo"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                        {menuOpen === sectionTitle && (
                          <div
                            ref={menuRef}
                            className="absolute right-0 top-full mt-1 z-50 min-w-[200px] bg-popover border rounded-md shadow-md py-1 animate-in fade-in-0 zoom-in-95"
                          >
                            {(moduleLinks[sectionTitle] || []).map((link) => (
                              <button
                                key={link.id}
                                onClick={() => {
                                  window.open(link.url, "_blank", "noopener,noreferrer");
                                  setMenuOpen(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent transition-colors text-left"
                              >
                                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{link.label}</span>
                              </button>
                            ))}
                            {(moduleLinks[sectionTitle] || []).length > 0 && (
                              <div className="border-t my-1" />
                            )}
                            <button
                              onClick={() => handleOpenLinkDialog(sectionTitle)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent transition-colors text-left text-muted-foreground"
                            >
                              <Link2 className="h-3.5 w-3.5 shrink-0" />
                              Gerenciar links
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {isSingleFlat ? (
                    <div className="ml-3 border-l-2 border-neutral-200 dark:border-neutral-700 pl-1">
                      {groupedNodes[0].allLessons.map((lesson, i) =>
                        renderLessonItem(lesson, i + 1)
                      )}
                    </div>
                  ) : (
                    <Accordion
                      type="single"
                      collapsible
                      className="w-full ml-1 border-l-2 border-neutral-200 dark:border-neutral-700"
                      value={openGroups[sectionValue] || ""}
                      onValueChange={(val) =>
                        setOpenGroups((prev) => ({ ...prev, [sectionValue]: val }))
                      }
                    >
                      {groupedNodes.map((node, nodeIndex) => {
                        const nodeCompletion = calculateCompletionPercentage(node.allLessons);
                        const isCompleteNode = nodeCompletion === 100;
                        const isActiveNode = node.allLessons.some((l) => l.id === selectedLesson?.id);
                        const allCompleted = isAllCompleted(node.allLessons);
                        const someCompleted = isSomeCompleted(node.allLessons);
                        const nodeKey = `${sectionTitle}/${node.title}`;

                        return (
                          <AccordionItem
                            className={cn(
                              "p-1 ml-2 border-l-2 border-transparent",
                              isActiveNode
                                ? "border-purple-500 bg-purple-50/30 dark:bg-purple-900/10"
                                : "border-neutral-200 dark:border-neutral-700"
                            )}
                            value={`group-${sectionIndex}-${nodeIndex}`}
                            key={`group-${sectionIndex}-${nodeIndex}`}
                          >
                            <AccordionTrigger title={node.title} className="hover:no-underline py-3">
                              <div className="w-full space-y-1.5 px-1">
                                <div className="flex items-start gap-2">
                                  <div className="mt-1 shrink-0">
                                    {isCompleteNode ? (
                                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                    ) : (
                                      <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                  </div>
                                  <span className="block text-xs text-left flex-1 leading-snug">
                                    {node.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <ProgressCard value={nodeCompletion} compact />
                                  <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
                                    {node.allLessons.filter((l) => l.isCompleted).length}/{node.allLessons.length}
                                  </span>
                                  <div
                                    className="shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Checkbox
                                      checked={allCompleted ? true : someCompleted ? "indeterminate" : false}
                                      onCheckedChange={(checked) => {
                                        toggleAllLessons(node.allLessons, checked === true);
                                      }}
                                      title={allCompleted ? "Desmarcar todas" : "Marcar todas como concluídas"}
                                    />
                                  </div>
                                  {/* Menu de contexto do subgrupo */}
                                  <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => setMenuOpen(menuOpen === nodeKey ? null : nodeKey)}
                                      className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                      title="Opções"
                                    >
                                      <MoreVertical className="h-3 w-3" />
                                    </button>
                                    {menuOpen === nodeKey && (
                                      <div
                                        ref={menuRef}
                                        className="absolute right-0 top-full mt-1 z-50 min-w-[200px] bg-popover border rounded-md shadow-md py-1 animate-in fade-in-0 zoom-in-95"
                                      >
                                        {(moduleLinks[nodeKey] || []).map((link) => (
                                          <button
                                            key={link.id}
                                            onClick={() => {
                                              window.open(link.url, "_blank", "noopener,noreferrer");
                                              setMenuOpen(null);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent transition-colors text-left"
                                          >
                                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                            <span className="truncate">{link.label}</span>
                                          </button>
                                        ))}
                                        {(moduleLinks[nodeKey] || []).length > 0 && (
                                          <div className="border-t my-1" />
                                        )}
                                        <button
                                          onClick={() => handleOpenLinkDialog(nodeKey)}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent transition-colors text-left text-muted-foreground"
                                        >
                                          <Link2 className="h-3.5 w-3.5 shrink-0" />
                                          Gerenciar links
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              {renderGroupedContent(node, `${sectionTitle}/${node.title}`)}
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
      </Accordion>

      {/* Dialog para gerenciar links de questões */}
      <Dialog open={dialogModule !== null} onOpenChange={(open) => { if (!open) { setDialogModule(null); setEditingLink(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Links de questões</DialogTitle>
            <DialogDescription>
              {dialogModule}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {/* Lista de links existentes */}
            {(moduleLinks[dialogModule || ""] || []).map((link) => (
              <div key={link.id} className="rounded-md border overflow-hidden">
                {editingLink?.id === link.id ? (
                  <div className="p-3 space-y-2 bg-muted/30">
                    <Input
                      value={editingLink.label}
                      onChange={(e) => setEditingLink({ ...editingLink, label: e.target.value })}
                      placeholder="Nome (ex: QConcursos)"
                      className="h-8 text-xs"
                      autoFocus
                    />
                    <Input
                      value={editingLink.url}
                      onChange={(e) => setEditingLink({ ...editingLink, url: e.target.value })}
                      placeholder="https://..."
                      className="h-8 text-xs"
                      onKeyDown={(e) => { if (e.key === "Enter") handleUpdateLink(); }}
                    />
                    <div className="flex gap-1">
                      <Button size="sm" className="h-7 text-xs" onClick={handleUpdateLink} disabled={isSavingLink || !editingLink.url.trim()}>
                        Salvar
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingLink(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2.5">
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-xs font-medium truncate">{link.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{link.url}</p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => setEditingLink({ id: link.id, label: link.label, url: link.url })}
                        className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-red-600 transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Formulário para adicionar novo link */}
            <div className="border-t pt-3 space-y-3">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Plus className="h-3 w-3" />
                Novo link
              </p>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Plataforma</label>
                <Input
                  list="label-suggestions"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Ex: QConcursos, Gran Cursos, TEC..."
                  className="h-9 text-xs"
                />
                <datalist id="label-suggestions">
                  {labelSuggestions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">URL</label>
                <Input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-9 text-xs"
                  onKeyDown={(e) => { if (e.key === "Enter" && newUrl.trim()) handleAddLink(); }}
                />
              </div>
              <div className="flex justify-end">
                <Button size="sm" className="h-9 px-4" onClick={handleAddLink} disabled={isSavingLink || !newUrl.trim()}>
                  Adicionar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
