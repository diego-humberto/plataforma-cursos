import { Hierarchy, Lesson } from "@/models/models";

export function organizeLessonsInHierarchy(lessons: Lesson[]): Hierarchy {
  const hierarchy: Hierarchy = {};

  lessons.forEach((lesson) => {
    const pathParts = lesson.hierarchy_path.split("/");
    let currentLevel = hierarchy;

    pathParts.forEach((part, index) => {
      if (index === pathParts.length - 1) {
        if (!currentLevel[part]) {
          currentLevel[part] = [];
        }
        (currentLevel[part] as Lesson[]).push(lesson);
      } else {
        if (!currentLevel[part]) {
          currentLevel[part] = {};
        }
        currentLevel = currentLevel[part] as Hierarchy;
      }
    });
  });
  return hierarchy;
}

export function flattenHierarchy(hierarchy: Hierarchy): Lesson[] {
  const lessons: Lesson[] = [];

  Object.values(hierarchy).forEach((item) => {
    if (Array.isArray(item)) {
      lessons.push(...item);
    } else {
      lessons.push(...flattenHierarchy(item));
    }
  });

  return lessons;
}

export function calculateCompletionPercentage(lessons: Lesson[]): number {
  const totalLessons = lessons.length;
  if (totalLessons === 0) return 0;
  const completedLessons = lessons.filter(
    (lesson) => lesson.isCompleted === 1
  ).length;
  const percentage = (completedLessons / totalLessons) * 100;

  return percentage;
}

export function calculateCourseProgress(lessons: Lesson[]) {
  if (lessons.length === 0) return 0;
  const completed = lessons.filter((l) => l.isCompleted);
  return (completed.length / lessons.length) * 100;
}

export function getLastViewedLesson(courseId: string): { lesson: Lesson; viewedAt: number } | null {
  const lastViewed = localStorage.getItem(courseId);

  if (lastViewed) {
    try {
      const parsed = JSON.parse(lastViewed);
      // Support both old format (plain Lesson) and new format ({ lesson, viewedAt })
      if (parsed.viewedAt && parsed.lesson) {
        return parsed as { lesson: Lesson; viewedAt: number };
      }
      // Old format: treat as viewed long ago
      return { lesson: parsed as Lesson, viewedAt: 0 };
    } catch {
      return null;
    }
  }

  return null;
}

export function setLastViewedLesson(courseId: string, lesson: Lesson) {
  localStorage.setItem(courseId, JSON.stringify({ lesson, viewedAt: Date.now() }));
}
