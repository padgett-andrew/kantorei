import { useEffect, useRef, useState } from 'react';
import { Gauge, RotateCcw, RotateCw, X } from 'lucide-react';
import type { DriveMusicFile } from '../../../types/choir';
import { prettifyScoreName, streamUrl } from './utils';

export interface ActiveAudioState {
  pieceTitle: string;
  file: DriveMusicFile;
}

interface Props {
  activeAudio: ActiveAudioState | null;
  onClose: () => void;
}

const SPEED_OPTIONS = [0.75, 0.9, 1.0, 1.15];

export default function AudioPlayer({ activeAudio, onClose }: Props) {
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [activeAudio, playbackRate]);

  // Keyboard controls for singers: ArrowLeft/ArrowRight to skip 5s, Space to play/pause
  useEffect(() => {
    if (!activeAudio) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept when user is typing in an input or textarea
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        skipTime(-5);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        skipTime(5);
      } else if (e.key === ' ' || e.code === 'Space') {
        if (audioRef.current) {
          e.preventDefault();
          if (audioRef.current.paused) {
            void audioRef.current.play();
          } else {
            audioRef.current.pause();
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeAudio]);

  function skipTime(seconds: number) {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const duration = audioRef.current.duration || Infinity;
    audioRef.current.currentTime = Math.max(0, Math.min(duration, current + seconds));
  }

  if (!activeAudio) return null;

  return (
    <div className="fixed right-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-0 left-0 z-45 border-t border-navy-800 bg-navy-950 px-4 py-3 text-white shadow-2xl animate-in slide-in-from-bottom">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gold-400">
            {activeAudio.pieceTitle}
          </p>
          <p className="truncate text-sm font-semibold text-ivory-50">
            {prettifyScoreName(activeAudio.file.name)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:shrink-0">
          {/* Quick Skip Buttons (Essential for Rehearsal Looping) */}
          <div className="flex items-center gap-1 rounded-xl bg-white/10 p-1">
            <button
              type="button"
              onClick={() => skipTime(-5)}
              className="cursor-pointer inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-zinc-300 hover:bg-white/10 hover:text-white transition"
              title="Rewind 5 seconds (←)"
              aria-label="Rewind 5 seconds"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>5s</span>
            </button>
            <button
              type="button"
              onClick={() => skipTime(5)}
              className="cursor-pointer inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-zinc-300 hover:bg-white/10 hover:text-white transition"
              title="Skip forward 5 seconds (→)"
              aria-label="Skip forward 5 seconds"
            >
              <span>5s</span>
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Rehearsal Speed Buttons */}
          <div className="flex items-center gap-1 rounded-xl bg-white/10 p-1">
            <span className="px-1 text-[10px] font-bold text-gold-300 sm:inline flex items-center gap-0.5">
              <Gauge className="h-3 w-3" />
            </span>
            {SPEED_OPTIONS.map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setPlaybackRate(rate)}
                className={`cursor-pointer rounded-lg px-2 py-0.5 text-[11px] font-bold transition ${
                  playbackRate === rate
                    ? 'bg-gold-500 text-white shadow-2xs'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          <audio
            ref={audioRef}
            key={activeAudio.file.id}
            src={streamUrl(activeAudio.file, false)}
            controls
            autoPlay
            preload="metadata"
            className="h-8 w-48 sm:w-64"
          />

          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
            aria-label="Close player"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
