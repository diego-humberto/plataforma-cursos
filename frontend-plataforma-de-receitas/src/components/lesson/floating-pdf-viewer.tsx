import { useRef, useCallback, useEffect, useState } from "react";
import { X, GripHorizontal } from "lucide-react";

type Props = {
  src: string;
  title: string;
  onClose: () => void;
};

const MIN_WIDTH = 280;
const MIN_HEIGHT = 200;
const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 340;

export default function FloatingPdfViewer({ src, title, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const [ready, setReady] = useState(false);

  // Posicionar no canto inferior esquerdo da viewport ao montar
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.style.left = "16px";
    panel.style.top = `${window.innerHeight - DEFAULT_HEIGHT - 80}px`;
    panel.style.width = `${DEFAULT_WIDTH}px`;
    panel.style.height = `${DEFAULT_HEIGHT}px`;
    requestAnimationFrame(() => setReady(true));
  }, []);

  // --- DRAG ---
  const onDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const panel = panelRef.current;
    if (!panel) return;
    isDragging.current = true;
    const rect = panel.getBoundingClientRect();
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      left: rect.left,
      top: rect.top,
    };
    e.preventDefault();
  }, []);

  // --- RESIZE ---
  const onResizeStart = useCallback((e: React.MouseEvent) => {
    const panel = panelRef.current;
    if (!panel) return;
    isResizing.current = true;
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      w: panel.offsetWidth,
      h: panel.offsetHeight,
    };
    e.preventDefault();
    e.stopPropagation();
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const panel = panelRef.current;
      if (!panel) return;

      if (isDragging.current) {
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        let newLeft = dragStart.current.left + dx;
        let newTop = dragStart.current.top + dy;
        // Manter dentro da viewport
        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - panel.offsetWidth));
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - panel.offsetHeight));
        panel.style.left = `${newLeft}px`;
        panel.style.top = `${newTop}px`;
      }

      if (isResizing.current) {
        const dx = e.clientX - resizeStart.current.x;
        const dy = e.clientY - resizeStart.current.y;
        const newW = Math.max(MIN_WIDTH, resizeStart.current.w + dx);
        const newH = Math.max(MIN_HEIGHT, resizeStart.current.h + dy);
        panel.style.width = `${newW}px`;
        panel.style.height = `${newH}px`;
      }
    };

    const onMouseUp = () => {
      isDragging.current = false;
      isResizing.current = false;
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <div
      ref={panelRef}
      className={`fixed z-[9999] flex flex-col rounded-lg overflow-hidden shadow-2xl border border-purple-500/20 transition-opacity duration-200 ${
        ready ? "opacity-100" : "opacity-0"
      }`}
      style={{ minWidth: MIN_WIDTH, minHeight: MIN_HEIGHT }}
    >
      {/* Header - drag handle */}
      <div
        onMouseDown={onDragStart}
        className="flex items-center justify-between px-3 py-2 bg-purple-600 text-white cursor-grab active:cursor-grabbing select-none shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <GripHorizontal className="h-3.5 w-3.5 opacity-50 shrink-0" />
          <span className="text-xs font-semibold truncate">{title}</span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center h-5 w-5 rounded bg-white/20 hover:bg-white/40 transition-colors shrink-0"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* PDF iframe */}
      <div className="flex-1 bg-neutral-100 dark:bg-neutral-900">
        <iframe
          className="w-full h-full border-0"
          src={`${src}#zoom=80&view=FitH`}
        />
      </div>

      {/* Resize handle - canto inferior direito */}
      <div
        onMouseDown={onResizeStart}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-end justify-end p-0.5"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" className="text-purple-400 opacity-60">
          <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
