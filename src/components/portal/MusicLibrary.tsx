import { useMemo, useState } from 'react';
import {
  Download,
  ExternalLink,
  Eye,
  FileText,
  FolderOpen,
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

function prettifyScoreName(filename: string): string {
  return filename
    .replace(/\.(pdf|mp3|m4a|wav|aac|ogg|flac)$/i, '')
    .replace(/w_\s*/gi, 'w/ ')
    .replace(/_+/g, ' ')
    .replace(/\s+-\s+/g, ' — ')
    .trim();
}

export default function MusicLibrary({ singer, pieces }: Props) {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'my-part'>('all');
  const [selectedConcertId, setSelectedConcertId] = useState<string>('all');
  const [activeAudio, setActiveAudio] = useState<{
    pieceTitle: string;
    file: DriveMusicFile;
  } | null>(null);
  const [previewPdf, setPreviewPdf] = useState<{
    pieceTitle: string;
    file: DriveMusicFile;
  } | null>(null);

  const concertGroups = useMemo(() => {
    const map = new Map<
      string,
      { id: string; title: string; fileCount: number; pieces: RepertoirePiece[] }
    >();
    for (const piece of pieces) {
      const id = piece.concertId || piece.folderId;
      const title = piece.concertTitle || piece.title;
      const existing = map.get(id);
      if (existing) {
        existing.fileCount += piece.files.length;
        existing.pieces.push(piece);
      } else {
        map.set(id, {
          id,
          title,
          fileCount: piece.files.length,
          pieces: [piece],
        });
      }
    }
    return Array.from(map.values());
  }, [pieces]);

  const normalizedQuery = search.trim().toLowerCase();

  const filteredConcertGroups = useMemo(() => {
    return concertGroups
      .filter((cg) => selectedConcertId === 'all' || cg.id === selectedConcertId)
      .map((cg) => {
        const mappedPieces = cg.pieces
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
                cg.title.toLowerCase().includes(normalizedQuery) ||
                piece.title.toLowerCase().includes(normalizedQuery) ||
                f.name.toLowerCase().includes(normalizedQuery) ||
                prettifyScoreName(f.name).toLowerCase().includes(normalizedQuery)
              );
            });

            return {
              ...piece,
              files: visibleFiles,
            };
          })
          .filter((p) => p.files.length > 0);

        return {
          ...cg,
          pieces: mappedPieces,
          visibleFileCount: mappedPieces.reduce((s, p) => s + p.files.length, 0),
        };
      })
      .filter((cg) => cg.pieces.length > 0);
  }, [concertGroups, selectedConcertId, filterMode, normalizedQuery, singer.voicePart, singer.sectionGroup]);

  function streamUrl(file: DriveMusicFile, download = false): string {
    const params = new URLSearchParams({ name: file.name });
    if (download) params.set('download', '1');
    return `/api/music/${encodeURIComponent(file.id)}?${params.toString()}`;
  }

  const totalFiles = concertGroups.reduce((s, c) => s + c.fileCount, 0);

  return (
    <div className="space-y-5 pb-24">
      {/* Concert Program Switcher (Supports Overlapping Cycles e.g. Día de los Muertos + Advent) */}
      <div className="flex flex-wrap items-center gap-2">
        {concertGroups.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => setSelectedConcertId('all')}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold transition ${
                selectedConcertId === 'all'
                  ? 'bg-navy-900 text-white shadow-xs'
                  : 'border border-zinc-200 bg-white text-zinc-700 hover:border-navy-900'
              }`}
            >
              <FolderOpen className="h-3.5 w-3.5 text-gold-400" />
              All Active Concerts ({totalFiles})
            </button>
            {concertGroups.map((cg) => (
              <button
                key={cg.id}
                type="button"
                onClick={() => setSelectedConcertId(cg.id)}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold transition ${
                  selectedConcertId === cg.id
                    ? 'bg-navy-900 text-white shadow-xs'
                    : 'border border-zinc-200 bg-white text-zinc-700 hover:border-navy-900'
                }`}
              >
                <span>{cg.title}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    selectedConcertId === cg.id
                      ? 'bg-white/15 text-gold-300'
                      : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {cg.fileCount}
                </span>
              </button>
            ))}
          </>
        ) : concertGroups[0] ? (
          <div className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200/90 bg-white px-4 py-2 text-xs font-semibold text-navy-950 shadow-2xs">
            <FolderOpen className="h-3.5 w-3.5 text-gold-500" />
            <span>Active Folder: {concertGroups[0].title}</span>
            <span className="rounded-full bg-ivory-100 px-2 py-0.5 text-[10px] font-bold text-navy-900">
              {concertGroups[0].fileCount} files
            </span>
          </div>
        ) : null}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs sm:flex-row sm:items-center sm:p-4">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-zinc-400" />
          <input
            type="search"
            placeholder="Search pieces, composers, or voice parts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 py-2 pr-4 pl-10 text-sm text-zinc-900 transition focus:border-navy-900 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-zinc-100/80 p-1">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filterMode === 'all'
                ? 'bg-white text-navy-950 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            All Scores & Tracks
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('my-part')}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filterMode === 'my-part'
                ? 'bg-white text-navy-950 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-gold-500" />
            My Section ({singer.voicePart})
          </button>
        </div>
      </div>

      {/* Grouped Concert Program Sections */}
      {filteredConcertGroups.length === 0 ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
          {filterMode === 'my-part' ? (
            <div className="space-y-2">
              <p className="font-semibold text-zinc-700">
                No files tagged specifically for {singer.voicePart} / {singer.sectionGroup}
              </p>
              <p className="text-xs text-zinc-500">
                Full SATB scores apply to all sections—switch back to{' '}
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className="cursor-pointer font-semibold text-gold-500 underline"
                >
                  All Scores & Tracks
                </button>{' '}
                to view full choir editions.
              </p>
            </div>
          ) : (
            'No scores or rehearsal tracks match your search.'
          )}
        </div>
      ) : (
        <div className="space-y-7">
          {filteredConcertGroups.map((cg) => {
            const singleFlatCollection =
              cg.pieces.length === 1 && cg.pieces[0].title === cg.title;

            return (
              <div key={cg.id} className="space-y-3.5">
                {/* Concert Group Header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-navy-900 text-xs font-bold text-gold-300">
                      ♫
                    </span>
                    <div>
                      <h2 className="font-editorial text-2xl font-bold text-navy-950 sm:text-3xl">
                        {cg.title}
                      </h2>
                    </div>
                  </div>
                  <span className="rounded-full bg-ivory-100 px-3 py-1 text-xs font-semibold text-navy-900">
                    {cg.visibleFileCount} {cg.visibleFileCount === 1 ? 'file' : 'files'}
                  </span>
                </div>

                {cg.pieces.map((piece) => (
                  <section
                    key={piece.folderId}
                    className="overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-2xs"
                  >
                    {!singleFlatCollection && (
                      <div className="border-b border-zinc-100 bg-ivory-50/80 px-5 py-3.5 sm:px-6">
                        <h3 className="font-sans text-sm font-bold text-navy-950 sm:text-base">
                          {piece.title}
                        </h3>
                      </div>
                    )}

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
                                    onClick={() =>
                                      setPreviewPdf({ pieceTitle: cg.title, file })
                                    }
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
                                  >
                                    <ExternalLink className="h-3.5 w-3.5 text-gold-400" />
                                    Open in ForScore
                                  </a>
                                </>
                              )}

                              {file.isAudio && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActiveAudio({ pieceTitle: cg.title, file })
                                  }
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
                  </section>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky Bottom Rehearsal Audio Player */}
      {activeAudio && (
        <div className="fixed right-0 bottom-0 left-0 z-40 border-t border-navy-800 bg-navy-950 px-4 py-3 text-white shadow-2xl">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gold-400">
                {activeAudio.pieceTitle}
              </p>
              <p className="truncate text-sm font-medium text-ivory-50">
                {prettifyScoreName(activeAudio.file.name)}
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
                <a
                  href={streamUrl(previewPdf.file, false)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Open Full Tab / ForScore
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewPdf(null)}
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
      )}
    </div>
  );
}
