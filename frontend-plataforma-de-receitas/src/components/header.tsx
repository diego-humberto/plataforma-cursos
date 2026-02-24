import { GraduationCap, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "./mode-theme-toggle";
import { useNavigate } from "react-router-dom";
import APIUrl from "./api-url";
import useFocusTimer from "@/hooks/useFocusTimer";
import { DailyReadingsDrawer } from "./daily-readings-drawer";

function Header() {
  let navigate = useNavigate();
  const timerStatus = useFocusTimer((s) => s.timer.status);

  function handleNavigate(path: string) {
    navigate(path);
  }

  return (
    <div className="relative min-h-20 p-6 shadow-md bg-card dark:shadow-black/30">
      <div className="flex justify-between items-center">
        <div
          onClick={() => handleNavigate("/")}
          className="inline-flex flex-wrap gap-3 cursor-pointer font-medium text-xl"
        >
          <GraduationCap className="w-8 h-8" /> Cursos
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <APIUrl />
          <Button onClick={() => handleNavigate("/cursos")} variant="link">
            Gestão de Cursos
          </Button>

          <Button onClick={() => handleNavigate("/foco")} variant="link" className="relative">
            <Timer className="h-4 w-4 mr-1" />
            Foco
            {timerStatus !== "idle" && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            )}
          </Button>

          <DailyReadingsDrawer />

          <Button
            onClick={() => handleNavigate("/configuracoes")}
            variant="link"
          >
            Configurações
          </Button>
          <ModeToggle />
        </div>
      </div>
    </div>
  );
}

export default Header;
