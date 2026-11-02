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

export function voicePartBadgeColor(part: VoicePart): string {
  if (part.startsWith('S')) return 'bg-rose-100 text-rose-800 border-rose-200';
  if (part.startsWith('A')) return 'bg-amber-100 text-amber-800 border-amber-200';
  if (part.startsWith('T')) return 'bg-sky-100 text-sky-800 border-sky-200';
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

export function doesFilenameMatchSection(filename: string, voicePart: VoicePart, sectionGroup: string): boolean {
  const lower = filename.toLowerCase();
  const partLower = voicePart.toLowerCase(); // e.g., b2
  const sectionLower = sectionGroup.toLowerCase(); // e.g., bass

  const partRegex = new RegExp(`(^|[^a-z0-9])${partLower}([^a-z0-9]|$)`, 'i');
  const sectionRegex = new RegExp(`(^|[^a-z])${sectionLower}(es|s)?([^a-z]|$)`, 'i');

  return partRegex.test(lower) || sectionRegex.test(lower) || lower.includes('all parts') || lower.includes('full score') || lower.includes('satb');
}

