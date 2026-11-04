import { useEffect, useState } from 'react';
import { ExternalLink, Play, X, Music } from 'lucide-react';
import type { MediaItem } from '../../types/choir';
import { extractYouTubeEmbedUrl } from '../../lib/media';

interface Props {
  featuredVideos: MediaItem[];
  remainingVideos?: MediaItem[];
  youtubeChannelUrl?: string;
}

export default function MediaGallery({
  featuredVideos,
  remainingVideos = [],
  youtubeChannelUrl = 'https://www.youtube.com/@kantoreiMN',
}: Props) {
  const [activeVideo, setActiveVideo] = useState<MediaItem | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Body scroll lock & ESC key listener for modal
  useEffect(() => {
    if (!activeVideo) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveVideo(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = origOverflow;
    };
  }, [activeVideo]);

  const displayedVideos = showAll
    ? [...featuredVideos, ...remainingVideos]
    : featuredVideos;

  const activeEmbedInfo = activeVideo
    ? extractYouTubeEmbedUrl(activeVideo.youtubeUrl)
    : null;

  return (
    <>
      {/* Video Cards Grid */}
      <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
        {displayedVideos.map((item) => {
          const { videoId } = extractYouTubeEmbedUrl(item.youtubeUrl);
          const thumbUrl = videoId
            ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
            : null;

          return (
            <article
              key={item.id || item.youtubeUrl}
              className="flex flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-2xs transition hover:border-copper-400 hover:shadow-md group"
            >
              {/* Clickable Video Poster / Lightbox Trigger */}
              <button
                type="button"
                onClick={() => setActiveVideo(item)}
                className="group/poster relative aspect-video w-full overflow-hidden bg-navy-950 text-left cursor-pointer"
                aria-label={`Watch ${item.title}`}
              >
                {thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover/poster:scale-105"
                  />
                ) : (
                  <div
                    className="absolute inset-0 opacity-40"
                    style={{
                      background:
                        'radial-gradient(circle at 30% 25%, #b16437 0%, transparent 55%), radial-gradient(circle at 80% 80%, #1f3652 0%, transparent 60%)',
                    }}
                  />
                )}

                {/* Scrim Overlay */}
                <div className="absolute inset-0 bg-navy-950/25 transition-colors group-hover/poster:bg-navy-950/40" />

                {/* Play Button Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-copper-500 text-white shadow-lg transition-transform duration-200 group-hover/poster:scale-110">
                    <Play className="h-6 w-6 fill-current ml-0.5" />
                  </span>
                </div>

                {/* Category Badge over Thumbnail */}
                <span className="absolute top-3 left-3 rounded-md bg-navy-950/80 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-gold-300 backdrop-blur-xs">
                  {item.category || 'Concert Video'}
                </span>
              </button>

              {/* Card Meta Content */}
              <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
                <div>
                  <h3 className="font-editorial text-xl sm:text-2xl font-bold text-navy-950 leading-snug">
                    <button
                      type="button"
                      onClick={() => setActiveVideo(item)}
                      className="cursor-pointer text-left hover:text-copper-600 transition-colors"
                    >
                      {item.title}
                    </button>
                  </h3>
                  {item.subtitle && (
                    <p className="mt-1 text-xs sm:text-sm font-medium text-stone-600">
                      {item.subtitle}
                    </p>
                  )}
                  {item.description && (
                    <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-stone-600 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveVideo(item)}
                    className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-copper-600 hover:text-navy-950 transition"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Watch Video</span>
                  </button>

                  <a
                    href={item.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-stone-400 hover:text-stone-700 transition"
                    title="Open on YouTube"
                  >
                    <span>YouTube</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Show more toggle button */}
      {remainingVideos.length > 0 && !showAll && (
        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-6 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-navy-950 shadow-xs hover:border-navy-950 hover:bg-stone-50 transition"
          >
            <span>Show all recordings ({remainingVideos.length} more)</span>
            <span>&darr;</span>
          </button>
        </div>
      )}

      {/* ===================================================================
          Concert Hall Theater Modal Lightbox
          =================================================================== */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-navy-950/95 backdrop-blur-md p-0 sm:p-4 transition-opacity duration-200"
          role="dialog"
          aria-modal="true"
          aria-label={`Video: ${activeVideo.title}`}
        >
          {/* Backdrop click dismiss */}
          <div
            className="absolute inset-0 -z-10"
            onClick={() => setActiveVideo(null)}
          />

          {/* Modal Container */}
          <div className="relative flex flex-col w-full h-[94vh] sm:h-auto sm:max-h-[90vh] sm:max-w-4xl bg-[#0B131E] text-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden border border-stone-800">
            {/* Top Bar */}
            <div className="flex items-center justify-between border-b border-stone-800 px-4 py-3 sm:px-6 bg-[#070D15] shrink-0">
              <div className="min-w-0 pr-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gold-400">
                  {activeVideo.category || 'Concert Recording'}
                </span>
                <h4 className="text-sm sm:text-base font-bold text-white truncate">
                  {activeVideo.title}
                </h4>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={activeVideo.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-stone-400 hover:text-white px-2 py-1 rounded transition"
                >
                  <span>Open on YouTube</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setActiveVideo(null)}
                  className="cursor-pointer rounded-full p-1.5 text-stone-400 hover:bg-white/10 hover:text-white transition"
                  aria-label="Close video player"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Video Player */}
            <div className="relative aspect-video w-full bg-black shrink-0">
              {activeEmbedInfo?.embedUrl ? (
                <iframe
                  src={`${activeEmbedInfo.embedUrl}&autoplay=1`}
                  title={activeVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="h-full w-full border-0"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-stone-400">
                  <span>Unable to embed video.</span>
                </div>
              )}
            </div>

            {/* Liner Notes & Description Area */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[35vh] space-y-3 bg-[#0B131E]">
              {activeVideo.subtitle && (
                <p className="text-xs sm:text-sm font-semibold text-gold-400 flex items-center gap-1.5">
                  <Music className="h-4 w-4" />
                  {activeVideo.subtitle}
                </p>
              )}

              {activeVideo.description && (
                <p className="text-xs sm:text-sm leading-relaxed text-stone-300">
                  {activeVideo.description}
                </p>
              )}

              <div className="pt-2 flex items-center justify-between text-xs text-stone-500 border-t border-stone-800">
                <span>Kantorei &bull; Adam Reinwald, Artistic Director</span>
                <a
                  href={youtubeChannelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-gold-300"
                >
                  Visit Kantorei Channel &rarr;
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
