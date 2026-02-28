import { ChapterTitle } from '@vidstack/react';

export interface TitleProps {
  title?: string;
}

export function Title({ title }: TitleProps) {
  return (
    <span className="inline-block overflow-hidden text-ellipsis whitespace-nowrap px-2 text-xs font-medium text-white/70">
      {title || <ChapterTitle />}
    </span>
  );
}
