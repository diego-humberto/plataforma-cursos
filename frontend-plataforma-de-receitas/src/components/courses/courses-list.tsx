import { Course } from "@/models/models";
import { getAllCourses } from "@/services/getAllCourses";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import CourseItem from "./course-item";
import useApiUrl from "@/hooks/useApiUrl";
import { BookOpen } from "lucide-react";
import { CourseSkeletonGrid } from "./course-skeleton";

type Props = {
  isEditable?: boolean;
  courses: Course[] | null;
  onCoursesChanged?: () => void;
  onRescan?: (courseId: number) => void;
};

export default function CoursesList({
  isEditable = false,
  courses: providedCourses,
  onCoursesChanged,
  onRescan,
}: Props) {
  const [courses, setCourses] = useState<Course[] | null>();

  const navigate = useNavigate();
  const { apiUrl } = useApiUrl();

  function handlePlayButtonClick(courseId: number) {
    navigate(`/cursos/${courseId}`);
  }

  const loadCourses = async () => {
    try {
      const courses = await getAllCourses(apiUrl);

      if (courses) {
        setCourses(courses);
        return;
      }
      toast.error("Erro ao carregar cursos.");
    } catch (error) {
      toast.error("Erro ao carregar cursos.");
    }
  };

  useEffect(() => {
    if (providedCourses !== null && providedCourses !== undefined) {
      setCourses(providedCourses);
    }
  }, [providedCourses]);
  if (!courses) {
    return <CourseSkeletonGrid />;
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 w-full">
        {courses.length > 0 ? (
          courses.map((course) => (
            <CourseItem
              key={course.id}
              course={course}
              onPlay={() => handlePlayButtonClick(course.id)}
              isEditable={isEditable}
              onUpdate={() => { if (onCoursesChanged) { onCoursesChanged(); } else { loadCourses(); } }}
              onRescan={onRescan}
            />
          ))
        ) : (
          <div className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4 flex flex-col items-center justify-center gap-4 py-16 text-muted-foreground">
            <div className="rounded-full bg-purple-100 dark:bg-purple-500/15 p-6">
              <BookOpen className="h-12 w-12 text-purple-500 opacity-60" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-lg font-medium text-foreground">Nenhum curso encontrado</p>
              <p className="text-sm">Que tal cadastrar o primeiro?</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
