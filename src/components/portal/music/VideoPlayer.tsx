import type { RefObject } from 'react';
import { ExternalLink, X } from 'lucide-react';
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
      className="overflow-hidden rounded-sm border border-navy-900 bg-[#0B131E] text-white shadow-xl transition-all"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/12 px-5 py-3.5 sm:px-6">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-copper-300">
            Reference Recording · {activeVideo.concertTitle}
          </p>
          <p className="mt-0.5 truncate font-editorial text-xl font-medium text-white">
            {activeVideo.link.label || 'Reference Recording'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={activeVideo.link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-sm border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ivory-50 transition hover:bg-white/15"
          >
            YouTube
            <ExternalLink className="h-3 w-3 text-copper-300" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-sm p-1.5 text-stone-400 transition hover:bg-white/10 hover:text-white"
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

