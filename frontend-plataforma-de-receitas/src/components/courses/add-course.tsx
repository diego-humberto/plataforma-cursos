import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Card, CardContent } from "../ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { toast } from "sonner";
import useApiUrl from "@/hooks/useApiUrl";
import useScanProgress from "@/hooks/useScanProgress";
import { FolderSync, Loader2, Plus, X } from "lucide-react";
import { Progress } from "../ui/progress";

type Props = {
  onCreate: () => void;
};

export default function AddCourse({ onCreate }: Props) {
  const [courseName, setCourseName] = useState("");
  const [imageURL, setImageURL] = useState("");
  const [coursePath, setCoursePath] = useState("");
  const [isLoadingManualInsertion, setIsLoadingManualInsertion] = useState(false);
  const [isLoadingAutoInsertion, setIsLoadingAutoInsertion] = useState(false);
  const [autoScanPath, setAutoScanPath] = useState("");
  const [isAutoDialogOpen, setIsAutoDialogOpen] = useState(false);
  const [extraPaths, setExtraPaths] = useState<string[]>([]);
  const [newExtraPath, setNewExtraPath] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);

  const { apiUrl } = useApiUrl();
  const { activeScans, startScan } = useScanProgress();

  const automaticallyAddCourses = async () => {
    if (!autoScanPath.trim()) {
      toast.error("Informe o caminho da pasta com os cursos.");
      return;
    }

    try {
      setIsLoadingAutoInsertion(true);
      setIsAutoDialogOpen(false);

      const response = await fetch(`${apiUrl}/api/courses/add-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: autoScanPath }),
      });

      if (!response.ok) {
        const err = await response.json();
        toast.error(err.error);
        return;
      }

      const result = await response.json();
      if (result.added > 0) {
        toast.success(`${result.added} curso(s) adicionado(s)!`, { duration: 3000 });
      } else {
        toast.info("Nenhum curso novo encontrado nessa pasta.", { duration: 3000 });
      }
      setAutoScanPath("");
      onCreate();
    } catch (_) {
      toast.error("Erro ao adicionar cursos automaticamente.", { duration: 2000 });
    } finally {
      setIsLoadingAutoInsertion(false);
    }
  };

  const resetForm = () => {
    setCourseName("");
    setImageURL("");
    setCoursePath("");
    setExtraPaths([]);
    setNewExtraPath("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const addExtraPath = () => {
    const trimmed = newExtraPath.trim();
    if (!trimmed) return;
    if (extraPaths.includes(trimmed)) {
      toast.error("Este caminho já foi adicionado.");
      return;
    }
    if (trimmed === coursePath) {
      toast.error("Este caminho já é o path principal.");
      return;
    }
    setExtraPaths([...extraPaths, trimmed]);
    setNewExtraPath("");
  };

  const removeExtraPath = (index: number) => {
    setExtraPaths(extraPaths.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!courseName.trim()) {
      toast.error("O nome do curso é obrigatório.");
      return;
    }
    if (!coursePath.trim()) {
      toast.error("O PATH do curso é obrigatório.");
      return;
    }

    setIsLoadingManualInsertion(true);
    const formData = new FormData();

    formData.append("name", courseName);
    formData.append("path", coursePath);
    if (extraPaths.length > 0) {
      formData.append("extra_paths", JSON.stringify(extraPaths));
    }

    if (
      fileInputRef.current &&
      fileInputRef.current.files &&
      fileInputRef.current.files[0]
    ) {
      formData.append("imageFile", fileInputRef.current.files[0]);
    } else if (imageURL) {
      formData.append("imageURL", imageURL);
    }

    try {
      const response = await fetch(`${apiUrl}/api/courses`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorMessage = await response.json();
        toast.error(errorMessage.error);
        return;
      }

      const result = await response.json();
      toast.success(`Curso adicionado: ${result.name}`, { duration: 2000 });
      setIsOpen(false);
      resetForm();
      setIsLoadingManualInsertion(false);

      // Iniciar polling de progresso via context global
      startScan(result.id);

      onCreate();
    } catch (error) {
      toast.error("Erro ao adicionar registro.", { duration: 2000 });
      setIsLoadingManualInsertion(false);
    }
  };

  const isLoading = isLoadingAutoInsertion || isLoadingManualInsertion;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {activeScans.map((scan) => (
        <div key={scan.courseId} className="flex-1 bg-neutral-100 dark:bg-neutral-800 px-4 py-3 rounded-md border border-purple-200 dark:border-purple-800">
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
      {isLoading && activeScans.length === 0 && (
        <div className="flex justify-center bg-neutral-100 dark:bg-neutral-800 px-4 py-2 rounded-md text-sm items-center">
          <Loader2 className="animate-spin h-4 mr-2" />
          <p>Processando aulas (pode demorar)...</p>
        </div>
      )}

      <Dialog open={isAutoDialogOpen} onOpenChange={setIsAutoDialogOpen}>
        <DialogTrigger asChild>
          <Button disabled={isLoading} size="sm">
            Adicionar automaticamente
          </Button>
        </DialogTrigger>
        <DialogContent className="md:max-w-[500px] max-w-80">
          <DialogHeader>
            <DialogTitle className="mb-4">Adicionar cursos automaticamente</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Informe a pasta que contém os cursos. Cada subpasta será registrada como um curso separado.
          </p>
          <div className="my-2">
            <Label htmlFor="scanPath">Caminho da pasta *</Label>
          </div>
          <Input
            type="text"
            id="scanPath"
            placeholder="C:\Users\Humberto\Cursos"
            value={autoScanPath}
            onChange={(e) => setAutoScanPath(e.target.value)}
          />
          <DialogFooter>
            <Button type="button" onClick={automaticallyAddCourses} disabled={isLoadingAutoInsertion}>
              {isLoadingAutoInsertion ? (
                <>
                  <Loader2 className="animate-spin h-4 mr-2" />
                  Escaneando...
                </>
              ) : (
                "Escanear e adicionar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
        <DialogTrigger asChild>
          <Button variant="link" disabled={isLoading} size="sm">
            Adicionar manualmente
          </Button>
        </DialogTrigger>
        <DialogContent className="md:max-w-[700px] max-w-80 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="mb-6">Cadastro</DialogTitle>
          </DialogHeader>
          <div className="my-2 flex items-center gap-4">
            <Label htmlFor="nome" className="text-right">
              Nome do curso *
            </Label>
          </div>
          <Input
            type="text"
            id="nome"
            placeholder="Ex: React do Zero ao Avançado"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
          />
          <div>
            <h3>Quer colocar alguma capa? se sim, só escolher...</h3>
            <Card className="w-full my-4">
              <CardContent>
                <div>
                  <div className="my-2">
                    <Label htmlFor="capaUrl" className="text-right">
                      URL da imagem
                    </Label>
                  </div>
                  <Input
                    type="url"
                    id="capaUrl"
                    placeholder="https://exemplo.com/imagem.jpg"
                    value={imageURL}
                    onChange={(e) => setImageURL(e.target.value)}
                  />
                </div>
                <p className="my-2">Ou</p>
                <div>
                  <div className="my-2">
                    <Label htmlFor="capaFile" className="text-right">
                      Anexo
                    </Label>
                  </div>
                  <Input type="file" id="capaFile" ref={fileInputRef} accept="image/*" />
                </div>
              </CardContent>
            </Card>
            <h3>Agora, defina o PATH.</h3>
            <div className="my-2 flex items-center gap-4">
              <Label htmlFor="path" className="text-right">
                PATH do curso *
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-red-500 cursor-pointer underline">
                      Aviso
                    </p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Por motivos de segurança, os navegadores não permitem a
                      coleta do path por input, deve ser adicionado manualmente.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              type="text"
              id="path"
              placeholder="C:\Users\Humberto\Cursos\MeuCurso"
              value={coursePath}
              onChange={(e) => setCoursePath(e.target.value)}
            />

            <div className="mt-4">
              <Label className="text-sm font-medium">
                Caminhos extras (opcional)
              </Label>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                Adicione caminhos de outras pastas/drives que fazem parte deste mesmo curso.
              </p>

              {extraPaths.length > 0 && (
                <div className="space-y-2 mb-2">
                  {extraPaths.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 rounded px-3 py-2 text-sm">
                      <span className="flex-1 truncate font-mono text-xs">{p}</span>
                      <button
                        type="button"
                        onClick={() => removeExtraPath(i)}
                        className="text-red-500 hover:text-red-700 shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="C:\Users\Humberto\OutroDrive\MeuCurso"
                  value={newExtraPath}
                  onChange={(e) => setNewExtraPath(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addExtraPath();
                    }
                  }}
                />
                <Button type="button" size="sm" variant="outline" onClick={addExtraPath} className="shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleSubmit} disabled={isLoadingManualInsertion}>
              {isLoadingManualInsertion ? (
                <>
                  <Loader2 className="animate-spin h-4 mr-2" />
                  Salvando...
                </>
              ) : (
                "Confirmar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
