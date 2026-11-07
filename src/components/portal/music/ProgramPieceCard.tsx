import type { MouseEvent } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Eye,
  FileText,
  FolderOpen,
  Headphones,
  Play,
} from 'lucide-react';
import type { DriveMusicFile, Singer } from '../../../types/choir';
import type { ProgramPiece, ProgramRecording } from '../../../lib/program';
import type { ActiveAudioState } from './AudioPlayer';
import type { ActiveVideoState } from './VideoPlayer';
import {
  driveFolderUrl,
  formatFileSize,
  highlightVoicePartInHtml,
  prettifyScoreName,
  streamUrl,
} from './utils';

interface Props {
  piece: ProgramPiece;
  programTitle: string;
  singer: Singer;
  concertDriveUrl?: string;
  isNotesExpanded: boolean;
  onToggleNotes: (pieceId: string) => void;
  highlightMyPart: boolean;
  activeAudio: ActiveAudioState | null;
  activeVideo: ActiveVideoState | null;
  onPlayAudio: (pieceTitle: string, file: DriveMusicFile) => void;
  onPlayVideo: (concertTitle: string, rec: ProgramRecording) => void;
  onPreviewPdf: (pieceTitle: string, file: DriveMusicFile) => void;
  onProseClick: (concertTitle: string, e: MouseEvent<HTMLDivElement>) => void;
}

export default function ProgramPieceCard({
  piece,
  programTitle,
  singer,
  concertDriveUrl,
  isNotesExpanded,
  onToggleNotes,
  highlightMyPart,
  activeAudio,
  activeVideo,
  onPlayAudio,
  onPlayVideo,
  onPreviewPdf,
  onProseClick,
}: Props) {
  const hasNotes = Boolean(piece.notesHtml);
  const hasDistinctFolder =
    Boolean(piece.folderId) &&
    !piece.folderId?.startsWith('piece-') &&
    !piece.folderId?.startsWith('notes-') &&
    !piece.folderId?.startsWith('k:') &&
    !piece.folderId?.startsWith('n:') &&
    !concertDriveUrl?.includes(piece.folderId || '');
  const pieceDriveUrl = hasDistinctFolder ? driveFolderUrl(piece.folderId, '') : '';

  return (
    <article className="overflow-hidden rounded-sm border border-stone-200/90 bg-white transition hover:border-stone-300">
      {/* Piece Header Bar */}
      <div className="flex flex-col justify-between gap-3 border-b border-stone-200/80 bg-[#FAF7F2]/60 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
        <div className="flex min-w-0 flex-1 items-baseline gap-3.5">
          {piece.order !== null ? (
            <span className="shrink-0 font-editorial text-2xl font-medium leading-none text-copper-600 tabular-nums">
              {String(piece.order).padStart(2, '0')}
            </span>
          ) : (
            <span className="shrink-0 font-editorial text-xl text-stone-400" aria-hidden="true">
              —
            </span>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="font-editorial text-2xl font-semibold leading-snug text-navy-950">
              {piece.title}
            </h3>
            {piece.subtitle && (
              <p className="mt-0.5 font-editorial text-base italic text-stone-600">
                {piece.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Reference Recording Links + Director Notes Drawer Button */}
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {piece.recordings.map((rec) => {
            const isCurrentVideo = activeVideo?.link.url === rec.url;
            return (
              <button
                key={rec.url}
                type="button"
                onClick={() => onPlayVideo(programTitle, rec)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-sm border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition ${
                  isCurrentVideo
                    ? 'border-copper-600 bg-copper-600 text-white'
                    : 'border-stone-300/90 bg-white text-navy-950 hover:border-copper-500 hover:text-copper-600'
                }`}
                title={rec.url}
              >
                <Play className="h-3 w-3 fill-current text-copper-500" />
                <span className="max-w-[180px] truncate">
                  {rec.label || 'Reference Recording'}
                </span>
                {rec.host && rec.host.toLowerCase() !== 'youtube' && (
                  <span className="text-[9px] uppercase tracking-wider opacity-75">
                    · {rec.host}
                  </span>
                )}
              </button>
            );
          })}

          {pieceDriveUrl && (
            <a
              href={pieceDriveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-sm border border-stone-300/90 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-700 transition hover:border-navy-950 hover:text-navy-950"
              title={`Open folder for "${piece.title}" in Google Drive`}
            >
              <FolderOpen className="h-3 w-3 text-copper-600" />
              <span className="hidden sm:inline">Drive</span>
              <ExternalLink className="h-2.5 w-2.5 text-stone-400" />
            </a>
          )}

          {hasNotes && (
            <button
              type="button"
              onClick={() => onToggleNotes(piece.id)}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-sm border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition ${
                isNotesExpanded
                  ? 'border-navy-950 bg-navy-950 text-white'
                  : 'border-stone-300/90 bg-white text-stone-700 hover:border-navy-950 hover:text-navy-950'
              }`}
            >
              <BookOpen className="h-3 w-3 text-copper-500" />
              <span>Markings</span>
              {isNotesExpanded ? (
                <ChevronUp className="h-3 w-3 opacity-80" />
              ) : (
                <ChevronDown className="h-3 w-3 opacity-60" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Piece Director Notes Drawer */}
      {hasNotes && isNotesExpanded && (
        <div className="border-b border-stone-200/80 border-l-2 border-l-copper-500 bg-[#f5efe8]/70 px-5 py-4 sm:px-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-copper-600">
              Director&apos;s Markings · {piece.title}
            </span>
            <span className="text-[11px] text-stone-500">
              Part assignments, repeats &amp; measure callouts
            </span>
          </div>
          <div
            onClick={(e) => onProseClick(programTitle, e)}
            className="handbook-prose max-w-none text-xs text-stone-800"
            dangerouslySetInnerHTML={{
              __html: highlightMyPart
                ? highlightVoicePartInHtml(
                    piece.notesHtml,
                    singer.voicePart,
                    singer.sectionGroup
                  )
                : piece.notesHtml,
            }}
          />
        </div>
      )}

      {/* File Items (PDFs and Audio Tracks) */}
      {piece.files.length === 0 ? (
        <div className="flex flex-col items-start justify-between gap-3 px-5 py-4 text-xs text-stone-500 sm:flex-row sm:items-center sm:px-6">
          <p className="italic">Scores &amp; rehearsal tracks pending upload.</p>
          {pieceDriveUrl && (
            <a
              href={pieceDriveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-sm border border-stone-300 bg-[#FAF7F2] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-navy-950 hover:border-navy-950"
            >
              <FolderOpen className="h-3.5 w-3.5 text-copper-600" />
              <span>Open in Drive</span>
              <ExternalLink className="h-3 w-3 text-stone-400" />
            </a>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-stone-200/70">
          {piece.files.map((file) => {
            const isHighlighted = Boolean(file.matchesUserSection);
            const isPlaying = activeAudio?.file.id === file.id;
            const prettyTitle = prettifyScoreName(file.name);

            return (
              <li
                key={file.id}
                className={`flex flex-col justify-between gap-3 px-5 py-3.5 transition sm:flex-row sm:items-center sm:px-6 ${
                  isHighlighted ? 'bg-[#f9efe8]/45' : 'hover:bg-[#FAF7F2]/80'
                }`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  {file.isPdf ? (
                    <FileText className="mt-1 h-4 w-4 shrink-0 text-copper-600" />
                  ) : (
                    <Headphones className="mt-1 h-4 w-4 shrink-0 text-navy-900" />
                  )}

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-navy-950">
                        {prettyTitle}
                      </span>
                      {isHighlighted && (
                        <span className="rounded-sm border border-copper-300/80 bg-[#f9efe8] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-copper-600">
                          {singer.sectionGroup}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-stone-500">
                      {file.isPdf ? 'PDF Score' : 'Rehearsal Track'}
                      {file.sizeBytes ? ` · ${formatFileSize(file.sizeBytes)}` : ''}
                      <span className="hidden text-stone-400 md:inline">
                        {' '}
                        · {file.name}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                  {file.isPdf && (
                    <>
                      <button
                        type="button"
                        onClick={() => onPreviewPdf(piece.title, file)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-stone-300/90 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-700 transition hover:border-navy-950 hover:text-navy-950"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </button>
                      <a
                        href={streamUrl(file, false)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-sm bg-navy-950 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-navy-900"
                        title="Open PDF score in a new browser tab"
                      >
                        <span>Open Score</span>
                        <ExternalLink className="h-3 w-3 text-copper-300" />
                      </a>
                    </>
                  )}

                  {file.isAudio && (
                    <button
                      type="button"
                      onClick={() => onPlayAudio(piece.title, file)}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-sm px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                        isPlaying
                          ? 'bg-copper-600 text-white'
                          : 'bg-navy-950 text-white hover:bg-navy-900'
                      }`}
                    >
                      <Play className="h-3 w-3 fill-current" />
                      {isPlaying ? 'Playing' : 'Play Track'}
                    </button>
                  )}

                  <a
                    href={streamUrl(file, true)}
                    className="inline-flex items-center justify-center rounded-sm border border-stone-200/90 bg-[#FAF7F2] p-1.5 text-stone-600 transition hover:border-navy-950 hover:bg-white hover:text-navy-950"
                    title="Download file"
                    aria-label={`Download ${prettyTitle}`}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

