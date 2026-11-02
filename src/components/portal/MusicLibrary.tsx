import { useState } from 'react';
import {
  Download,
  ExternalLink,
  Eye,
  FileText,
  Headphones,
  Play,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import type { DriveMusicFile, RepertoirePiece, Singer } from '../../types/choir';
import { doesFilenameMatchSection } from '../../lib/utils';

interface Props {
  singer: Singer;
  pieces: RepertoirePiece[];
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MusicLibrary({ singer, pieces }: Props) {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'my-part'>('all');
  const [activeAudio, setActiveAudio] = useState<{
    pieceTitle: string;
    file: DriveMusicFile;
  } | null>(null);
  const [previewPdf, setPreviewPdf] = useState<{
    pieceTitle: string;
    file: DriveMusicFile;
  } | null>(null);

  const normalizedQuery = search.trim().toLowerCase();

  const filteredPieces = pieces
    .map((piece) => {
      const annotatedFiles = piece.files.map((f) => ({
        ...f,
        matchesUserSection: doesFilenameMatchSection(
          f.name,
          singer.voicePart,
          singer.sectionGroup
        ),
      }));

      const visibleFiles = annotatedFiles.filter((f) => {
        if (filterMode === 'my-part' && !f.matchesUserSection) return false;
        if (!normalizedQuery) return true;
        return (
          piece.title.toLowerCase().includes(normalizedQuery) ||
          f.name.toLowerCase().includes(normalizedQuery)
        );
      });

      return {
        ...piece,
        files: visibleFiles,
      };
    })
    .filter((piece) => piece.files.length > 0);

  function streamUrl(file: DriveMusicFile, download = false): string {
    const params = new URLSearchParams({ name: file.name });
    if (download) params.set('download', '1');
    return `/api/music/${encodeURIComponent(file.id)}?${params.toString()}`;
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Filter & Search Toolbar */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-zinc-400" />
          <input
            type="search"
            placeholder="Search pieces, composers, or voice parts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-zinc-300 py-2 pr-4 pl-10 text-sm text-zinc-900 focus:border-navy-900 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`cursor-pointer rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              filterMode === 'all'
                ? 'bg-navy-900 text-white'
                : 'border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            All Scores & Tracks
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('my-part')}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              filterMode === 'my-part'
                ? 'bg-navy-900 text-white'
                : 'border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-gold-400" />
            My Section ({singer.voicePart} / {singer.sectionGroup})
          </button>
        </div>
      </div>

      {/* Repertoire Piece Cards */}
      {filteredPieces.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
          No scores or rehearsal tracks match your current filter.
        </div>
      ) : (
        <div className="space-y-5">
          {filteredPieces.map((piece) => (
            <section
              key={piece.folderId}
              className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xs"
            >
              <div className="border-b border-zinc-100 bg-ivory-50 px-6 py-4">
                <h2 className="font-editorial text-2xl font-bold text-navy-950">
                  {piece.title}
                </h2>
              </div>

              <ul className="divide-y divide-zinc-100">
                {piece.files.map((file) => {
                  const isHighlighted = Boolean(file.matchesUserSection);
                  const isPlaying = activeAudio?.file.id === file.id;

                  return (
                    <li
                      key={file.id}
                      className={`flex flex-col justify-between gap-3 px-6 py-4 transition sm:flex-row sm:items-center ${
                        isHighlighted ? 'bg-amber-50/40' : 'hover:bg-zinc-50/70'
                      }`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <span
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            file.isPdf
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-sky-50 text-sky-700 border border-sky-200'
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
                            <span className="truncate text-sm font-semibold text-zinc-900">
                              {file.name}
                            </span>
                            {isHighlighted && (
                              <span className="rounded-full bg-gold-300/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy-950">
                                {singer.sectionGroup} Match
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {file.isPdf ? 'PDF Score (ForScore Ready)' : 'Rehearsal Part Audio'}
                            {file.sizeBytes ? ` · ${formatFileSize(file.sizeBytes)}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Tablet-Friendly Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                        {file.isPdf && (
                          <>
                            <button
                              type="button"
                              onClick={() => setPreviewPdf({ pieceTitle: piece.title, file })}
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-navy-900 hover:text-navy-950"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Preview
                            </button>
                            <a
                              href={streamUrl(file, false)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-navy-800"
                            >
                              <ExternalLink className="h-3.5 w-3.5 text-gold-400" />
                              Open in ForScore
                            </a>
                          </>
                        )}

                        {file.isAudio && (
                          <button
                            type="button"
                            onClick={() => setActiveAudio({ pieceTitle: piece.title, file })}
                            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                              isPlaying
                                ? 'bg-gold-500 text-white'
                                : 'bg-navy-900 text-white hover:bg-navy-800'
                            }`}
                          >
                            <Play className="h-3.5 w-3.5 fill-current" />
                            {isPlaying ? 'Playing Now' : 'Play Track'}
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
            </section>
          ))}
        </div>
      )}

      {/* Sticky Bottom Rehearsal Audio Player (Supports HTTP 206 Seeking on iPad Safari) */}
      {activeAudio && (
        <div className="fixed right-0 bottom-0 left-0 z-40 border-t border-navy-800 bg-navy-950 px-4 py-3 text-white shadow-2xl">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gold-400">
                {activeAudio.pieceTitle}
              </p>
              <p className="truncate text-sm font-medium text-ivory-50">
                {activeAudio.file.name}
              </p>
            </div>

            <div className="flex items-center gap-3 sm:w-96">
              <audio
                key={activeAudio.file.id}
                src={streamUrl(activeAudio.file, false)}
                controls
                autoPlay
                preload="metadata"
                className="h-9 w-full"
              />
              <button
                type="button"
                onClick={() => setActiveAudio(null)}
                className="cursor-pointer rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
                aria-label="Close player"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline PDF Score Preview Modal */}
      {previewPdf && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/75 p-3 sm:p-6"
          onClick={() => setPreviewPdf(null)}
        >
          <div
            className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-zinc-500">{previewPdf.pieceTitle}</p>
                <h3 className="truncate text-sm font-bold text-navy-950">
                  {previewPdf.file.name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={streamUrl(previewPdf.file, false)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Open Full Tab / ForScore
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewPdf(null)}
                  className="cursor-pointer rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100"
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
      )}
    </div>
  );
}

