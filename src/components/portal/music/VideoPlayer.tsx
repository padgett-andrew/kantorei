import type { RefObject } from 'react';
import { ExternalLink, Video, X } from 'lucide-react';
import type { ReferenceRecordingLink } from '../../../lib/youtube';

export interface ActiveVideoState {
  concertTitle: string;
  link: ReferenceRecordingLink;
}

interface Props {
  activeVideo: ActiveVideoState | null;
  videoPlayerRef?: RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

export default function VideoPlayer({ activeVideo, videoPlayerRef, onClose }: Props) {
  if (!activeVideo || !activeVideo.link.embedUrl) return null;

  return (
    <div
      ref={videoPlayerRef}
      className="overflow-hidden rounded-3xl border border-navy-800 bg-navy-950 text-white shadow-xl transition-all"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gold-500 text-white">
            <Video className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold-300">
              Director Reference Recording · {activeVideo.concertTitle}
            </p>
            <p className="truncate text-sm font-semibold text-white">
              {activeVideo.link.label || 'Reference Recording'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={activeVideo.link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-ivory-50 transition hover:bg-white/20"
          >
            Open on YouTube
            <ExternalLink className="h-3.5 w-3.5 text-gold-300" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Close reference video"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="aspect-video max-h-[420px] w-full bg-black">
        <iframe
          src={activeVideo.link.embedUrl}
          title={activeVideo.link.label || 'Reference Recording'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </div>
    </div>
  );
}

