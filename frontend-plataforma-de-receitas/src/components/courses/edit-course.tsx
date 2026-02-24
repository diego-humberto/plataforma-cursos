import { Course } from "@/models/models";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { useRef, useState } from "react";

import { toast } from "sonner";
import useApiUrl from "@/hooks/useApiUrl";
import { Loader2, Plus, X } from "lucide-react";

type Props = {
  course: Course;
  onUpdate: () => void;
};

export default function EditCourse({ course, onUpdate }: Props) {
  const fileInputRefEdit = useRef<HTMLInputElement>(null);

  const [currentCourse, setCurrentCourse] = useState<Course>(course);
  const [extraPaths, setExtraPaths] = useState<string[]>(course.extra_paths || []);
  const [newExtraPath, setNewExtraPath] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [isOpen, setIsOpen] = useState(false);

  const { apiUrl } = useApiUrl();

  const handleEdit = async () => {
    if (!currentCourse.name.trim()) {
      toast.error("O nome do curso é obrigatório.");
      return;
    }
    if (!currentCourse.path.trim()) {
      toast.error("O PATH do curso é obrigatório.");
      return;
    }

    setIsLoading(true);
    const formData = new FormData();

    formData.append("name", currentCourse.name);
    formData.append("path", currentCourse.path);
    const filteredExtras = extraPaths.filter(p => p.trim());
    if (filteredExtras.length > 0) {
      formData.append("extra_paths", JSON.stringify(filteredExtras));
    }

    if (
      fileInputRefEdit.current &&
      fileInputRefEdit.current.files &&
      fileInputRefEdit.current.files[0]
    ) {
      formData.append("imageFile", fileInputRefEdit.current.files[0]);
    } else if (currentCourse.urlCover) {
      formData.append("imageURL", currentCourse.urlCover);
    }

    try {
      const response = await fetch(`${apiUrl}/api/courses/${course.id}`, {
        method: "PUT",
        body: formData,
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        toast.error(errorMessage);
        return;
      }

      toast.success("Curso atualizado com sucesso!", {
        duration: 2000,
      });

      setIsOpen(false);
    } catch (error) {
      toast.error("Erro ao atualizar o curso.", {
        duration: 2000,
      });
    } finally {
      setIsLoading(false);
      onUpdate();
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setCurrentCourse(
      (prev) =>
        ({
          ...prev,
          [name]: value,
        } as Course)
    );
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setCurrentCourse(course);
      setExtraPaths(course.extra_paths || []);
      setNewExtraPath("");
    }
  };

  const addExtraPath = () => {
    const trimmed = newExtraPath.trim();
    if (!trimmed) return;
    if (extraPaths.includes(trimmed)) {
      toast.error("Este caminho já foi adicionado.");
      return;
    }
    if (trimmed === currentCourse.path) {
      toast.error("Este caminho já é o path principal.");
      return;
    }
    setExtraPaths([...extraPaths, trimmed]);
    setNewExtraPath("");
  };

  const removeExtraPath = (index: number) => {
    setExtraPaths(extraPaths.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-white text-black outline-none border-none"
          variant="outline"
        >
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="md:max-w-[700px] max-w-80 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="mb-6">
            Editando - {course?.name || ""}
          </DialogTitle>
        </DialogHeader>
        <div className="my-2 flex items-center gap-4">
          <Label htmlFor="nome" className="text-right">
            Nome do curso *
          </Label>
        </div>
        <Input
          type="text"
          id="name"
          name="name"
          placeholder="Ex: React do Zero ao Avançado"
          value={currentCourse?.name || ""}
          onChange={handleInputChange}
        />
        <div>
          <h3>Quer colocar alguma capa? se sim, só escolher...</h3>
          <Card className="w-full my-4">
            <CardContent>
              <div>
                <div className="my-2">
                  <Label htmlFor="capaUrlEdit" className="text-right">
                    URL da imagem
                  </Label>
                </div>
                <Input
                  type="url"
                  id="capaUrlEdit"
                  name="urlCover"
                  placeholder="https://exemplo.com/imagem.jpg"
                  value={currentCourse?.urlCover || ""}
                  onChange={handleInputChange}
                />
              </div>
              <p className="my-2">Ou</p>
              <div>
                <div className="my-2">
                  <Label htmlFor="capaFileEdit" className="text-right">
                    Anexo
                  </Label>
                </div>
                <Input type="file" id="capaFileEdit" ref={fileInputRefEdit} accept="image/*" />
              </div>
            </CardContent>
          </Card>
          <h3>Agora, atualize o diretório do curso.</h3>
          <div className="my-2 flex items-center gap-4">
            <Label htmlFor="path" className="text-right">
              PATH do curso *
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-red-500 cursor-pointer underline">Aviso</p>
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
            name="path"
            placeholder="C:\Users\Humberto\Cursos\MeuCurso"
            value={currentCourse.path || ""}
            onChange={handleInputChange}
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
          <Button type="button" onClick={handleEdit} disabled={isLoading}>
            {isLoading ? (
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
  );
}
