import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Course } from "@/models/models";
import noImage from "../../../public/sem-foto.png";
import { Button } from "../ui/button";
import DeleteCourse from "./delete-course";
import EditCourse from "./edit-course";
import useApiUrl from "@/hooks/useApiUrl";
import ProgressCard from "../progress-card";
import { toggleFavorite } from "@/services/toggleFavorite";
import { Heart, Play, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

type Props = {
  course: Course;
  onPlay: () => void;
  isEditable?: boolean;
  onUpdate: () => void;
  onRescan?: (courseId: number) => void;
};

export default function CourseItem({
  course,
  onPlay,
  isEditable,
  onUpdate,
  onRescan,
}: Props) {
  const { apiUrl } = useApiUrl();
  const [isFav, setIsFav] = useState(course.isFavorite === 1);
  const [imgLoaded, setImgLoaded] = useState(false);

  const courseCover = course.isCoverUrl
    ? course.urlCover
    : course.fileCover
    ? `${apiUrl}/uploads/${course.fileCover}`
    : noImage;

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await toggleFavorite(apiUrl, course.id);
      setIsFav(res.isFavorite === 1);
      onUpdate();
    } catch {
      toast.error("Erro ao atualizar favorito.");
    }
  };

  return (
    <Card className="bg-white dark:bg-neutral-900 shadow-sm hover:shadow-lg transition-all duration-300 space-y-1 border border-purple-100/50 border-b-4 border-b-purple-500/50 hover:border-b-purple-500 overflow-hidden">
      <CardHeader className="p-0 cursor-pointer relative group" onClick={onPlay}>
        <div className="relative overflow-hidden">
          {!imgLoaded && (
            <div className="absolute inset-0 bg-neutral-200 dark:bg-neutral-800 animate-pulse aspect-video" />
          )}
          <img
            className="aspect-video shrink-0 w-full object-cover transition-transform duration-300 group-hover:scale-105"
            src={courseCover}
            alt={course.name}
            onLoad={() => setImgLoaded(true)}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 dark:bg-black/70 rounded-full p-3">
              <Play className="h-6 w-6 text-purple-600 dark:text-purple-400 fill-purple-600 dark:fill-purple-400" />
            </div>
          </div>
        </div>
        <button
          onClick={handleToggleFavorite}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
          title={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        >
          <Heart
            className={`h-5 w-5 transition-colors ${
              isFav
                ? "fill-red-500 text-red-500"
                : "fill-transparent text-white"
            }`}
          />
        </button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4 py-0 pt-2">
        <CardTitle className="text-foreground text-base text-left font-medium line-clamp-3">
          {course.name}
        </CardTitle>

        <ProgressCard value={course.completion_percentage ?? 0} />
      </CardContent>
      <CardFooter className="p-4 border-t">
        <div className="flex gap-4 justify-end w-full items-center">
          {isEditable ? (
            <>
              <EditCourse course={course} onUpdate={onUpdate} />
              <DeleteCourse course={course} onUpdate={onUpdate} />
            </>
          ) : null}
          {onRescan && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRescan(course.id);
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Atualizar aulas</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button size="sm" onClick={onPlay}>
            Assistir
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
