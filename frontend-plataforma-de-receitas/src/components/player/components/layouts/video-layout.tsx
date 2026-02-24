import captionStyles from './captions.module.css';
import styles from './video-layout.module.css';

import { Captions, Controls, Gesture  } from '@vidstack/react';

import * as Buttons from '../buttons';
import * as Menus from '../menus';
import * as Sliders from '../sliders';
import { TimeGroup } from '../time-group';
import { Title } from '../title';

export interface VideoLayoutProps {
  thumbnails?: string;
  title?: string;
}

export function VideoLayout({ thumbnails, title }: VideoLayoutProps) {
  return (
    <>
      <Gestures />
      <Captions
        className={`${captionStyles.captions} media-preview:opacity-0 media-controls:bottom-[85px] media-captions:opacity-100 absolute inset-0 bottom-2 z-10 select-none break-words opacity-0 transition-[opacity,bottom] duration-300`}
      />
      <Controls.Root
        className={`${styles.controls} absolute inset-0 z-10 flex h-full w-full flex-col bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity hover:opacity-100`}
        hideOnMouseLeave
        hideDelay={2000}
      >
        <div className="flex-1" />
        <Controls.Group className="flex w-full items-center px-4 bg-gradient-to-t from-black/70 to-black/40">
          <Sliders.Time thumbnails={thumbnails} />
        </Controls.Group>
        <Controls.Group className="-mt-0.5 flex w-full items-center px-4 pb-3 bg-gradient-to-t from-black/70 to-black/40">
          <Buttons.Play tooltipPlacement="top start" />
          <Buttons.SeekBackward tooltipPlacement="top" />
          <Buttons.SeekForward tooltipPlacement="top" />
          <Title title={title} />
          <div className="flex-1" />
          <TimeGroup />
          <Buttons.Mute tooltipPlacement="top" />
          <Sliders.Volume />
          <Buttons.Caption tooltipPlacement="top" />
          <Menus.Settings placement="top end" tooltipPlacement="top" />
          <Buttons.PIP tooltipPlacement="top" />
          <Buttons.Fullscreen tooltipPlacement="top end" />
        </Controls.Group>
      </Controls.Root>
    </>
  );
}

function Gestures() {
  return (
    <>
      <Gesture
        className="absolute inset-0 z-0 block h-full w-full"
        event="pointerup"
        action="toggle:paused"
      />
      <Gesture
        className="absolute inset-0 z-0 block h-full w-full"
        event="dblpointerup"
        action="toggle:fullscreen"
      />
      <Gesture
        className="absolute left-0 top-0 z-10 block h-full w-1/5"
        event="dblpointerup"
        action="seek:-10"
      />
      <Gesture
        className="absolute right-0 top-0 z-10 block h-full w-1/5"
        event="dblpointerup"
        action="seek:10"
      />
    </>
  );
}
