import type { MouseEvent } from 'react';
import { Download, ExternalLink, Sparkles, X } from 'lucide-react';
import type { DriveMusicFile, Singer } from '../../../types/choir';
import type { LoadedConcertDoc } from '../../../lib/program';
import { highlightVoicePartInHtml, prettifyScoreName, streamUrl } from './utils';

export interface ModalDocFileState {
  concertTitle: string;
  file: DriveMusicFile;
}

interface Props {
  modalDocFile: ModalDocFileState | null;
  singer: Singer;
  docCache: Record<string, LoadedConcertDoc>;
  docLoading: Record<string, boolean>;
  docError: Record<string, string>;
  highlightMyPart: boolean;
  onToggleHighlight: () => void;
  onProseClick: (concertTitle: string, e: MouseEvent<HTMLDivElement>) => void;
  onClose: () => void;
}

export default function DocMarkingsModal({
  modalDocFile,
  singer,
  docCache,
  docLoading,
  docError,
  highlightMyPart,
  onToggleHighlight,
  onProseClick,
  onClose,
}: Props) {
  if (!modalDocFile) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/75 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-ivory-50 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gold-500">
              {modalDocFile.concertTitle} · Director&apos;s Markings
            </p>
            <h3 className="truncate text-base font-bold text-navy-950">
              {prettifyScoreName(modalDocFile.file.name)}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onToggleHighlight}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                highlightMyPart
                  ? 'bg-amber-100 text-amber-950 ring-1 ring-amber-300'
                  : 'border border-zinc-200 bg-white text-zinc-700'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-gold-500" />
              Highlight {singer.voicePart}
            </button>
            {modalDocFile.file.canExportPdf ? (
              <a
                href={streamUrl(modalDocFile.file, false)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Open PDF
                <ExternalLink className="h-3.5 w-3.5 text-gold-300" />
              </a>
            ) : (
              <a
                href={streamUrl(modalDocFile.file, true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Download Doc
                <Download className="h-3.5 w-3.5 text-gold-300" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl p-1.5 text-zinc-500 hover:bg-zinc-200/70"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          {docLoading[modalDocFile.file.id] ? (
            <p className="py-12 text-center text-sm text-zinc-500">
              Loading Director&apos;s Markings…
            </p>
          ) : docCache[modalDocFile.file.id] ? (
            <div
              onClick={(e) => {
                onProseClick(modalDocFile.concertTitle, e);
                onClose();
              }}
              className="handbook-prose max-w-none text-sm"
              dangerouslySetInnerHTML={{
                __html: highlightMyPart
                  ? highlightVoicePartInHtml(
                      docCache[modalDocFile.file.id].html,
                      singer.voicePart,
                      singer.sectionGroup
                    )
                  : docCache[modalDocFile.file.id].html,
              }}
            />
          ) : (
            <p className="py-12 text-center text-sm text-rose-700">
              {docError[modalDocFile.file.id] || 'Unable to load document.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

