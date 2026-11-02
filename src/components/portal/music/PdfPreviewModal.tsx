import { ExternalLink, X } from 'lucide-react';
import type { DriveMusicFile } from '../../../types/choir';
import { prettifyScoreName, streamUrl } from './utils';

export interface PreviewPdfState {
  pieceTitle: string;
  file: DriveMusicFile;
}

interface Props {
  previewPdf: PreviewPdfState | null;
  onClose: () => void;
}

export default function PdfPreviewModal({ previewPdf, onClose }: Props) {
  if (!previewPdf) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/75 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3.5">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-500">{previewPdf.pieceTitle}</p>
            <h3 className="truncate text-sm font-bold text-navy-950">
              {prettifyScoreName(previewPdf.file.name)}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-[11px] text-zinc-400 sm:inline">
              iPad: tap Share (⎋) in Safari &rarr; Copy to forScore
            </span>
            <a
              href={streamUrl(previewPdf.file, false)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Open in New Tab
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl p-1.5 text-zinc-500 hover:bg-zinc-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <iframe
          title={previewPdf.file.name}
          src={streamUrl(previewPdf.file, false)}
          className="h-full w-full flex-1 bg-zinc-100"
        />
      </div>
    </div>
  );
}

