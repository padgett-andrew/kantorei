import type { DriveMusicFile } from '../../../types/choir';

export function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function prettifyScoreName(filename: string): string {
  return filename
    .replace(/\.(pdf|mp3|m4a|wav|aac|ogg|flac|docx?|doc|txt|rtf)$/i, '')
    .replace(/w_\s*/gi, 'w/ ')
    .replace(/_+/g, ' ')
    .replace(/\s+-\s+/g, ' — ')
    .trim();
}

export function streamUrl(file: DriveMusicFile, download = false): string {
  const params = new URLSearchParams({ name: file.name });
  if (download) params.set('download', '1');
  return `/api/music/${encodeURIComponent(file.id)}?${params.toString()}`;
}

export function highlightVoicePartInHtml(
  html: string,
  voicePart: string,
  sectionGroup: string
): string {
  const partNum = voicePart.slice(1);
  const letter = voicePart.charAt(0);
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

  return html
    .split(/(<[^>]+>)/g)
    .map((chunk) => {
      if (chunk.startsWith('<')) return chunk;
      return chunk.replace(
        pattern,
        (match) =>
          `<mark class="rounded-sm bg-amber-200/90 px-1 font-bold text-navy-950 shadow-2xs">${match}</mark>`
      );
    })
    .join('');
}

