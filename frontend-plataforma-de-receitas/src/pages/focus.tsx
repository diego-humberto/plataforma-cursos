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

export default function FocusPage() {
  useFocusSessionSaver();

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
