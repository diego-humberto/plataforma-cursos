import { useState, useRef, useEffect } from "react";
import { Clock, Loader2, Check, X } from "lucide-react";
import { Button } from "../ui/button";
import TiptapEditor from "../ui/tiptap-editor";
import { createNote } from "@/services/notes";
import useApiUrl from "@/hooks/useApiUrl";
import { toast } from "sonner";

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

type Props = {
  lessonId: number | null;
  playerTimeRef: React.RefObject<number>;
  onSaved?: () => void;
  onClose?: () => void;
  autoFocus?: boolean;
};

export default function QuickNote({ lessonId, playerTimeRef, onSaved, onClose, autoFocus = false }: Props) {
  const { apiUrl } = useApiUrl();
  const [content, setContent] = useState("");
  const [capturedTime, setCapturedTime] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFocus = () => {
    if (capturedTime === null) {
      setCapturedTime(playerTimeRef.current ?? 0);
    }
  };

  const handleSave = async () => {
    if (!lessonId || !content.trim() || isSaving) return;

    setIsSaving(true);
    try {
      await createNote(apiUrl, lessonId, {
        timestamp: capturedTime ?? 0,
        content: content.trim(),
      });
      setContent("");
      setCapturedTime(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      onSaved?.();
    } catch {
      toast.error("Erro ao salvar anotação.");
    } finally {
      setIsSaving(false);
    }
  };

  // Esc to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Click outside: cancelar se anotação vazia
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        !content.trim() &&
        capturedTime !== null &&
        onClose
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [content, capturedTime, onClose]);

  if (!lessonId) return null;

  return (
    <div ref={containerRef} className="space-y-2">
      {/* Timestamp */}
      {capturedTime !== null && (
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-purple-500" />
          <span className="text-xs text-purple-600 dark:text-purple-400 font-mono bg-purple-100 dark:bg-purple-500/15 px-2 py-0.5 rounded-full">
            {formatTimestamp(capturedTime)}
          </span>
        </div>
      )}

      {/* Success feedback */}
      {showSuccess && (
        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
          <Check className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Anotação salva!</span>
        </div>
      )}

      {/* Editor */}
      <TiptapEditor
        content={content}
        onChange={setContent}
        onFocus={handleFocus}
        onSubmit={handleSave}
        placeholder="Anotação rápida... (Ctrl+Enter para salvar)"
        autoFocus={autoFocus}
      />

      {/* Actions */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          Ctrl+Enter para salvar
        </span>
        <div className="flex gap-2">
          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose} className="h-7 text-xs">
              <X className="h-3 w-3 mr-1" />
              Fechar
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!content.trim() || isSaving}
            className="h-7 text-xs"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
