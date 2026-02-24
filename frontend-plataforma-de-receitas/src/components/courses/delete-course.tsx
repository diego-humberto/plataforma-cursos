import { Course } from "@/models/models";
import { useState } from "react";
import { Button } from "../ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import useApiUrl from "@/hooks/useApiUrl";

type Props = { course: Course; onUpdate: () => void };

export default function DeleteCourse({ course, onUpdate }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);

  const { apiUrl } = useApiUrl();

  const onDelete = async () => {
    try {
      const res = await axios.delete(`${apiUrl}/api/courses/${course.id}`);
      const data = res.data;

      if (data.notes_exported) {
        toast.success(`Excluído! ${data.notes_exported} anotações foram salvas em arquivo.`, {
          duration: 5000,
        });
      } else {
        toast.success("Excluído com sucesso!");
      }
      onUpdate();
    } catch (error: unknown) {
      let msg = "Erro ao excluir o registro.";
      if (error instanceof AxiosError) {
        msg = String(error.response?.data);
      }
      toast.error(msg, {
        duration: 2000,
      });
    } finally {
      setShowConfirm(false);
    }
  };

  return (
    <>
      <Button
        className="bg-red-700 text-cyan-50 hover:bg-red-950 hover:text-white outline-none border-none"
        variant="outline"
        onClick={() => setShowConfirm(true)}
        size="sm"
      >
        Apagar
      </Button>
      <AlertDialog
        open={showConfirm}
        // onOpenChange={() => setShowConfirm(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir este curso? As anotações serão
              salvas automaticamente em um arquivo antes da exclusão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirm(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
