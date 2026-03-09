import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimerDisplay } from "@/components/focus/timer-display";
import { TimerControls } from "@/components/focus/timer-controls";
import { CycleSubjectBar } from "@/components/focus/cycle-subject-bar";
import { SubjectProgressCard } from "@/components/focus/subject-progress-card";
import { DailyProgressCard } from "@/components/focus/daily-progress-card";
import { PomodoroCounter } from "@/components/focus/pomodoro-counter";
import { SubjectList } from "@/components/focus/subject-list";
import { WeeklyHoursConfig } from "@/components/focus/weekly-hours-config";
import { AllocationPreview } from "@/components/focus/allocation-preview";
import { PomodoroSettingsForm } from "@/components/focus/pomodoro-settings-form";
import { NotificationSettings } from "@/components/focus/notification-settings";
import { SessionHistory } from "@/components/focus/session-history";
import { StopwatchTab } from "@/components/focus/stopwatch-tab";
import { useFocusSessionSaver } from "@/hooks/useFocusSessionSaver";
import useFocusTimer from "@/hooks/useFocusTimer";

export default function FocusPage() {
  useFocusSessionSaver();

  // Keyboard shortcuts (only when no input is focused)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement).isContentEditable) return;

      const { timer, startTimer, pauseTimer, resumeTimer, resetTimer, skipTimer } =
        useFocusTimer.getState();

      switch (e.code) {
        case "Space":
          e.preventDefault();
          if (timer.status === "idle") startTimer();
          else if (timer.status === "running") pauseTimer();
          else if (timer.status === "paused") resumeTimer();
          break;
        case "KeyR":
          if (!e.ctrlKey && !e.metaKey) {
            if (timer.status !== "idle") {
              e.preventDefault();
              resetTimer();
            }
          }
          break;
        case "KeyS":
          if (!e.ctrlKey && !e.metaKey) {
            if (timer.status !== "idle") {
              e.preventDefault();
              skipTimer();
            }
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Ciclo de Estudos</h1>

      <Tabs defaultValue="timer" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="timer">Timer</TabsTrigger>
          <TabsTrigger value="cronometro">Cronômetro</TabsTrigger>
          <TabsTrigger value="ciclo">Ciclo</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="timer" className="space-y-6">
          <CycleSubjectBar />
          <div className="flex flex-col items-center gap-6">
            <TimerDisplay />
            <TimerControls />
            <PomodoroCounter />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SubjectProgressCard />
            <DailyProgressCard />
          </div>
        </TabsContent>

        <TabsContent value="cronometro" className="space-y-6">
          <StopwatchTab />
        </TabsContent>

        <TabsContent value="ciclo" className="space-y-6">
          <SubjectList />
          <WeeklyHoursConfig />
          <AllocationPreview />
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
          <PomodoroSettingsForm />
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="historico">
          <SessionHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
