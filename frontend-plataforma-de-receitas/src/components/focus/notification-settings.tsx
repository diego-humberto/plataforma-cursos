import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import useFocusTimer from "@/hooks/useFocusTimer";

export function NotificationSettings() {
  const settings = useFocusTimer((s) => s.cycleConfig.pomodoroSettings);
  const update = useFocusTimer((s) => s.updatePomodoroSettings);

  const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Notificações</h3>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="sound-enabled"
            checked={settings.soundEnabled}
            onCheckedChange={(checked) => update({ soundEnabled: !!checked })}
          />
          <Label htmlFor="sound-enabled" className="text-sm font-normal cursor-pointer">
            Som de notificação
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="notifications-enabled"
            checked={settings.notificationsEnabled}
            onCheckedChange={async (checked) => {
              if (checked) await requestNotificationPermission();
              update({ notificationsEnabled: !!checked });
            }}
          />
          <Label htmlFor="notifications-enabled" className="text-sm font-normal cursor-pointer">
            Notificações do navegador
          </Label>
        </div>

        {"Notification" in window && Notification.permission === "denied" && settings.notificationsEnabled && (
          <p className="text-xs text-destructive">
            Notificações foram bloqueadas pelo navegador. Habilite nas configurações do site.
          </p>
        )}
      </div>
    </div>
  );
}
