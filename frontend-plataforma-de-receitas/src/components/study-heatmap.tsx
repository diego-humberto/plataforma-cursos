import { useEffect, useMemo, useState } from "react";
import { Flame, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getHeatmapData, getStudyStreak } from "@/services/studyDays";
import useApiUrl from "@/hooks/useApiUrl";
import { cn } from "@/lib/utils";
import type { HeatmapData } from "@/models/models";

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const DAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Retorna YYYY-MM-DD no fuso local (evita bug de toISOString que usa UTC) */
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getIntensity(hours: number): number {
  if (hours <= 0) return 0;
  if (hours < 1) return 1;
  if (hours < 2) return 2;
  if (hours < 3) return 3;
  return 4;
}

const INTENSITY_CLASSES = [
  "bg-neutral-200 dark:bg-neutral-800",                          // 0: sem estudo
  "bg-green-300 dark:bg-green-900/80",                           // 1: < 1h
  "bg-green-400 dark:bg-green-700",                              // 2: 1-2h
  "bg-green-500 dark:bg-green-500",                              // 3: 2-3h
  "bg-green-700 dark:bg-green-400",                              // 4: 3h+
];

type DayCell = {
  date: string;
  dayOfWeek: number;
  month: number;
};

function generateYearGrid(year: number): DayCell[][] {
  const weeks: DayCell[][] = [];
  let current = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  let week: DayCell[] = [];
  const startDay = current.getDay();
  for (let i = 0; i < startDay; i++) {
    week.push({ date: "", dayOfWeek: i, month: -1 });
  }

  while (current <= endDate) {
    const dow = current.getDay();
    if (dow === 0 && week.length > 0) {
      weeks.push(week);
      week = [];
    }
    week.push({
      date: toLocalDateStr(current),
      dayOfWeek: dow,
      month: current.getMonth(),
    });
    current.setDate(current.getDate() + 1);
  }
  if (week.length > 0) weeks.push(week);

  return weeks;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default function StudyHeatmap() {
  const { apiUrl } = useApiUrl();
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<HeatmapData>({});
  const [streak, setStreak] = useState(0);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const todayStr = toLocalDateStr(new Date());

  useEffect(() => {
    loadData();
  }, [apiUrl, year]);

  async function loadData() {
    try {
      const [heatmap, streakData] = await Promise.all([
        getHeatmapData(apiUrl, year),
        getStudyStreak(apiUrl),
      ]);
      setData(heatmap);
      setStreak(streakData.streak);
    } catch {
      // silencioso
    }
  }

  function handleMouseEnter(e: React.MouseEvent, dateStr: string) {
    if (!dateStr) return;
    const entry = data[dateStr];
    const hours = entry?.hours ?? 0;
    const formatted = formatDate(dateStr);
    const label = hours > 0
      ? `${formatted} - ${hours.toFixed(1)}h de estudo`
      : `${formatted} - sem estudo`;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltip({ text: label, x: rect.left + rect.width / 2, y: rect.top - 8 });
  }

  const weeks = useMemo(() => generateYearGrid(year), [year]);

  const monthLabels = useMemo(() => {
    const labels: { month: number; weekIndex: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      for (const cell of week) {
        if (cell.month >= 0 && cell.month !== lastMonth) {
          labels.push({ month: cell.month, weekIndex: wi });
          lastMonth = cell.month;
          break;
        }
      }
    });
    return labels;
  }, [weeks]);

  const totalDays = Object.keys(data).length;
  const totalHours = Object.values(data).reduce((sum, d) => sum + d.hours, 0);

  return (
    <div className="rounded-lg border bg-card p-5 w-full overflow-x-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 min-w-fit">
        <h3 className="text-sm font-semibold whitespace-nowrap">Heatmap de Estudos</h3>
        <div className="flex items-center gap-4">
          {/* Streak */}
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Flame className={cn("h-4 w-4", streak > 0 ? "text-orange-500" : "text-muted-foreground")} />
            <span className={cn("whitespace-nowrap", streak > 0 ? "text-orange-500" : "text-muted-foreground")}>
              {streak} {streak === 1 ? "dia" : "dias"}
            </span>
          </div>
          {/* Navegação ano */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYear((y) => y - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-12 text-center">{year}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYear((y) => y + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="relative min-w-fit">
        {/* Month labels */}
        <div className="flex ml-8 mb-1.5">
          {monthLabels.map(({ month, weekIndex }, i) => {
            const nextWeek = monthLabels[i + 1]?.weekIndex ?? weeks.length;
            const span = nextWeek - weekIndex;
            return (
              <div
                key={month}
                className="text-[10px] text-muted-foreground font-medium"
                style={{ width: `${span * 15}px` }}
              >
                {MONTHS_SHORT[month]}
              </div>
            );
          })}
        </div>

        <div className="flex gap-0">
          {/* Day labels */}
          <div className="flex flex-col gap-[3px] mr-1.5 pt-0">
            {DAYS_SHORT.map((d, i) => (
              <div
                key={d}
                className="h-[12px] text-[9px] text-muted-foreground leading-[12px]"
                style={{ visibility: i % 2 === 1 ? "visible" : "hidden" }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Weeks grid */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {Array.from({ length: 7 }, (_, di) => {
                const cell = week.find((c) => c.dayOfWeek === di);
                const dateStr = cell?.date ?? "";
                if (!dateStr) {
                  return <div key={di} className="w-[12px] h-[12px]" />;
                }
                const entry = data[dateStr];
                const hours = entry?.hours ?? 0;
                const intensity = getIntensity(hours);
                const isFuture = dateStr > todayStr;

                return (
                  <div
                    key={di}
                    onMouseEnter={(e) => handleMouseEnter(e, dateStr)}
                    onMouseLeave={() => setTooltip(null)}
                    className={cn(
                      "w-[12px] h-[12px] rounded-[2px]",
                      INTENSITY_CLASSES[intensity],
                      isFuture && "opacity-20",
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legenda + stats */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t min-w-fit">
        <span className="text-xs text-muted-foreground">
          {totalDays} {totalDays === 1 ? "dia" : "dias"} de estudo em {year}
          {totalHours > 0 && <> &middot; {totalHours.toFixed(1)}h no total</>}
        </span>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>Menos</span>
          {INTENSITY_CLASSES.map((cls, i) => (
            <div key={i} className={cn("w-[12px] h-[12px] rounded-[2px]", cls)} />
          ))}
          <span>Mais</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-2.5 py-1.5 text-xs font-medium bg-popover text-popover-foreground border rounded-md shadow-lg pointer-events-none whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -100%)" }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
