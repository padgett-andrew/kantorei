import type { MouseEvent } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Headphones,
  Music2,
  Play,
} from 'lucide-react';
import type { DriveMusicFile, Singer } from '../../../types/choir';
import type { ProgramPiece, ProgramRecording } from '../../../lib/program';
import type { ActiveAudioState } from './AudioPlayer';
import type { ActiveVideoState } from './VideoPlayer';
import { formatFileSize, highlightVoicePartInHtml, prettifyScoreName, streamUrl } from './utils';

interface Props {
  piece: ProgramPiece;
  programTitle: string;
  singer: Singer;
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

  return (
    <article className="overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-2xs transition hover:border-zinc-300">
      {/* Piece Header Bar */}
      <div className="flex flex-col justify-between gap-3 border-b border-zinc-100 bg-gradient-to-r from-ivory-50/90 via-white to-ivory-50/40 p-4 sm:flex-row sm:items-center sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          {piece.order !== null ? (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-xs font-bold text-gold-300 shadow-2xs">
              {piece.order}
            </span>
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-xs font-semibold text-zinc-500">
              <Music2 className="h-4 w-4 text-zinc-400" />
            </span>
          )}

          <div className="min-w-0">
            <h3 className="font-editorial text-lg font-bold text-navy-950 sm:text-xl">
              {piece.title}
            </h3>
            {piece.subtitle && (
              <p className="mt-0.5 text-xs font-medium text-gold-600 sm:text-sm">
                {piece.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Direct Reference Recording Links + Director Notes Drawer Button */}
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {piece.recordings.map((rec) => {
            const isCurrentVideo = activeVideo?.link.url === rec.url;
            return (
              <button
                key={rec.url}
                type="button"
                onClick={() => onPlayVideo(programTitle, rec)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  isCurrentVideo
                    ? 'bg-gold-500 text-white shadow-xs'
                    : 'border border-amber-300/80 bg-gradient-to-r from-amber-50 to-ivory-50 text-navy-950 hover:border-gold-500 hover:bg-gold-50'
                }`}
                title={rec.url}
              >
                <Play className="h-3 w-3 fill-current text-gold-500" />
                <span className="max-w-[180px] truncate">
                  {rec.label || (rec.isYouTube ? 'Reference' : `${rec.host}`)}
                </span>
                <span className="rounded bg-black/10 px-1 py-0.2 text-[9px] font-bold uppercase tracking-wider text-navy-900">
                  {rec.host}
                </span>
              </button>
            );
          })}

          {hasNotes && (
            <button
              type="button"
              onClick={() => onToggleNotes(piece.id)}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                isNotesExpanded
                  ? 'bg-navy-900 text-gold-300'
                  : 'border border-zinc-200 bg-white text-zinc-700 hover:border-navy-900 hover:text-navy-950'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 text-gold-500" />
              <span>Markings</span>
              {isNotesExpanded ? (
                <ChevronUp className="h-3 w-3 text-gold-400" />
              ) : (
                <ChevronDown className="h-3 w-3 text-zinc-400" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Piece Director Notes Drawer */}
      {hasNotes && isNotesExpanded && (
        <div className="border-b border-amber-200/60 bg-amber-50/40 px-5 py-4 sm:px-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold-600">
              Director&apos;s Markings for {piece.title}
            </span>
            <span className="text-[11px] text-zinc-500">
              Part assignments, repeats & measure callouts
            </span>
          </div>
          <div
            onClick={(e) => onProseClick(programTitle, e)}
            className="handbook-prose max-w-none text-xs text-zinc-800"
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
        <div className="px-5 py-4 text-xs text-zinc-500 italic">
          Score / rehearsal tracks pending upload to Google Drive folder.
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {piece.files.map((file) => {
            const isHighlighted = Boolean(file.matchesUserSection);
            const isPlaying = activeAudio?.file.id === file.id;
            const prettyTitle = prettifyScoreName(file.name);

            return (
              <li
                key={file.id}
                className={`flex flex-col justify-between gap-3 px-5 py-3.5 transition sm:flex-row sm:items-center sm:px-6 ${
                  isHighlighted ? 'bg-amber-50/40' : 'hover:bg-ivory-50/50'
                }`}
              >
                <div className="flex min-w-0 items-start gap-3.5">
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      file.isPdf
                        ? 'border border-rose-200/80 bg-rose-50 text-rose-600'
                        : 'border border-sky-200/80 bg-sky-50 text-sky-700'
                    }`}
                  >
                    {file.isPdf ? (
                      <FileText className="h-4 w-4" />
                    ) : (
                      <Headphones className="h-4 w-4" />
                    )}
                  </span>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-900">
                        {prettyTitle}
                      </span>
                      {isHighlighted && (
                        <span className="rounded-full bg-gold-300/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy-950">
                          {singer.sectionGroup}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {file.isPdf ? 'PDF Score' : 'Audio Track'}
                      {file.sizeBytes ? ` · ${formatFileSize(file.sizeBytes)}` : ''}
                      <span className="hidden text-zinc-400 md:inline">
                        {' '}
                        · {file.name}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Tablet-Friendly Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                  {file.isPdf && (
                    <>
                      <button
                        type="button"
                        onClick={() => onPreviewPdf(piece.title, file)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-navy-900 hover:text-navy-950"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </button>
                      <a
                        href={streamUrl(file, false)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-navy-800"
                        title="Open PDF score in a new browser tab (iPad: tap Share → Copy to forScore)"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-gold-400" />
                        <span>Open PDF</span>
                        <span className="hidden sm:inline-block rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-medium text-gold-300">
                          forScore
                        </span>
                      </a>
                    </>
                  )}

                  {file.isAudio && (
                    <button
                      type="button"
                      onClick={() => onPlayAudio(piece.title, file)}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                        isPlaying
                          ? 'bg-gold-500 text-white'
                          : 'bg-navy-900 text-white hover:bg-navy-800'
                      }`}
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      {isPlaying ? 'Playing' : 'Play Track'}
                    </button>
                  )}

                  <a
                    href={streamUrl(file, true)}
                    className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
                    title="Download file"
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

