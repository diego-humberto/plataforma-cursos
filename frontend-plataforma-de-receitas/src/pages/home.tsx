import CoursesList from "@/components/courses/courses-list";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Course } from "@/models/models";
import { getAllCourses } from "@/services/getAllCourses";
import useApiUrl from "@/hooks/useApiUrl";
import useScanProgress from "@/hooks/useScanProgress";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BookOpenCheck, FileText, FolderSync, Search, Timer } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import StudyHeatmap from "@/components/study-heatmap";
import { DailyReadingsDrawer } from "@/components/daily-readings-drawer";

export default function HomeScreen() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState<"name-asc" | "name-desc" | "recent" | "oldest">("name-asc");
  const [showFavorites, setShowFavorites] = useState(false);
  const { apiUrl } = useApiUrl();
  const navigate = useNavigate();
  const { activeScans, startScan, setOnScanComplete } = useScanProgress();

  const loadCourses = async () => {
    try {
      const data = await getAllCourses(apiUrl);
      if (data) {
        setCourses(data);
      } else {
        toast.error("Erro ao carregar cursos.");
      }
    } catch {
      toast.error("Erro ao carregar cursos.");
    }
  };

  useEffect(() => {
    loadCourses();
  }, [apiUrl]);

  useEffect(() => {
    setOnScanComplete(() => {
      toast.success("Aulas atualizadas!");
      loadCourses();
    });
    return () => setOnScanComplete(undefined);
  }, [apiUrl]);

  const handleRescan = async (courseId: number) => {
    try {
      const res = await fetch(`${apiUrl}/api/courses/${courseId}/rescan`, { method: "POST" });
      const data = await res.json();

      if (res.status === 409 && data.already_scanning) {
        toast.info("Escaneamento já em andamento para este curso.");
        startScan(courseId);
        return;
      }

      if (!res.ok) {
        toast.error(data.error || "Erro ao reescanear.");
        return;
      }

      toast.success("Reescaneamento iniciado!");
      startScan(courseId);
    } catch {
      toast.error("Erro ao iniciar reescaneamento.");
    }
  };

  const filteredCourses = useMemo(() => {
    if (!courses) return null;

    let result = [...courses];

    if (showFavorites) {
      result = result.filter((c) => c.isFavorite === 1);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(term));
    }

    result.sort((a, b) => {
      switch (sortMode) {
        case "name-asc":
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        case "name-desc":
          return b.name.toLowerCase().localeCompare(a.name.toLowerCase());
        case "recent":
          return b.id - a.id;
        case "oldest":
          return a.id - b.id;
        default:
          return 0;
      }
    });

    return result;
  }, [courses, searchTerm, sortMode, showFavorites]);

  return (
    <div className="py-6 w-full text-left">
      <h1>Meus cursos</h1>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg bg-card border p-3">
        <div className="relative w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Pesquisar cursos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="favorites"
            checked={showFavorites}
            onCheckedChange={(checked) => setShowFavorites(checked === true)}
          />
          <label htmlFor="favorites" className="text-sm cursor-pointer whitespace-nowrap">
            Favoritas
          </label>
        </div>

        <Select
          value={sortMode}
          onValueChange={(v) => setSortMode(v as typeof sortMode)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">A - Z</SelectItem>
            <SelectItem value="name-desc">Z - A</SelectItem>
            <SelectItem value="recent">Mais recente</SelectItem>
            <SelectItem value="oldest">Mais antigo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {activeScans.map((scan) => (
        <div key={scan.courseId} className="mt-6 bg-neutral-100 dark:bg-neutral-800 px-4 py-3 rounded-md border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-2">
            <FolderSync className="h-4 w-4 text-purple-500 animate-spin" />
            <p className="text-sm font-medium flex-1 truncate">
              Escaneando{scan.course_name ? `: ${scan.course_name}` : "..."}
            </p>
            <span className="text-sm font-bold tabular-nums">{scan.percentage}%</span>
          </div>
          <Progress value={scan.percentage} className="mb-2" />
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground tabular-nums shrink-0">
              {scan.processed.toLocaleString()} / {scan.total.toLocaleString()} arquivos
            </p>
            {scan.current_module && (
              <p className="text-xs text-purple-600 dark:text-purple-400 truncate font-mono" title={scan.current_module}>
                {scan.current_module}
              </p>
            )}
          </div>
        </div>
      ))}

      {/* Acesso rápido */}
      <div className="mt-6 flex flex-wrap gap-3">
        {/* Botão Anki */}
        <button
          onClick={async () => {
            try {
              const res = await fetch(`${apiUrl}/api/open-app`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ app: "anki" }),
              });
              const data = await res.json();
              if (!res.ok) toast.error(data.error || "Erro ao abrir Anki.");
            } catch {
              toast.error("Erro ao conectar com a API.");
            }
          }}
          className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
        >
          <BookOpenCheck className="h-5 w-5 text-blue-500 shrink-0" />
          <div className="text-left">
            <p className="text-sm font-medium">Abrir Anki</p>
            <p className="text-xs text-muted-foreground">Revisão espaçada</p>
          </div>
        </button>

        {/* Ciclo de Estudos */}
        <button
          onClick={() => navigate("/foco")}
          className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
        >
          <Timer className="h-5 w-5 text-purple-500 shrink-0" />
          <div className="text-left">
            <p className="text-sm font-medium">Ciclo de Estudos</p>
            <p className="text-xs text-muted-foreground">Timer Pomodoro</p>
          </div>
        </button>

        {/* Leituras */}
        <DailyReadingsDrawer
          customTrigger={
            <button className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
              <FileText className="h-5 w-5 text-orange-500 shrink-0" />
              <div className="text-left">
                <p className="text-sm font-medium">Leituras</p>
                <p className="text-xs text-muted-foreground">PDFs diários</p>
              </div>
            </button>
          }
        />
      </div>

      {/* Heatmap de Estudos */}
      <div className="mt-6">
        <StudyHeatmap />
      </div>

      <div className="mt-10 flex flex-wrap gap-4 w-full justify-center">
        <CoursesList
          courses={filteredCourses}
          onCoursesChanged={loadCourses}
          onRescan={handleRescan}
        />
      </div>
    </div>
  );
}
