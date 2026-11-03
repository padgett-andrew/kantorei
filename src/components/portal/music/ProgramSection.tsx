import type { MouseEvent } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FolderOpen,
  Maximize2,
  Play,
  Sparkles,
  Video,
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
    <div className="space-y-4">
      {/* Concert Program Header */}
      <div className="flex flex-col justify-between gap-2 border-b border-zinc-200/70 pb-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-navy-900 text-sm font-bold text-gold-300 shadow-2xs">
            ♫
          </span>
          <div>
            <h2 className="font-editorial text-2xl font-bold text-navy-950 sm:text-3xl">
              {prog.title}
            </h2>
            {prog.orderDocTitle && (
              <p className="text-xs text-zinc-500">
                Running concert order from{' '}
                <strong className="text-zinc-700">{prog.orderDocTitle}</strong>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {concertDriveUrl && (
            <a
              href={concertDriveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-navy-950 shadow-2xs transition hover:border-navy-900 hover:bg-zinc-50"
              title={`Open ${prog.title} folder in Google Drive`}
            >
              <FolderOpen className="h-3.5 w-3.5 text-amber-600" />
              <span>Drive Folder</span>
              <ExternalLink className="h-3 w-3 text-zinc-400" />
            </a>
          )}
          <span className="rounded-full bg-ivory-100 px-3 py-1 text-xs font-semibold text-navy-900">
            {prog.visibleFileCount}{' '}
            {prog.visibleFileCount === 1 ? 'score / track' : 'scores & tracks'}
          </span>
        </div>
      </div>

      {/* Director's Markings Doc(s) Header Card */}
      {prog.docs.map((doc) => {
        const isExpanded = Boolean(expandedDocIds[doc.file.id]);
        const renderedHtml = highlightMyPart
          ? highlightVoicePartInHtml(doc.html, singer.voicePart, singer.sectionGroup)
          : doc.html;

        return (
          <div
            key={doc.file.id}
            className="overflow-hidden rounded-3xl border border-gold-400/40 bg-gradient-to-br from-ivory-50 via-white to-amber-50/20 shadow-xs"
          >
            <div className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-gold-300 shadow-2xs">
                  <BookOpen className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-gold-600">
                      Director&apos;s Markings & Concert Order
                    </span>
                    <span className="rounded-full border border-gold-300/60 bg-white px-2 py-0.5 text-[9px] font-semibold text-navy-900">
                      {doc.file.mimeType === 'application/vnd.google-apps.document'
                        ? 'Google Doc'
                        : 'Word / Docx'}
                    </span>
                  </div>
                  <h3 className="truncate text-sm font-bold text-navy-950 sm:text-base">
                    {prettifyScoreName(doc.file.name)}
                  </h3>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                <button
                  type="button"
                  onClick={() => onToggleDocExpanded(doc.file)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-navy-800"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5 text-gold-400" />
                      Hide Document
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5 text-gold-400" />
                      Inline Markings
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onOpenModalDoc(prog.title, doc.file)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-navy-900 hover:text-navy-950"
                  title="Open distraction-free full document reader"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  Full Reader
                </button>

                {doc.canExportPdf ? (
                  <a
                    href={streamUrl(doc.file, false)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-navy-900 hover:text-navy-950"
                    title="Open Director's Markings as PDF in a new tab"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-gold-500" />
                    Export PDF
                  </a>
                ) : (
                  <a
                    href={streamUrl(doc.file, true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-navy-900 hover:text-navy-950"
                    title="Download original document"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Inline Document Prose */}
            {isExpanded && (
              <div className="border-t border-zinc-200/80 bg-white px-5 py-5 sm:px-7">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                  <p className="text-xs text-zinc-500">
                    Reference links and part callouts parsed from document. Tap any YouTube
                    link to play.
                  </p>
                  <button
                    type="button"
                    onClick={onToggleHighlight}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                      highlightMyPart
                        ? 'bg-amber-100 text-amber-950 ring-1 ring-amber-300'
                        : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    <Sparkles className="h-3 w-3 text-gold-500" />
                    Highlight {singer.voicePart} / {singer.sectionGroup} Callouts
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

      {/* General Reference Recordings (Unassigned to any single piece) */}
      {prog.unassignedRecordings && prog.unassignedRecordings.length > 0 && (
        <div className="rounded-2xl border border-zinc-200/80 bg-ivory-50/70 p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-navy-900">
              <Video className="h-3.5 w-3.5 text-gold-500" />
              General Reference Recordings:
            </span>
            {prog.unassignedRecordings.map((link) => {
              const isCurrentVideo = activeVideo?.link.url === link.url;
              return link.embedUrl ? (
                <button
                  key={link.url}
                  type="button"
                  onClick={() => onPlayVideo(prog.title, link)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                    isCurrentVideo
                      ? 'bg-gold-500 text-white shadow-2xs'
                      : 'border border-zinc-200 bg-white text-navy-950 hover:border-gold-400 hover:bg-ivory-50'
                  }`}
                >
                  <Play className="h-3 w-3 fill-current text-gold-500" />
                  <span className="max-w-[220px] truncate">{link.label || 'Reference Video'}</span>
                </button>
              ) : (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-navy-950 transition hover:border-gold-400"
                >
                  <span className="max-w-[220px] truncate">{link.label || link.host}</span>
                  <ExternalLink className="h-3 w-3 text-gold-500" />
                </a>
              );
            })}
          </div>
        </div>
      )}

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
    </div>
  );
}
