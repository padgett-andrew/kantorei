import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
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
  Music2,
  Play,
  Search,
  Sparkles,
  Video,
  X,
} from 'lucide-react';
import type { DriveMusicFile, RepertoirePiece, Singer } from '../../types/choir';
import { doesFilenameMatchSection } from '../../lib/utils';
import { parseYouTubeUrl, type ReferenceRecordingLink } from '../../lib/youtube';
import {
  buildConcertPrograms,
  type LoadedConcertDoc,
  type ProgramPiece,
} from '../../lib/program';

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
    .replace(/\.(pdf|mp3|m4a|wav|aac|ogg|flac|docx?|doc|txt|rtf)$/i, '')
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
  const [expandedPieceNotes, setExpandedPieceNotes] = useState<Record<string, boolean>>({});
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

  const videoPlayerRef = useRef<HTMLDivElement | null>(null);

  // Collect all director's markings docs across all repertoire items
  const allDocFiles = useMemo(() => {
    const docs: DriveMusicFile[] = [];
    for (const piece of pieces) {
      for (const f of piece.files) {
        if (f.isDoc && !docs.some((d) => d.id === f.id)) {
          docs.push(f);
        }
      }
    }
    return docs;
  }, [pieces]);

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

  // Preload Director's Markings documents so YouTube recordings & concert order are ready immediately
  useEffect(() => {
    for (const docFile of allDocFiles) {
      void ensureDocLoaded(docFile);
    }
  }, [allDocFiles]);

  // Smooth-scroll to active video when singer clicks a reference recording
  useEffect(() => {
    if (activeVideo && videoPlayerRef.current) {
      videoPlayerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeVideo]);

  // Convert docCache to map for buildConcertPrograms
  const loadedDocsMap = useMemo(() => {
    const map = new Map<string, LoadedConcertDoc>();
    for (const [id, d] of Object.entries(docCache)) {
      map.set(id, { title: d.title, html: d.html, canExportPdf: d.canExportPdf });
    }
    return map;
  }, [docCache]);

  // Parse concert programs into concert order with attached YouTube links & piece notes
  const rawPrograms = useMemo(() => {
    return buildConcertPrograms(pieces, loadedDocsMap);
  }, [pieces, loadedDocsMap]);

  const totalScoresAndTracks = useMemo(() => {
    return rawPrograms.reduce(
      (sum, prog) => sum + prog.pieces.reduce((s, p) => s + p.files.length, 0),
      0
    );
  }, [rawPrograms]);

  const normalizedQuery = search.trim().toLowerCase();

  const filteredPrograms = useMemo(() => {
    return rawPrograms
      .filter((prog) => selectedConcertId === 'all' || prog.id === selectedConcertId)
      .map((prog) => {
        const matchingPieces: ProgramPiece[] = [];
        for (const piece of prog.pieces) {
          const annotatedFiles: DriveMusicFile[] = piece.files.map((f) => ({
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
              prog.title.toLowerCase().includes(normalizedQuery) ||
              piece.title.toLowerCase().includes(normalizedQuery) ||
              piece.subtitle.toLowerCase().includes(normalizedQuery) ||
              piece.notesHtml.toLowerCase().includes(normalizedQuery) ||
              f.name.toLowerCase().includes(normalizedQuery) ||
              prettifyScoreName(f.name).toLowerCase().includes(normalizedQuery)
            );
          });

          const matchesTextQuery =
            !normalizedQuery ||
            prog.title.toLowerCase().includes(normalizedQuery) ||
            piece.title.toLowerCase().includes(normalizedQuery) ||
            piece.subtitle.toLowerCase().includes(normalizedQuery) ||
            piece.notesHtml.toLowerCase().includes(normalizedQuery) ||
            piece.recordings.some((r) => r.label.toLowerCase().includes(normalizedQuery));

          if (filterMode === 'my-part' && visibleFiles.length === 0) {
            continue;
          }

          if (normalizedQuery && visibleFiles.length === 0 && !matchesTextQuery) {
            continue;
          }

          const filesToUse =
            visibleFiles.length > 0 ? visibleFiles : normalizedQuery ? annotatedFiles : [];
          if (filesToUse.length > 0 || piece.recordings.length > 0) {
            matchingPieces.push({
              ...piece,
              files: filesToUse,
            });
          }
        }

        const totalVisibleFiles = matchingPieces.reduce((s, p) => s + p.files.length, 0);

        return {
          ...prog,
          pieces: matchingPieces,
          visibleFileCount: totalVisibleFiles,
        };
      })
      .filter((prog) => prog.pieces.length > 0 || prog.docs.length > 0);
  }, [
    rawPrograms,
    selectedConcertId,
    filterMode,
    normalizedQuery,
    singer.voicePart,
    singer.sectionGroup,
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

  function togglePieceNotes(pieceId: string) {
    setExpandedPieceNotes((prev) => ({ ...prev, [pieceId]: !prev[pieceId] }));
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

  return (
    <div className="space-y-6 pb-24">
      {/* Concert Program Switcher (Supports Overlapping Cycles e.g. Día de los Muertos + Advent) */}
      <div className="flex flex-wrap items-center gap-2">
        {rawPrograms.length > 1 ? (
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
            {rawPrograms.map((prog) => {
              const fileCount = prog.pieces.reduce((s, p) => s + p.files.length, 0);
              return (
                <button
                  key={prog.id}
                  type="button"
                  onClick={() => setSelectedConcertId(prog.id)}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold transition ${
                    selectedConcertId === prog.id
                      ? 'bg-navy-900 text-white shadow-xs'
                      : 'border border-zinc-200 bg-white text-zinc-700 hover:border-navy-900'
                  }`}
                >
                  <span>{prog.title}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      selectedConcertId === prog.id
                        ? 'bg-white/15 text-gold-300'
                        : 'bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    {fileCount}
                  </span>
                </button>
              );
            })}
          </>
        ) : rawPrograms[0] ? (
          <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200/90 bg-white px-4 py-2 text-xs font-semibold text-navy-950 shadow-2xs">
            <FolderOpen className="h-3.5 w-3.5 text-gold-500" />
            <span>Active Program: {rawPrograms[0].title}</span>
            <span className="rounded-full bg-ivory-100 px-2 py-0.5 text-[10px] font-bold text-navy-900">
              {totalScoresAndTracks} scores & tracks
            </span>
            {rawPrograms[0].docs.length > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
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
            placeholder="Search concert programs, pieces, composers, or voice parts…"
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

      {/* Inline Reference YouTube Video Player (Triggered from Any Song's Reference Button) */}
      {activeVideo && activeVideo.link.embedUrl && (
        <div
          ref={videoPlayerRef}
          className="overflow-hidden rounded-3xl border border-navy-800 bg-navy-950 text-white shadow-xl transition-all"
        >
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
                  {activeVideo.link.label || 'Reference Recording'}
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
              title={activeVideo.link.label || 'Reference Recording'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full border-0"
            />
          </div>
        </div>
      )}

      {/* Grouped Concert Program Sections (Ordered by Director Doc) */}
      {filteredPrograms.length === 0 ? (
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
        <div className="space-y-10">
          {filteredPrograms.map((prog) => (
            <div key={prog.id} className="space-y-4">
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

                <div className="flex items-center gap-2">
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
                          onClick={() => toggleDocExpanded(doc.file)}
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
                          onClick={() =>
                            setModalDocFile({ concertTitle: prog.title, file: doc.file })
                          }
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

                        <div
                          onClick={(e) => handleProseClick(prog.title, e)}
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
                          onClick={() => {
                            setActiveAudio(null);
                            setActiveVideo(isCurrentVideo ? null : { concertTitle: prog.title, link });
                          }}
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
                {prog.pieces.map((piece) => {
                  const hasNotes = Boolean(piece.notesHtml);
                  const isNotesExpanded = Boolean(expandedPieceNotes[piece.id]);

                  return (
                    <article
                      key={piece.id}
                      className="overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-2xs transition hover:border-zinc-300"
                    >
                      {/* Piece Header Bar: Order Number, Title, Subtitle, Direct YouTube Links & Notes Toggle */}
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
                          {/* Attached YouTube / Audio Recordings for this specific piece */}
                          {piece.recordings.map((rec) => {
                            const isCurrentVideo = activeVideo?.link.url === rec.url;
                            return (
                              <button
                                key={rec.url}
                                type="button"
                                onClick={() => {
                                  setActiveAudio(null);
                                  setActiveVideo(
                                    isCurrentVideo ? null : { concertTitle: prog.title, link: rec }
                                  );
                                }}
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

                          {/* Director Notes Toggle */}
                          {hasNotes && (
                            <button
                              type="button"
                              onClick={() => togglePieceNotes(piece.id)}
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
                            onClick={(e) => handleProseClick(prog.title, e)}
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
                                        onClick={() =>
                                          setPreviewPdf({ pieceTitle: piece.title, file })
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
                                        title="Open PDF score in a new browser tab (iPad: tap Share → Copy to forScore)"
                                      >
                                        <ExternalLink className="h-3.5 w-3.5 text-gold-400" />
                                        Open PDF
                                      </a>
                                    </>
                                  )}

                                  {file.isAudio && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveVideo(null);
                                        setActiveAudio({ pieceTitle: piece.title, file });
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
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
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
                    Open PDF
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
