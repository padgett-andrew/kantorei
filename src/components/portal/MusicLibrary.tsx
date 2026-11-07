import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { Music2, Search } from 'lucide-react';
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
  initialDocs?: Record<string, LoadedDocPayload>;
  repertoireDriveUrl?: string;
}

export interface LoadedDocPayload {
  title: string;
  html: string;
  sourceType: 'gdoc' | 'docx' | 'text' | 'legacy-doc';
  canExportPdf: boolean;
  referenceLinks: ReferenceRecordingLink[];
}

export default function MusicLibrary({
  singer,
  pieces,
  initialDocs,
  repertoireDriveUrl,
}: Props) {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'my-part'>('all');
  const [selectedConcertId, setSelectedConcertId] = useState<string>('all');

  function handleFilterModeChange(mode: 'all' | 'my-part') {
    setFilterMode(mode);
    try {
      localStorage.setItem('kantorei_music_filter', mode);
    } catch {
      // ignore
    }
  }

  const [docCache, setDocCache] = useState<Record<string, LoadedDocPayload>>(() => initialDocs || {});
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
      if (!docCache[docFile.id]) {
        void ensureDocLoaded(docFile);
      }
    }
  }, [allDocFiles, docCache]);

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

  const excludedPiecesCount = useMemo(() => {
    if (filterMode !== 'my-part') return 0;
    const totalRawPieces = rawPrograms
      .filter((prog) => selectedConcertId === 'all' || prog.id === selectedConcertId)
      .reduce((sum, p) => sum + p.pieces.length, 0);
    const totalFilteredPieces = filteredPrograms.reduce((sum, p) => sum + p.pieces.length, 0);
    return Math.max(0, totalRawPieces - totalFilteredPieces);
  }, [filterMode, rawPrograms, filteredPrograms, selectedConcertId]);

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
    <div className="space-y-8 pb-24">
      {/* Concert Program Switcher (shown only when multiple programs exist) */}
      {rawPrograms.length > 1 && (
        <div className="scrollbar-none flex items-center gap-6 overflow-x-auto border-b border-stone-300/80">
          <button
            type="button"
            onClick={() => setSelectedConcertId('all')}
            className={`relative shrink-0 cursor-pointer pb-3 text-xs font-semibold uppercase tracking-[0.15em] transition ${
              selectedConcertId === 'all'
                ? 'text-navy-950 after:absolute after:right-0 after:bottom-0 after:left-0 after:h-[1.5px] after:bg-copper-500'
                : 'text-stone-500 hover:text-navy-950'
            }`}
          >
            All Programs ({totalScoresAndTracks})
          </button>
          {rawPrograms.map((prog) => {
            const fileCount = prog.pieces.reduce((s, p) => s + p.files.length, 0);
            const active = selectedConcertId === prog.id;
            return (
              <button
                key={prog.id}
                type="button"
                onClick={() => setSelectedConcertId(prog.id)}
                className={`relative inline-flex shrink-0 cursor-pointer items-baseline gap-2 pb-3 text-xs font-semibold uppercase tracking-[0.15em] transition ${
                  active
                    ? 'text-navy-950 after:absolute after:right-0 after:bottom-0 after:left-0 after:h-[1.5px] after:bg-copper-500'
                    : 'text-stone-500 hover:text-navy-950'
                }`}
              >
                <span>{prog.title}</span>
                <span className="text-[10px] text-copper-600 tabular-nums">{fileCount}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Architectural Filter & Search Bar */}
      <div className="flex flex-col justify-between gap-3 border-y border-stone-300/80 py-3.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-stone-400" />
          <input
            type="search"
            placeholder="Search programs, titles, composers, or voice parts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-sm border border-stone-300/90 bg-white/80 py-2 pr-4 pl-9 text-sm text-stone-900 placeholder:text-stone-400 transition focus:border-navy-950 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="inline-flex shrink-0 items-center rounded-sm border border-stone-300/90 bg-white p-0.5">
          <button
            type="button"
            onClick={() => handleFilterModeChange('all')}
            className={`cursor-pointer rounded-xs px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
              filterMode === 'all'
                ? 'bg-navy-950 text-white'
                : 'text-stone-600 hover:text-navy-950'
            }`}
          >
            All Repertoire
          </button>
          <button
            type="button"
            onClick={() => handleFilterModeChange('my-part')}
            className={`cursor-pointer rounded-xs px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
              filterMode === 'my-part'
                ? 'bg-copper-600 text-white'
                : 'text-stone-600 hover:text-navy-950'
            }`}
          >
            My Voice ({singer.voicePart})
          </button>
        </div>
      </div>

      {excludedPiecesCount > 0 && (
        <div className="flex flex-col items-start justify-between gap-2 border-l-2 border-copper-500 bg-[#f5efe8] px-4 py-3 text-xs text-stone-700 sm:flex-row sm:items-center">
          <span>
            Filtered for <strong className="font-semibold text-navy-950">{singer.sectionGroup} ({singer.voicePart})</strong> · {excludedPiecesCount} piece{excludedPiecesCount > 1 ? 's' : ''} outside your voice division {excludedPiecesCount > 1 ? 'are' : 'is'} hidden.
          </span>
          <button
            type="button"
            onClick={() => handleFilterModeChange('all')}
            className="shrink-0 cursor-pointer text-[11px] font-semibold uppercase tracking-[0.12em] text-copper-600 underline underline-offset-4 hover:text-navy-950"
          >
            Show Complete Program
          </button>
        </div>
      )}

      {/* Inline Reference YouTube Video Player */}
      <VideoPlayer
        activeVideo={activeVideo}
        videoPlayerRef={videoPlayerRef}
        onClose={() => setActiveVideo(null)}
      />

      {/* Grouped Concert Program Sections */}
      {filteredPrograms.length === 0 ? (
        <div className="border-y border-stone-200/90 py-14 text-center text-sm text-stone-500">
          {search ? (
            <div className="space-y-2">
              <Music2 className="mx-auto h-6 w-6 text-stone-400" />
              <p className="font-editorial text-xl font-semibold text-navy-950">
                No repertoire matching &ldquo;{search}&rdquo;
              </p>
              <p className="text-xs text-stone-500">
                Try searching for a different work, composer, or score edition.
              </p>
              <button
                type="button"
                onClick={() => setSearch('')}
                className="mt-2 cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] text-copper-600 underline underline-offset-4 hover:text-navy-950"
              >
                Clear Search
              </button>
            </div>
          ) : filterMode === 'my-part' ? (
            <div className="space-y-2">
              <p className="font-editorial text-xl font-semibold text-navy-950">
                No dedicated {singer.voicePart} part files found.
              </p>
              <p className="text-xs text-stone-500">
                Switch back to All Repertoire to view full SATB scores and tutti reference recordings.
              </p>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-sm bg-navy-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white"
              >
                Show All Repertoire
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Music2 className="mx-auto h-6 w-6 text-stone-400" />
              <p className="font-editorial text-xl font-semibold text-navy-950">
                No repertoire posted yet.
              </p>
              <p className="text-xs text-stone-500">
                Scores and rehearsal tracks appear automatically once uploaded to the ensemble Drive folder.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-14">
          {filteredPrograms.map((prog) => (
            <ProgramSection
              key={prog.id}
              prog={prog}
              singer={singer}
              repertoireDriveUrl={repertoireDriveUrl}
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
