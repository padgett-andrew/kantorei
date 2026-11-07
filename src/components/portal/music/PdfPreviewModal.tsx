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
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-3 backdrop-blur-xs sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-sm border border-stone-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 bg-[#FAF7F2] px-5 py-3.5 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-copper-600">
              {previewPdf.pieceTitle}
            </p>
            <h3 className="mt-0.5 truncate font-editorial text-xl font-semibold text-navy-950">
              {prettifyScoreName(previewPdf.file.name)}
            </h3>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="hidden text-xs text-stone-500 sm:inline">
              iPad: Share &rarr; Open in score reader
            </span>
            <a
              href={streamUrl(previewPdf.file, false)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-sm bg-navy-950 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-navy-900"
            >
              Open in New Tab
              <ExternalLink className="h-3 w-3 text-copper-300" />
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close score preview"
              className="cursor-pointer rounded-sm p-1.5 text-stone-400 transition hover:bg-[#f5efe8] hover:text-navy-950"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <iframe
          title={previewPdf.file.name}
          src={streamUrl(previewPdf.file, false)}
          className="h-full w-full flex-1 bg-stone-100"
        />
      </div>
    </div>
  );
}

