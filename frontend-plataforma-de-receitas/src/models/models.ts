export type Course = {
  id: number;
  fileCover?: string;
  isCoverUrl: number;
  name: string;
  path: string;
  extra_paths?: string[];
  urlCover?: string;
  isFavorite?: number;
  completion_percentage?: number;
};

export type Lesson = {
  id: number;
  module: string;
  progressStatus: string;
  hierarchy_path: string;
  course_title: string;
  isCompleted: number;
  title: string;
  video_url: string;
  time_elapsed?: number;
  duration: string;
  pdf_url: string;
  subtitle_urls?: string[];
};

export type Module = Record<string, any>;

export type Modules = { [k: string]: Lesson[] };

export type NestedModules = { [section: string]: { [subgroup: string]: Lesson[] } };

export type Hierarchy = {
  [key: string]: Hierarchy | Lesson[];
};

export type Note = {
  id: number;
  lesson_id: number;
  timestamp: number;
  content: string;
  created_at: string;
};

// Focus Timer types

export type TimerMode = "focus" | "shortBreak" | "longBreak";
export type TimerStatus = "idle" | "running" | "paused";

export type CycleSubject = {
  id: string;
  name: string;
  emphasis: number;
  color: string;
};

export type TimerType = "pomodoro" | "continuous";

export type PomodoroSettings = {
  timerType: TimerType;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
};

export type DailyHoursConfig = {
  dom: number;
  seg: number;
  ter: number;
  qua: number;
  qui: number;
  sex: number;
  sab: number;
};

export type CycleConfig = {
  subjects: CycleSubject[];
  dailyHours: DailyHoursConfig;
  pomodoroSettings: PomodoroSettings;
};

export type SubjectProgress = {
  subjectId: string;
  allocatedMinutes: number;
  completedMs: number;
  pomodorosCompleted: number;
};

export type TimerState = {
  status: TimerStatus;
  mode: TimerMode;
  startedAt: number | null;
  accumulatedMs: number;
  durationMs: number;
  pomodoroCount: number;
};

export type CycleState = {
  currentSubjectIndex: number;
  subjectProgress: SubjectProgress[];
  cycleDate: string;
  completedCycles: number;
};

export type FocusSession = {
  id?: number;
  subject_name: string;
  subject_id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  mode: TimerMode;
  completed: boolean;
  date: string;
};

// Study Heatmap types

export type HeatmapData = Record<string, { hours: number }>;
