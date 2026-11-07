import type { MouseEvent } from 'react';
import { Download, ExternalLink, X } from 'lucide-react';
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-3 backdrop-blur-xs sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-sm border border-stone-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-[#FAF7F2] px-5 py-4 sm:px-7">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-copper-600">
              {modalDocFile.concertTitle} · Director&apos;s Markings
            </p>
            <h3 className="mt-0.5 truncate font-editorial text-2xl font-semibold text-navy-950">
              {prettifyScoreName(modalDocFile.file.name)}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onToggleHighlight}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-sm border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                highlightMyPart
                  ? 'border-copper-300 bg-[#f9efe8] text-copper-600'
                  : 'border-stone-300 bg-white text-stone-700 hover:border-navy-950'
              }`}
            >
              Highlight {singer.voicePart}
            </button>
            {modalDocFile.file.canExportPdf ? (
              <a
                href={streamUrl(modalDocFile.file, false)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-sm bg-navy-950 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-navy-900"
              >
                Open PDF
                <ExternalLink className="h-3 w-3 text-copper-300" />
              </a>
            ) : (
              <a
                href={streamUrl(modalDocFile.file, true)}
                className="inline-flex items-center gap-1.5 rounded-sm bg-navy-950 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-navy-900"
              >
                Download
                <Download className="h-3 w-3 text-copper-300" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close markings reader"
              className="cursor-pointer rounded-sm p-1.5 text-stone-400 transition hover:bg-[#f5efe8] hover:text-navy-950"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-7 sm:px-10">
          {docLoading[modalDocFile.file.id] ? (
            <p className="py-12 text-center text-sm text-stone-500">
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

