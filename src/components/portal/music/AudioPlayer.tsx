import { X } from 'lucide-react';
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

export default function AudioPlayer({ activeAudio, onClose }: Props) {
  if (!activeAudio) return null;

  return (
    <div className="fixed right-0 bottom-0 left-0 z-40 border-t border-navy-800 bg-navy-950 px-4 py-3 text-white shadow-2xl">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gold-400">
            {activeAudio.pieceTitle}
          </p>
          <p className="truncate text-sm font-medium text-ivory-50">
            {prettifyScoreName(activeAudio.file.name)}
          </p>
        </div>

        <div className="flex items-center gap-3 sm:w-96">
          <audio
            key={activeAudio.file.id}
            src={streamUrl(activeAudio.file, false)}
            controls
            autoPlay
            preload="metadata"
            className="h-9 w-full"
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

