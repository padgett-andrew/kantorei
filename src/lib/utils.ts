import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { EventType, VoicePart } from '../types/choir';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function getTodayIso(timeZone = 'America/Chicago'): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function formatEventDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0));
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatShortMonthDay(isoDate: string): { weekday: string; month: string; day: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return { weekday: '', month: '', day: isoDate };
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0));
  return {
    weekday: new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(date),
    month: new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(date),
    day: String(Number(match[3])),
  };
}

export function voicePartBadgeColor(part: VoicePart | string): string {
  const norm = (part || '').trim().toUpperCase();
  if (norm.startsWith('S')) return 'bg-rose-100 text-rose-800 border-rose-200';
  if (norm.startsWith('A')) return 'bg-amber-100 text-amber-800 border-amber-200';
  if (norm.startsWith('T')) return 'bg-sky-100 text-sky-800 border-sky-200';
  return 'bg-emerald-100 text-emerald-800 border-emerald-200';
}

export function eventTypeBadgeColor(type: EventType): string {
  switch (type) {
    case 'Concert':
      return 'bg-amber-100 text-amber-900 border-amber-300';
    case 'Dress':
      return 'bg-purple-100 text-purple-900 border-purple-200';
    case 'Retreat':
      return 'bg-teal-100 text-teal-900 border-teal-200';
    case 'Sectional':
      return 'bg-sky-100 text-sky-900 border-sky-200';
    default:
      return 'bg-zinc-100 text-zinc-700 border-zinc-200';
  }
}

export function isSpecificVoicePartMatch(
  filename: string,
  voicePart: VoicePart | string,
  sectionGroup: string
): boolean {
  const lower = filename.toLowerCase();
  const partLower = (voicePart || '').toLowerCase(); // e.g., 's', 'b2'
  const sectionLower = (sectionGroup || '').toLowerCase(); // e.g., 'soprano', 'bass'

  // If general SATB (e.g. 's', 'a', 't', 'b'), match both general and split parts (e.g. s, s1, s2)
  const partRegex =
    partLower.length === 1
      ? new RegExp(`(^|[^a-z0-9])${partLower}[12]?([^a-z0-9]|$)`, 'i')
      : new RegExp(`(^|[^a-z0-9])${partLower}([^a-z0-9]|$)`, 'i');

  const sectionRegex = new RegExp(`(^|[^a-z])${sectionLower}(es|s)?([^a-z]|$)`, 'i');

  return partRegex.test(lower) || sectionRegex.test(lower);
}

/**
 * Checks whether a choral piece or score file applies to a singer.
 *
 * Choral Philosophy:
 * - Most choral music is full mixed chorus (all parts / SATB / full octavo) and applies to everyone.
 * - This filter EXCLUDES music that clearly does NOT apply:
 *   1. Treble-only repertoire (SSAA, SSA, Treble Chorus) is excluded for Tenors and Basses.
 *   2. Tenor/Bass-only repertoire (TTBB, TTB, Men's Chorus) is excluded for Sopranos and Altos.
 *   3. Specific rehearsal part tracks for a DIFFERENT voice section (e.g. an Alto 1 track for a Bass) are excluded.
 *   4. Everything else (full scores, SATB, all-parts, accompaniment, or un-restricted pieces) IS INCLUDED.
 */
export function doesFileApplyToSinger(
  filename: string,
  voicePart: VoicePart,
  sectionGroup: string,
  pieceContext?: string
): boolean {
  const lowerFile = filename.toLowerCase();
  const lowerContext = (pieceContext || '').toLowerCase();
  const combined = `${lowerContext} ${lowerFile}`;

  const isTrebleSinger = sectionGroup === 'Soprano' || sectionGroup === 'Alto';
  const isLowerVoiceSinger = sectionGroup === 'Tenor' || sectionGroup === 'Bass';

  // 1. Exclude Treble-only pieces/files for Tenors & Basses
  const isTrebleOnly =
    /\b(ssaa|ssa|s\.s\.a\.a|treble\s*choir|treble\s*chorus|women'?s?\s*choir|women'?s?\s*chorus|upper\s*voices)\b/i.test(
      combined
    );
  if (isTrebleOnly && isLowerVoiceSinger) {
    return false;
  }

  // 2. Exclude TTBB-only pieces/files for Sopranos & Altos
  const isTenorBassOnly =
    /\b(ttbb|ttb|t\.t\.b\.b|men'?s?\s*choir|men'?s?\s*chorus|male\s*chorus|lower\s*voices|tenor[\s/-]bass)\b/i.test(
      combined
    );
  if (isTenorBassOnly && isTrebleSinger) {
    return false;
  }

  // 3. For individual practice audio tracks or part scores:
  const isUserPartExplicit = isSpecificVoicePartMatch(filename, voicePart, sectionGroup);
  if (!isUserPartExplicit) {
    const otherSections = ['soprano', 'alto', 'tenor', 'bass'].filter(
      (s) => s !== sectionGroup.toLowerCase()
    );
    const otherParts = ['s', 's1', 's2', 'a', 'a1', 'a2', 't', 't1', 't2', 'b', 'b1', 'b2'].filter(
      (p) => {
        if (p === voicePart.toLowerCase()) return false;
        // If user has a general voice part (e.g. 'b'), do not treat 'b1' or 'b2' as other parts to exclude
        if (voicePart.length === 1 && p.startsWith(voicePart.toLowerCase())) return false;
        return true;
      }
    );

    const hasOtherSection = otherSections.some((s) => {
      const reg = new RegExp(`(^|[^a-z])${s}(es|s)?([^a-z]|$)`, 'i');
      return reg.test(lowerFile);
    });
    const hasOtherPart = otherParts.some((p) => {
      const reg = new RegExp(`(^|[^a-z0-9])${p}([^a-z0-9]|$)`, 'i');
      return reg.test(lowerFile);
    });

    if (hasOtherSection || hasOtherPart) {
      const isAllPartsOrMixed =
        lowerFile.includes('satb') ||
        lowerFile.includes('all parts') ||
        lowerFile.includes('full score') ||
        lowerFile.includes('accompaniment') ||
        lowerFile.includes('all choir');

      if (!isAllPartsOrMixed) {
        return false;
      }
    }
  }

  return true;
}

export function doesFilenameMatchSection(filename: string, voicePart: VoicePart | string, sectionGroup: string): boolean {
  return isSpecificVoicePartMatch(filename, voicePart, sectionGroup);
}

/**
 * Normalizes an image URL (for concerts, leadership portraits, etc.),
 * filtering out empty values, demo strings, and Ticket Tailor default/stock placeholders.
 * Automatically transforms Google Drive share links to direct, edge-cacheable thumbnail URLs.
 */
export function sanitizeHeroImageUrl(url?: string | null): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (
    !trimmed ||
    trimmed === 'DEMO' ||
    trimmed.toLowerCase() === 'undefined' ||
    trimmed.toLowerCase() === 'null'
  ) {
    return undefined;
  }
  // Filter out Ticket Tailor's default global stock images
  if (trimmed.includes('/userfiles/global/')) return undefined;
  if (/abstract-\d+\.(jpg|jpeg|png|webp)/i.test(trimmed)) return undefined;
  if (/placeholder/i.test(trimmed)) return undefined;

  // Convert Google Drive view/share link into high-res CDN thumbnail URL
  if (trimmed.includes('drive.google.com')) {
    const driveMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w1200`;
    }
  }

  return trimmed;
}

