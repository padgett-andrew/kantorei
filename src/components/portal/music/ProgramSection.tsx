import type { MouseEvent } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FolderOpen,
  Maximize2,
} from 'lucide-react';
import type { DriveMusicFile, Singer } from '../../../types/choir';
import type { ConcertProgram, ProgramRecording } from '../../../lib/program';
import type { ActiveAudioState } from './AudioPlayer';
import type { ActiveVideoState } from './VideoPlayer';
import ProgramPieceCard from './ProgramPieceCard';
import {
  driveFolderUrl,
  highlightVoicePartInHtml,
  prettifyScoreName,
  streamUrl,
} from './utils';

export type FilteredProgram = ConcertProgram & { visibleFileCount: number };

interface Props {
  prog: FilteredProgram;
  singer: Singer;
  repertoireDriveUrl?: string;
  expandedDocIds: Record<string, boolean>;
  onToggleDocExpanded: (file: DriveMusicFile) => void;
  onOpenModalDoc: (concertTitle: string, file: DriveMusicFile) => void;
  highlightMyPart: boolean;
  onToggleHighlight: () => void;
  expandedPieceNotes: Record<string, boolean>;
  onTogglePieceNotes: (pieceId: string) => void;
  activeAudio: ActiveAudioState | null;
  activeVideo: ActiveVideoState | null;
  onPlayAudio: (pieceTitle: string, file: DriveMusicFile) => void;
  onPlayVideo: (concertTitle: string, rec: ProgramRecording) => void;
  onPreviewPdf: (pieceTitle: string, file: DriveMusicFile) => void;
  onProseClick: (concertTitle: string, e: MouseEvent<HTMLDivElement>) => void;
}

export default function ProgramSection({
  prog,
  singer,
  repertoireDriveUrl,
  expandedDocIds,
  onToggleDocExpanded,
  onOpenModalDoc,
  highlightMyPart,
  onToggleHighlight,
  expandedPieceNotes,
  onTogglePieceNotes,
  activeAudio,
  activeVideo,
  onPlayAudio,
  onPlayVideo,
  onPreviewPdf,
  onProseClick,
}: Props) {
  const concertDriveUrl = driveFolderUrl(prog.id, repertoireDriveUrl);

  return (
    <section className="space-y-5">
      {/* Concert Program Header */}
      <div className="flex flex-col justify-between gap-3 border-b border-navy-950/15 pb-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-copper-600">
            Concert Program
          </p>
          <h2 className="mt-1 font-editorial text-3xl font-normal tracking-tight text-navy-950 sm:text-4xl">
            {prog.title}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {concertDriveUrl && (
            <a
              href={concertDriveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-sm border border-stone-300/90 bg-white/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-navy-950 transition hover:border-navy-950 hover:bg-white"
              title={`Open ${prog.title} folder in Google Drive`}
            >
              <FolderOpen className="h-3.5 w-3.5 text-copper-600" />
              <span>Drive Folder</span>
              <ExternalLink className="h-3 w-3 text-stone-400" />
            </a>
          )}
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-stone-500 tabular-nums">
            {prog.visibleFileCount}{' '}
            {prog.visibleFileCount === 1 ? 'Item' : 'Items'}
          </span>
        </div>
      </div>

      {/* Director's Markings Frontispiece Sheet */}
      {prog.docs.map((doc) => {
        const isExpanded = Boolean(expandedDocIds[doc.file.id]);
        const renderedHtml = highlightMyPart
          ? highlightVoicePartInHtml(doc.html, singer.voicePart, singer.sectionGroup)
          : doc.html;

        return (
          <div
            key={doc.file.id}
            className="overflow-hidden rounded-sm border border-stone-300/90 border-l-2 border-l-copper-500 bg-[#f5efe8]/75"
          >
            <div className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-copper-600">
                    Director&apos;s Markings &amp; Program Order
                  </span>
                  <span className="text-stone-300" aria-hidden="true">·</span>
                  <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-stone-500">
                    {doc.file.mimeType === 'application/vnd.google-apps.document'
                      ? 'Live Doc'
                      : 'Document'}
                  </span>
                </div>
                <h3 className="mt-0.5 truncate font-editorial text-xl font-semibold text-navy-950">
                  {prettifyScoreName(doc.file.name)}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                <button
                  type="button"
                  onClick={() => onToggleDocExpanded(doc.file)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm bg-navy-950 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-navy-900"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5 text-copper-300" />
                      Hide Markings
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5 text-copper-300" />
                      Read Markings
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onOpenModalDoc(prog.title, doc.file)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-stone-300/90 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-700 transition hover:border-navy-950 hover:text-navy-950"
                  title="Open distraction-free full document reader"
                >
                  <Maximize2 className="h-3 w-3" />
                  Full Reader
                </button>

                {doc.canExportPdf ? (
                  <a
                    href={streamUrl(doc.file, false)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-sm border border-stone-300/90 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-700 transition hover:border-navy-950 hover:text-navy-950"
                    title="Open Director's Markings as PDF in a new tab"
                  >
                    <ExternalLink className="h-3 w-3 text-copper-600" />
                    PDF
                  </a>
                ) : (
                  <a
                    href={streamUrl(doc.file, true)}
                    className="inline-flex items-center gap-1.5 rounded-sm border border-stone-300/90 bg-white px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-700 transition hover:border-navy-950 hover:text-navy-950"
                    title="Download original document"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Inline Document Prose */}
            {isExpanded && (
              <div className="border-t border-stone-200/90 bg-white px-5 py-6 sm:px-8">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/80 pb-3">
                  <p className="text-xs text-stone-500">
                    Tap any linked reference recording below to open the inline player.
                  </p>
                  <button
                    type="button"
                    onClick={onToggleHighlight}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-sm border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                      highlightMyPart
                        ? 'border-copper-300 bg-[#f9efe8] text-copper-600'
                        : 'border-stone-200 bg-[#FAF7F2] text-stone-600 hover:text-navy-950'
                    }`}
                  >
                    Highlight {singer.voicePart} / {singer.sectionGroup}
                  </button>
                </div>

                <div
                  onClick={(e) => onProseClick(prog.title, e)}
                  className="handbook-prose max-w-none overflow-x-auto text-sm"
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Ordered Pieces List */}
      <div className="space-y-4">
        {prog.pieces.map((piece) => (
          <ProgramPieceCard
            key={piece.id}
            piece={piece}
            programTitle={prog.title}
            singer={singer}
            concertDriveUrl={concertDriveUrl}
            isNotesExpanded={Boolean(expandedPieceNotes[piece.id])}
            onToggleNotes={onTogglePieceNotes}
            highlightMyPart={highlightMyPart}
            activeAudio={activeAudio}
            activeVideo={activeVideo}
            onPlayAudio={onPlayAudio}
            onPlayVideo={onPlayVideo}
            onPreviewPdf={onPreviewPdf}
            onProseClick={onProseClick}
          />
        ))}
      </div>
    </section>
  );
}
