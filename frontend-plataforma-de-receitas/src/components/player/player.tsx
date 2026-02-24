import "@vidstack/react/player/styles/base.css";

import { useEffect, useRef, useState } from "react";

import {
  isHLSProvider,
  MediaPlayer,
  MediaProvider,
  Poster,
  Track,
  type MediaPlayerInstance,
  type MediaProviderAdapter,
} from "@vidstack/react";

import { VideoLayout } from "./components/layouts/video-layout";
import { completeLesson } from "@/services/videoPlayer";
import useApiUrl from "@/hooks/useApiUrl";

interface SubtitleTrack {
  src: string;
  label: string;
  language: string;
  default: boolean;
}

interface PlayerProps {
  src: string;
  title: string;
  lessonId: number;
  onTimeUpdate?: (currentTime: number) => void;
  onPlay?: () => void;
  onComplete?: () => void;
  onLessonCompleted?: () => void;
  timeElapsed: number;
  playerTimeRef?: React.RefObject<number>;
  onPlayerReady?: (player: MediaPlayerInstance) => void;
  isTheaterMode?: boolean;
  subtitles?: SubtitleTrack[];
  onPipChange?: (isPip: boolean) => void;
}

export function Player({
  src,
  title,
  lessonId,
  onTimeUpdate,
  onPlay,
  onComplete,
  onLessonCompleted,
  timeElapsed,
  playerTimeRef,
  onPlayerReady,
  isTheaterMode = false,
  subtitles = [],
  onPipChange,
}: PlayerProps) {
  const [lastElapsedTimeSaved, setLastElapsedTimeSaved] = useState(timeElapsed);
  const [isEndingTriggered, setIsEndingTriggered] = useState(false);

  let player = useRef<MediaPlayerInstance>(null);

  const { apiUrl } = useApiUrl();

  // Restaura a velocidade salva sempre que o src muda (troca de vídeo)
  // Usa eventos nativos do <video> que disparam de forma confiável em src changes
  useEffect(() => {
    const savedRate = parseFloat(localStorage.getItem("playbackRate") || "1");
    if (savedRate === 1) return;

    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const applyRate = () => {
      if (cancelled) return;
      const video = document.querySelector('video');
      if (video) video.playbackRate = savedRate;
      if (player.current) player.current.playbackRate = savedRate;
    };

    // Escuta canplay nativo (dispara a cada novo src carregado)
    // Debounce para aplicar após o último canplay (vidstack dispara múltiplos)
    const video = document.querySelector('video');
    const handleCanPlay = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(applyRate, 200);
    };

    if (video) {
      video.addEventListener('canplay', handleCanPlay);
    }

    // Fallback caso eventos não disparem
    const fallback = setTimeout(applyRate, 1000);

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      if (video) video.removeEventListener('canplay', handleCanPlay);
      clearTimeout(fallback);
    };
  }, [src]);

  const handlePlay = () => {
    if (onPlay) {
      onPlay();
    }
  };

  // Ref para acessar tempo salvo em callbacks de cleanup/beforeunload
  const lastSavedRef = useRef(lastElapsedTimeSaved);
  lastSavedRef.current = lastElapsedTimeSaved;

  useEffect(() => {
    if (player.current) {
      return player.current.subscribe(({ currentTime }) => {
        if (playerTimeRef) {
          (playerTimeRef as React.MutableRefObject<number>).current = currentTime;
        }
        const currentSecondsElapsed = Math.floor(currentTime);
        const lastedSavedSeconds = Math.floor(lastElapsedTimeSaved);
        if (
          onTimeUpdate &&
          currentSecondsElapsed % 5 == 0 &&
          currentTime > 5 &&
          currentSecondsElapsed != lastedSavedSeconds
        ) {
          onTimeUpdate(Math.floor(currentTime));
          setLastElapsedTimeSaved(Math.floor(currentTime));
        }
      });
    }
  }, [lastElapsedTimeSaved]);

  // Salvar tempo ao fechar aba/browser e ao trocar de aula
  useEffect(() => {
    const saveCurrentTime = () => {
      const currentTime = playerTimeRef
        ? (playerTimeRef as React.MutableRefObject<number>).current
        : 0;
      if (currentTime > 5 && Math.floor(currentTime) !== Math.floor(lastSavedRef.current)) {
        const payload = JSON.stringify({ time_elapsed: Math.floor(currentTime), lessonId });
        navigator.sendBeacon(
          `${apiUrl}/api/update-lesson-progress`,
          new Blob([payload], { type: "application/json" })
        );
      }
    };
    window.addEventListener("beforeunload", saveCurrentTime);
    return () => {
      window.removeEventListener("beforeunload", saveCurrentTime);
      // Também salva ao trocar de aula (cleanup do effect)
      saveCurrentTime();
    };
  }, [lessonId, apiUrl]);

  useEffect(() => {
    if (player.current) {
      return player.current.subscribe(({ currentTime, duration }) => {
        let timeSub = duration - currentTime;
        if (timeSub <= 10 && !isEndingTriggered && currentTime > 10) {
          setIsEndingTriggered(true);
          completeLesson(apiUrl, lessonId).then(() => onLessonCompleted?.());
        } else if (timeSub > 10) {
          setIsEndingTriggered(false);
        }
      });
    }
  }, [isEndingTriggered, lessonId, apiUrl]);

  // Detectar PiP
  const onPipChangeRef = useRef(onPipChange);
  onPipChangeRef.current = onPipChange;
  useEffect(() => {
    if (!player.current) return;
    return player.current.subscribe(({ pictureInPicture }) => {
      onPipChangeRef.current?.(pictureInPicture);
    });
  }, []);

  function onProviderChange(
    provider: MediaProviderAdapter | null
    // nativeEvent: MediaProviderChangeEvent,
  ) {
    // We can configure provider's here.
    if (isHLSProvider(provider)) {
      provider.config = {};
    }
  }

  function onCanPlay() {
    if (player.current) {
      onPlayerReady?.(player.current);
    }
  }

  return (
    <>
      <MediaPlayer
        className={`w-full aspect-video text-white font-sans overflow-hidden ring-media-focus data-[focus]:ring-4 ${
          isTheaterMode ? 'max-h-[80vh] bg-black' : 'rounded-md bg-slate-900'
        }`}
        title={title}
        src={src}
        crossorigin
        playsinline
        onProviderChange={onProviderChange}
        onCanPlay={onCanPlay}
        onEnded={() => onComplete?.()}
        ref={player}
        onPlay={handlePlay}
        currentTime={timeElapsed}
        autoPlay
      >
        <MediaProvider>
          {subtitles.map((sub, i) => (
            <Track
              key={`${sub.language}-${i}`}
              src={sub.src}
              kind="subtitles"
              label={sub.label}
              language={sub.language}
              default={sub.default}
            />
          ))}
          <Poster
            className="absolute inset-0 block h-full w-full rounded-md opacity-0 transition-opacity data-[visible]:opacity-100 object-cover"
            src=""
            alt=""
          />
        </MediaProvider>

        <VideoLayout thumbnails="" title={title} />
      </MediaPlayer>
    </>
  );
}
