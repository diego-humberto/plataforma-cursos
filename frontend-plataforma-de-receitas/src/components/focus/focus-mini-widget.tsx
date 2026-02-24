import { useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect, useCallback } from "react";
import { useFocusTimerDisplay } from "@/hooks/useFocusTimerDisplay";
import useFocusTimer from "@/hooks/useFocusTimer";
import { MODE_LABELS } from "./constants";
import { Play, Pause, GripVertical } from "lucide-react";

const STORAGE_KEY = "focus-widget-position";

function loadPosition(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function savePosition(pos: { x: number; y: number }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function FocusMiniWidget() {
  const location = useLocation();
  const navigate = useNavigate();
  const { display, mode, status } = useFocusTimerDisplay();
  const pauseTimer = useFocusTimer((s) => s.pauseTimer);
  const resumeTimer = useFocusTimer((s) => s.resumeTimer);
  const currentSubject = useFocusTimer((s) => s.getCurrentSubject());

  const widgetRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    return loadPosition() || { x: window.innerWidth - 220, y: window.innerHeight - 100 };
  });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    hasMoved.current = false;
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    e.preventDefault();
  }, [position]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      hasMoved.current = true;
      const el = widgetRef.current;
      const w = el?.offsetWidth || 200;
      const h = el?.offsetHeight || 60;
      const newX = clamp(e.clientX - dragOffset.current.x, 0, window.innerWidth - w);
      const newY = clamp(e.clientY - dragOffset.current.y, 0, window.innerHeight - h);
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        setPosition((pos) => {
          savePosition(pos);
          return pos;
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Adjust on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const el = widgetRef.current;
        const w = el?.offsetWidth || 200;
        const h = el?.offsetHeight || 60;
        const newPos = {
          x: clamp(prev.x, 0, window.innerWidth - w),
          y: clamp(prev.y, 0, window.innerHeight - h),
        };
        savePosition(newPos);
        return newPos;
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (location.pathname === "/foco" || status === "idle") return null;

  return (
    <div
      ref={widgetRef}
      className="fixed z-50 flex items-center gap-1 pl-0.5 pr-2 py-1 rounded-full shadow-lg border border-purple-200 dark:border-purple-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm hover:shadow-xl transition-shadow select-none"
      style={{ left: position.x, top: position.y }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={handleMouseDown}
        className="cursor-grab active:cursor-grabbing p-0.5 rounded-full hover:bg-muted/50 text-muted-foreground"
        title="Arraste para reposicionar"
      >
        <GripVertical className="h-3 w-3" />
      </div>

      <div
        className="flex items-center gap-1.5 cursor-pointer"
        onClick={() => {
          if (!hasMoved.current) navigate("/foco");
        }}
      >
        <span className="text-xs font-mono font-semibold tabular-nums text-purple-700 dark:text-purple-300">
          {display}
        </span>

        {currentSubject && mode === "focus" && (
          <span className="text-[9px] text-zinc-500 dark:text-zinc-400 max-w-[80px] truncate">
            {currentSubject.name}
          </span>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            status === "running" ? pauseTimer() : resumeTimer();
          }}
          className="p-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors"
        >
          {status === "running" ? (
            <Pause className="h-2.5 w-2.5" />
          ) : (
            <Play className="h-2.5 w-2.5" />
          )}
        </button>
      </div>
    </div>
  );
}
