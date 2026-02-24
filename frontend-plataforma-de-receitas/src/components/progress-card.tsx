import { Progress } from "./ui/progress";

type Props = {
  value?: number;
  hideValue?: boolean;
  compact?: boolean;
};

export default function ProgressCard({ value = 0, hideValue = false, compact = false }: Props) {
  const rounded = Math.round(value);

  if (compact) {
    return (
      <div className="flex items-center gap-2 w-full">
        <Progress value={Number(value)} className="flex-1 h-1.5" />
        {!hideValue && (
          <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
            {rounded}%
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1 text-xs">
      <Progress value={Number(value)} />
      {!hideValue && (
        <span className="text-[10px] text-muted-foreground">{rounded}% concluído</span>
      )}
    </div>
  );
}
