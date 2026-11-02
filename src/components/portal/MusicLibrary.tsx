import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { FolderOpen, Music2, Search, Sparkles } from 'lucide-react';
import type { DriveMusicFile, RepertoirePiece, Singer } from '../../types/choir';
import { doesFileApplyToSinger, isSpecificVoicePartMatch } from '../../lib/utils';
import { parseYouTubeUrl, type ReferenceRecordingLink } from '../../lib/youtube';
import {
  buildConcertPrograms,
  type LoadedConcertDoc,
  type ProgramPiece,
  type ProgramRecording,
} from '../../lib/program';
import AudioPlayer, { type ActiveAudioState } from './music/AudioPlayer';
import DocMarkingsModal, { type ModalDocFileState } from './music/DocMarkingsModal';
import PdfPreviewModal, { type PreviewPdfState } from './music/PdfPreviewModal';
import ProgramSection from './music/ProgramSection';
import VideoPlayer, { type ActiveVideoState } from './music/VideoPlayer';
import { prettifyScoreName } from './music/utils';

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

export default function MusicLibrary({ singer, pieces }: Props) {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'my-part'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('kantorei_music_filter');
        if (saved === 'all' || saved === 'my-part') return saved;
      } catch {
        // ignore
      }
    }
    return 'my-part';
  });
  const [selectedConcertId, setSelectedConcertId] = useState<string>('all');

  function handleFilterModeChange(mode: 'all' | 'my-part') {
    setFilterMode(mode);
    try {
      localStorage.setItem('kantorei_music_filter', mode);
    } catch {
      // ignore
    }
  }

  const [docCache, setDocCache] = useState<Record<string, LoadedDocPayload>>({});
  const [docLoading, setDocLoading] = useState<Record<string, boolean>>({});
  const [docError, setDocError] = useState<Record<string, string>>({});
  const [expandedDocIds, setExpandedDocIds] = useState<Record<string, boolean>>({});
  const [expandedPieceNotes, setExpandedPieceNotes] = useState<Record<string, boolean>>({});
  const [highlightMyPart, setHighlightMyPart] = useState(true);

  const [modalDocFile, setModalDocFile] = useState<ModalDocFileState | null>(null);
  const [activeAudio, setActiveAudio] = useState<ActiveAudioState | null>(null);
  const [activeVideo, setActiveVideo] = useState<ActiveVideoState | null>(null);
  const [previewPdf, setPreviewPdf] = useState<PreviewPdfState | null>(null);

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
          // If in "my-part" mode, check if the piece itself is applicable (excludes e.g. SSAA pieces for Basses)
          const pieceApplies = doesFileApplyToSinger(
            piece.title,
            singer.voicePart,
            singer.sectionGroup,
            `${prog.title} ${piece.subtitle} ${piece.notesHtml}`
          );

          if (filterMode === 'my-part' && !pieceApplies) {
            continue;
          }

          const annotatedFiles: DriveMusicFile[] = piece.files.map((f) => ({
            ...f,
            matchesUserSection: isSpecificVoicePartMatch(
              f.name,
              singer.voicePart,
              singer.sectionGroup
            ),
          }));

          const visibleFiles = annotatedFiles.filter((f) => {
            if (
              filterMode === 'my-part' &&
              !doesFileApplyToSinger(
                f.name,
                singer.voicePart,
                singer.sectionGroup,
                `${prog.title} ${piece.title} ${piece.subtitle}`
              )
            ) {
              return false;
            }
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

  function handlePlayAudio(pieceTitle: string, file: DriveMusicFile) {
    setActiveVideo(null);
    setActiveAudio({ pieceTitle, file });
  }

  function handlePlayVideo(concertTitle: string, rec: ProgramRecording) {
    setActiveAudio(null);
    setActiveVideo((prev) =>
      prev?.link.url === rec.url ? null : { concertTitle, link: rec }
    );
  }

  function handlePreviewPdf(pieceTitle: string, file: DriveMusicFile) {
    setPreviewPdf({ pieceTitle, file });
  }

  function handleOpenModalDoc(concertTitle: string, file: DriveMusicFile) {
    setModalDocFile({ concertTitle, file });
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Concert Program Switcher */}
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
            onClick={() => handleFilterModeChange('all')}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filterMode === 'all'
                ? 'bg-white text-navy-950 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            All Music &amp; Tracks
          </button>
          <button
            type="button"
            onClick={() => handleFilterModeChange('my-part')}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filterMode === 'my-part'
                ? 'bg-white text-navy-950 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-gold-500" />
            My Voice ({singer.voicePart})
          </button>
        </div>
      </div>

      {/* Inline Reference YouTube Video Player */}
      <VideoPlayer
        activeVideo={activeVideo}
        videoPlayerRef={videoPlayerRef}
        onClose={() => setActiveVideo(null)}
      />

      {/* Grouped Concert Program Sections */}
      {filteredPrograms.length === 0 ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
          {search ? (
            <div className="space-y-2">
              <Music2 className="mx-auto h-8 w-8 text-zinc-300" />
              <p className="font-semibold text-navy-950">No music found matching &ldquo;{search}&rdquo;</p>
              <p className="text-xs text-zinc-400">Try searching for a different piece, composer, or score name.</p>
              <button
                type="button"
                onClick={() => setSearch('')}
                className="mt-2 text-xs font-semibold text-gold-600 underline hover:text-gold-700"
              >
                Clear Search
              </button>
            </div>
          ) : filterMode === 'my-part' ? (
            <div className="space-y-2">
              <Sparkles className="mx-auto h-8 w-8 text-gold-400" />
              <p className="font-semibold text-navy-950">No specific rehearsal tracks for {singer.voicePart} found.</p>
              <p className="text-xs text-zinc-400">
                Switch back to &ldquo;All Scores & Tracks&rdquo; to view full SATB scores and tutti reference recordings.
              </p>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2 text-xs font-semibold text-white"
              >
                Show All Scores & Tracks
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Music2 className="mx-auto h-8 w-8 text-zinc-300" />
              <p className="font-semibold text-navy-950">No repertoire pieces found.</p>
              <p className="text-xs text-zinc-400">Upload PDF scores and MP3 part tracks to your Google Drive repertoire folder.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {filteredPrograms.map((prog) => (
            <ProgramSection
              key={prog.id}
              prog={prog}
              singer={singer}
              expandedDocIds={expandedDocIds}
              onToggleDocExpanded={toggleDocExpanded}
              onOpenModalDoc={handleOpenModalDoc}
              highlightMyPart={highlightMyPart}
              onToggleHighlight={() => setHighlightMyPart((v) => !v)}
              expandedPieceNotes={expandedPieceNotes}
              onTogglePieceNotes={togglePieceNotes}
              activeAudio={activeAudio}
              activeVideo={activeVideo}
              onPlayAudio={handlePlayAudio}
              onPlayVideo={handlePlayVideo}
              onPreviewPdf={handlePreviewPdf}
              onProseClick={handleProseClick}
            />
          ))}
        </div>
      )}

      {/* Sticky Bottom Rehearsal Audio Player */}
      <AudioPlayer activeAudio={activeAudio} onClose={() => setActiveAudio(null)} />

      {/* Full-Screen Director's Markings Modal */}
      <DocMarkingsModal
        modalDocFile={modalDocFile}
        singer={singer}
        docCache={docCache}
        docLoading={docLoading}
        docError={docError}
        highlightMyPart={highlightMyPart}
        onToggleHighlight={() => setHighlightMyPart((v) => !v)}
        onProseClick={handleProseClick}
        onClose={() => setModalDocFile(null)}
      />

      {/* Inline PDF Score Preview Modal */}
      <PdfPreviewModal previewPdf={previewPdf} onClose={() => setPreviewPdf(null)} />
    </div>
  );
}
