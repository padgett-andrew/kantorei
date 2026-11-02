import { useEffect, useMemo, useState, type MouseEvent } from 'react';
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
  Maximize2,
  Play,
  Search,
  Sparkles,
  Video,
  X,
} from 'lucide-react';
import type { DriveMusicFile, RepertoirePiece, Singer } from '../../types/choir';
import { doesFilenameMatchSection } from '../../lib/utils';
import { parseYouTubeUrl, type ReferenceRecordingLink } from '../../lib/youtube';

interface Props {
  singer: Singer;
  pieces: RepertoirePiece[];
}

interface LoadedDocPayload {
  title: string;
  html: string;
  sourceType: 'gdoc' | 'docx' | 'text' | 'legacy-doc';
  canExportPdf: boolean;
  referenceLinks: ReferenceRecordingLink[];
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function prettifyScoreName(filename: string): string {
  return filename
    .replace(/\.(pdf|mp3|m4a|wav|aac|ogg|flac|docx|doc|txt|rtf)$/i, '')
    .replace(/w_\s*/gi, 'w/ ')
    .replace(/_+/g, ' ')
    .replace(/\s+-\s+/g, ' — ')
    .trim();
}

function highlightVoicePartInHtml(
  html: string,
  voicePart: string,
  sectionGroup: string
): string {
  const partNum = voicePart.slice(1); // '1' or '2'
  const letter = voicePart.charAt(0); // 'S', 'A', 'T', 'B'
  const comboTokens =
    letter === 'S' || letter === 'A'
      ? ['SSA', 'SSAA', 'SA', `${letter}1/${letter}2`, `${letter}1-${letter}2`]
      : ['TTB', 'TTBB', 'TB', 'T/B', `${letter}1/${letter}2`, `${letter}1-${letter}2`];

  const escapedTokens = [
    voicePart,
    `${sectionGroup}s`,
    `${sectionGroup}es`,
    sectionGroup,
    `${sectionGroup} ${partNum}`,
    ...comboTokens,
  ].map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  const pattern = new RegExp(`\\b(${escapedTokens.join('|')})\\b`, 'gi');

  // Only transform text nodes outside HTML tags
  return html
    .split(/(<[^>]+>)/g)
    .map((chunk) => {
      if (chunk.startsWith('<')) return chunk;
      return chunk.replace(
        pattern,
        '<mark class="rounded bg-amber-200/85 px-1 py-0.5 font-semibold text-navy-950">$1</mark>'
      );
    })
    .join('');
}

export default function MusicLibrary({ singer, pieces }: Props) {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'my-part'>('all');
  const [selectedConcertId, setSelectedConcertId] = useState<string>('all');

  const [docCache, setDocCache] = useState<Record<string, LoadedDocPayload>>({});
  const [docLoading, setDocLoading] = useState<Record<string, boolean>>({});
  const [docError, setDocError] = useState<Record<string, string>>({});
  const [expandedDocIds, setExpandedDocIds] = useState<Record<string, boolean>>({});
  const [highlightMyPart, setHighlightMyPart] = useState(true);
  const [modalDocFile, setModalDocFile] = useState<{
    concertTitle: string;
    file: DriveMusicFile;
  } | null>(null);

  const [activeAudio, setActiveAudio] = useState<{
    pieceTitle: string;
    file: DriveMusicFile;
  } | null>(null);
  const [activeVideo, setActiveVideo] = useState<{
    concertTitle: string;
    link: ReferenceRecordingLink;
  } | null>(null);
  const [previewPdf, setPreviewPdf] = useState<{
    pieceTitle: string;
    file: DriveMusicFile;
  } | null>(null);

  const concertGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        title: string;
        scoreAndTrackCount: number;
        docFiles: DriveMusicFile[];
        pieces: RepertoirePiece[];
      }
    >();

    for (const piece of pieces) {
      const id = piece.concertId || piece.folderId;
      const title = piece.concertTitle || piece.title;
      const docsInPiece = piece.files.filter((f) => f.isDoc);
      const mediaInPiece = piece.files.filter((f) => !f.isDoc);

      let group = map.get(id);
      if (!group) {
        group = {
          id,
          title,
          scoreAndTrackCount: 0,
          docFiles: [],
          pieces: [],
        };
        map.set(id, group);
      }

      for (const d of docsInPiece) {
        if (!group.docFiles.some((existing) => existing.id === d.id)) {
          group.docFiles.push(d);
        }
      }

      if (mediaInPiece.length > 0) {
        group.scoreAndTrackCount += mediaInPiece.length;
        group.pieces.push({
          ...piece,
          files: mediaInPiece,
        });
      }
    }

    return Array.from(map.values());
  }, [pieces]);

  // Preload Director's Markings documents so YouTube reference links & inline notes are ready immediately
  const allDocFiles = useMemo(
    () => concertGroups.flatMap((cg) => cg.docFiles),
    [concertGroups]
  );

  async function ensureDocLoaded(file: DriveMusicFile) {
    if (docCache[file.id] || docLoading[file.id]) return;
    setDocLoading((prev) => ({ ...prev, [file.id]: true }));
    setDocError((prev) => ({ ...prev, [file.id]: '' }));

    try {
      const params = new URLSearchParams({ format: 'html', name: file.name });
      const res = await fetch(`/api/music/${encodeURIComponent(file.id)}?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Could not load markings (${res.status})`);
      }
      const data = (await res.json()) as LoadedDocPayload;
      setDocCache((prev) => ({ ...prev, [file.id]: data }));
    } catch (err) {
      setDocError((prev) => ({
        ...prev,
        [file.id]: err instanceof Error ? err.message : 'Unable to load document.',
      }));
    } finally {
      setDocLoading((prev) => ({ ...prev, [file.id]: false }));
    }
  }

  useEffect(() => {
    for (const docFile of allDocFiles) {
      void ensureDocLoaded(docFile);
    }
  }, [allDocFiles]);

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

        const matchingDocs = cg.docFiles.filter((doc) => {
          if (!normalizedQuery) return true;
          const loaded = docCache[doc.id];
          const plainDocText = loaded?.html.replace(/<[^>]+>/g, ' ').toLowerCase() || '';
          return (
            doc.name.toLowerCase().includes(normalizedQuery) ||
            prettifyScoreName(doc.name).toLowerCase().includes(normalizedQuery) ||
            plainDocText.includes(normalizedQuery)
          );
        });

        return {
          ...cg,
          docFiles: filterMode === 'my-part' && !normalizedQuery ? cg.docFiles : matchingDocs,
          pieces: mappedPieces,
          visibleFileCount: mappedPieces.reduce((s, p) => s + p.files.length, 0),
        };
      })
      .filter((cg) => cg.pieces.length > 0 || cg.docFiles.length > 0);
  }, [
    concertGroups,
    selectedConcertId,
    filterMode,
    normalizedQuery,
    singer.voicePart,
    singer.sectionGroup,
    docCache,
  ]);

  function streamUrl(file: DriveMusicFile, download = false): string {
    const params = new URLSearchParams({ name: file.name });
    if (download) params.set('download', '1');
    return `/api/music/${encodeURIComponent(file.id)}?${params.toString()}`;
  }

  function toggleDocExpanded(file: DriveMusicFile) {
    void ensureDocLoaded(file);
    setExpandedDocIds((prev) => ({ ...prev, [file.id]: !prev[file.id] }));
  }

  function handleProseClick(concertTitle: string, e: MouseEvent<HTMLDivElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const target = (e.target as HTMLElement | null)?.closest('a');
    if (!target) return;
    const href = target.getAttribute('href');
    if (!href) return;
    const yt = parseYouTubeUrl(href);
    if (yt.isYouTube && yt.embedUrl) {
      e.preventDefault();
      setActiveAudio(null);
      setActiveVideo({
        concertTitle,
        link: {
          url: href,
          label: target.textContent?.trim() || 'Reference Recording',
          embedUrl: yt.embedUrl,
          videoId: yt.videoId,
          isYouTube: true,
        },
      });
    }
  }

  const totalScoresAndTracks = concertGroups.reduce((s, c) => s + c.scoreAndTrackCount, 0);

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
              All Active Concerts ({totalScoresAndTracks})
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
                  {cg.scoreAndTrackCount}
                </span>
              </button>
            ))}
          </>
        ) : concertGroups[0] ? (
          <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200/90 bg-white px-4 py-2 text-xs font-semibold text-navy-950 shadow-2xs">
            <FolderOpen className="h-3.5 w-3.5 text-gold-500" />
            <span>Active Folder: {concertGroups[0].title}</span>
            <span className="rounded-full bg-ivory-100 px-2 py-0.5 text-[10px] font-bold text-navy-900">
              {concertGroups[0].scoreAndTrackCount} scores & tracks
            </span>
            {concertGroups[0].docFiles.length > 0 && (
              <span className="rounded-full bg-copper-100 px-2 py-0.5 text-[10px] font-bold text-gold-500">
                + Director Markings
              </span>
            )}
          </div>
        ) : null}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs sm:flex-row sm:items-center sm:p-4">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-zinc-400" />
          <input
            type="search"
            placeholder="Search pieces, markings, composers, or voice parts…"
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

      {/* Inline Reference YouTube Video Player (When Singer Clicks a Song Recording Link) */}
      {activeVideo && activeVideo.link.embedUrl && (
        <div className="overflow-hidden rounded-3xl border border-navy-800 bg-navy-950 text-white shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gold-500 text-white">
                <Video className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold-300">
                  Director Reference Recording · {activeVideo.concertTitle}
                </p>
                <p className="truncate text-sm font-semibold text-white">
                  {activeVideo.link.label}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={activeVideo.link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-ivory-50 transition hover:bg-white/20"
              >
                Open on YouTube
                <ExternalLink className="h-3.5 w-3.5 text-gold-300" />
              </a>
              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                className="cursor-pointer rounded-xl p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Close reference video"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="aspect-video max-h-[420px] w-full bg-black">
            <iframe
              src={activeVideo.link.embedUrl}
              title={activeVideo.link.label}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full border-0"
            />
          </div>
        </div>
      )}

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
            'No scores, markings, or rehearsal tracks match your search.'
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {filteredConcertGroups.map((cg) => {
            const singleFlatCollection =
              cg.pieces.length === 1 &&
              (cg.pieces[0].title === cg.title ||
                cg.pieces[0].title === `${cg.title} — Scores & Tracks`);

            return (
              <div key={cg.id} className="space-y-3.5">
                {/* Concert Group Header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-navy-900 text-xs font-bold text-gold-300">
                      ♫
                    </span>
                    <h2 className="font-editorial text-2xl font-bold text-navy-950 sm:text-3xl">
                      {cg.title}
                    </h2>
                  </div>
                  <span className="rounded-full bg-ivory-100 px-3 py-1 text-xs font-semibold text-navy-900">
                    {cg.visibleFileCount}{' '}
                    {cg.visibleFileCount === 1 ? 'score / track' : 'scores & tracks'}
                  </span>
                </div>

                {/* Director's Markings, Concert Order & YouTube Reference Recordings Card(s) */}
                {cg.docFiles.map((docFile) => {
                  const loaded = docCache[docFile.id];
                  const isLoading = Boolean(docLoading[docFile.id]);
                  const errorMsg = docError[docFile.id];
                  const isExpanded = Boolean(expandedDocIds[docFile.id]);
                  const refLinks = loaded?.referenceLinks ?? [];
                  const renderedHtml =
                    loaded && highlightMyPart
                      ? highlightVoicePartInHtml(
                          loaded.html,
                          singer.voicePart,
                          singer.sectionGroup
                        )
                      : loaded?.html || '';

                  return (
                    <div
                      key={docFile.id}
                      className="overflow-hidden rounded-3xl border border-gold-400/50 bg-gradient-to-br from-ivory-50 via-white to-copper-100/35 shadow-xs"
                    >
                      <div className="flex flex-col justify-between gap-3.5 p-5 sm:flex-row sm:items-center sm:px-6">
                        <div className="flex min-w-0 items-start gap-3.5">
                          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-navy-900 text-gold-300 shadow-2xs">
                            <BookOpen className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gold-500">
                                Director&apos;s Markings & Program Notes
                              </span>
                              <span className="rounded-full border border-gold-300/60 bg-white px-2 py-0.5 text-[10px] font-semibold text-navy-900">
                                {docFile.mimeType === 'application/vnd.google-apps.document'
                                  ? 'Google Doc'
                                  : 'Word / Notes Doc'}
                              </span>
                            </div>
                            <h3 className="mt-0.5 text-base font-bold text-navy-950">
                              {prettifyScoreName(docFile.name)}
                            </h3>
                            <p className="mt-0.5 text-xs text-zinc-600">
                              Concert order, part/divisi assignments, repeats, breath & style callouts
                              {refLinks.length > 0
                                ? ` · ${refLinks.length} reference ${
                                    refLinks.length === 1 ? 'recording' : 'recordings'
                                  }`
                                : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleDocExpanded(docFile)}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-navy-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-navy-800"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-3.5 w-3.5 text-gold-400" />
                                Hide Markings
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3.5 w-3.5 text-gold-400" />
                                Read Markings
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              void ensureDocLoaded(docFile);
                              setModalDocFile({ concertTitle: cg.title, file: docFile });
                            }}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-navy-900 hover:text-navy-950"
                            title="Open distraction-free full reader"
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                            Full View
                          </button>

                          {docFile.canExportPdf ? (
                            <a
                              href={streamUrl(docFile, false)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-navy-900 hover:text-navy-950"
                              title="Export Director's Markings as PDF for ForScore"
                            >
                              <ExternalLink className="h-3.5 w-3.5 text-gold-500" />
                              ForScore PDF
                            </a>
                          ) : (
                            <a
                              href={streamUrl(docFile, true)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-xs font-semibold text-zinc-700 transition hover:border-navy-900 hover:text-navy-950"
                              title="Download original markings document"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Extracted YouTube / Reference Recording Quick-Play Pills */}
                      {refLinks.length > 0 && (
                        <div className="border-t border-gold-300/40 bg-white/75 px-5 py-3 sm:px-6">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-navy-900">
                              <Video className="h-3.5 w-3.5 text-gold-500" />
                              Reference Recordings:
                            </span>
                            {refLinks.map((link) => {
                              const isCurrentVideo = activeVideo?.link.url === link.url;
                              return link.embedUrl ? (
                                <button
                                  key={link.url}
                                  type="button"
                                  onClick={() => {
                                    setActiveAudio(null);
                                    setActiveVideo(
                                      isCurrentVideo
                                        ? null
                                        : { concertTitle: cg.title, link }
                                    );
                                  }}
                                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                                    isCurrentVideo
                                      ? 'bg-gold-500 text-white shadow-2xs'
                                      : 'border border-zinc-200 bg-white text-navy-950 hover:border-gold-400 hover:bg-ivory-50'
                                  }`}
                                >
                                  <Play className="h-3 w-3 fill-current text-gold-500" />
                                  <span className="max-w-[230px] truncate">{link.label}</span>
                                </button>
                              ) : (
                                <a
                                  key={link.url}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-navy-950 transition hover:border-gold-400"
                                >
                                  <span className="max-w-[230px] truncate">{link.label}</span>
                                  <ExternalLink className="h-3 w-3 text-gold-500" />
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Expanded Inline Markings Document */}
                      {isExpanded && (
                        <div className="border-t border-zinc-200/80 bg-white px-5 py-5 sm:px-7">
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                            <p className="text-xs text-zinc-500">
                              Click any YouTube link below to open the inline reference player above your scores.
                            </p>
                            <button
                              type="button"
                              onClick={() => setHighlightMyPart((v) => !v)}
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

                          {isLoading ? (
                            <div className="py-8 text-center text-sm text-zinc-500">
                              Loading Director&apos;s Markings…
                            </div>
                          ) : errorMsg ? (
                            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
                              {errorMsg}
                            </div>
                          ) : (
                            <div
                              onClick={(e) => handleProseClick(cg.title, e)}
                              className="handbook-prose max-w-none overflow-x-auto text-sm"
                              dangerouslySetInnerHTML={{ __html: renderedHtml }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Score & Audio Track List */}
                {filterMode === 'my-part' && cg.pieces.length === 0 ? (
                  <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center text-xs text-zinc-500">
                    All scores in <strong>{cg.title}</strong> are full-choir SATB editions—
                    <button
                      type="button"
                      onClick={() => setFilterMode('all')}
                      className="ml-1 cursor-pointer font-semibold text-gold-500 underline"
                    >
                      show all scores & tracks
                    </button>
                    .
                  </div>
                ) : (
                  cg.pieces.map((piece) => (
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
                                    onClick={() => {
                                      setActiveVideo(null);
                                      setActiveAudio({ pieceTitle: cg.title, file });
                                    }}
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
                  ))
                )}
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

      {/* Full-Screen Director's Markings Modal */}
      {modalDocFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/75 p-3 sm:p-6"
          onClick={() => setModalDocFile(null)}
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
                  onClick={() => setHighlightMyPart((v) => !v)}
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
                    Open in ForScore
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
                  onClick={() => setModalDocFile(null)}
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
                    handleProseClick(modalDocFile.concertTitle, e);
                    setModalDocFile(null);
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
