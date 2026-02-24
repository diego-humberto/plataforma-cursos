import { useEffect, useState } from "react";
import { FileText, Plus, Trash2, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import useApiUrl from "@/hooks/useApiUrl";
import { toast } from "sonner";

type DailyReading = { name: string; path: string };

export function DailyReadingsDrawer({ customTrigger }: { customTrigger?: React.ReactNode } = {}) {
  const { apiUrl } = useApiUrl();
  const [readings, setReadings] = useState<DailyReading[]>([]);
  const [newPath, setNewPath] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch(`${apiUrl}/api/daily-readings`)
      .then((res) => res.json())
      .then(setReadings)
      .catch(() => {});
  }, [apiUrl, open]);

  const handleAdd = async () => {
    if (!newPath.trim()) return;
    try {
      const res = await fetch(`${apiUrl}/api/daily-readings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: newPath }),
      });
      const data = await res.json();
      if (res.ok) {
        setReadings((prev) => [...prev, data]);
        setNewPath("");
        setShowInput(false);
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Erro ao adicionar PDF.");
    }
  };

  const handleOpen = async (path: string) => {
    try {
      await fetch(`${apiUrl}/api/daily-readings/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
    } catch {
      toast.error("Erro ao abrir PDF.");
    }
  };

  const handleDelete = async (path: string) => {
    try {
      await fetch(`${apiUrl}/api/daily-readings`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      setReadings((prev) => prev.filter((r) => r.path !== path));
    } catch {
      toast.error("Erro ao remover PDF.");
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {customTrigger || (
          <Button variant="link" className="relative">
            <FileText className="h-4 w-4 mr-1" />
            Leituras
            {readings.length > 0 && (
              <span className="absolute -top-0.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                {readings.length}
              </span>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-[380px] sm:max-w-[380px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-500" />
            Leituras Diárias
          </SheetTitle>
          <SheetDescription>
            PDFs para leitura diária. Clique para abrir.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-4 -mx-2 px-2 space-y-1">
          {readings.length === 0 && !showInput && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum PDF adicionado.</p>
              <p className="text-xs mt-1">Clique abaixo para adicionar.</p>
            </div>
          )}

          {readings.map((reading) => (
            <div
              key={reading.path}
              className="flex items-start gap-2 px-3 py-3 rounded-lg hover:bg-accent/50 transition-colors group cursor-pointer"
              onClick={() => handleOpen(reading.path)}
            >
              <FileText className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium break-words">
                  {reading.name}
                </p>
                <p className="text-[11px] text-muted-foreground truncate" title={reading.path}>
                  {reading.path}
                </p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(reading.path);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Add PDF */}
        <div className="pt-3 border-t mt-auto">
          {showInput ? (
            <div className="space-y-2">
              <Input
                placeholder="C:\caminho\para\arquivo.pdf"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                className="text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") {
                    setShowInput(false);
                    setNewPath("");
                  }
                }}
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={handleAdd} disabled={!newPath.trim()}>
                  Adicionar
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  onClick={() => { setShowInput(false); setNewPath(""); }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setShowInput(true)}
            >
              <Plus className="h-4 w-4" />
              Adicionar PDF
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
