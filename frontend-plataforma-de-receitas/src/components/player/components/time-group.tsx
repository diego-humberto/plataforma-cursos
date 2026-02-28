import { Time } from '@vidstack/react';

export function TimeGroup() {
  return (
    <div className="ml-1 flex items-center text-xs tabular-nums font-medium text-white/90">
      <Time className="time" type="current" />
      <div className="mx-0.5 text-white/50">/</div>
      <Time className="time" type="duration" />
    </div>
  );
}
