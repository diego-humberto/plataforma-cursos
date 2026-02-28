import { Lesson } from "@/models/models";

export function sortLessons(lessons: Lesson[]) {
  // Schwartzian transform: pre-compute sort keys to avoid regex per comparison
  const keyed = lessons.map((l, i) => {
    const upper = l.title.toUpperCase();
    const match = upper.match(/\d+/);
    const num = match ? parseFloat(match[0]) : NaN;
    return { idx: i, upper, num };
  });

  keyed.sort((a, b) => {
    const hasA = !isNaN(a.num);
    const hasB = !isNaN(b.num);

    if (hasA && hasB) {
      if (a.num !== b.num) return a.num - b.num;
      return a.upper.localeCompare(b.upper);
    }
    if (!hasA && !hasB) return a.upper.localeCompare(b.upper);
    return hasA ? 1 : -1;
  });

  const sorted = keyed.map((k) => lessons[k.idx]);
  for (let i = 0; i < lessons.length; i++) {
    lessons[i] = sorted[i];
  }
}
