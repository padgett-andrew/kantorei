/**
 * Concert Program Builder
 *
 * Turns a concert's flat Drive folder (scores, part tracks, director docs) into an ordered list of
 * pieces that follows the concert order laid out in the director's Google Doc / Word file, with each
 * piece's YouTube reference recordings and director's notes attached directly to that piece.
 *
 * Pure functions only (no network) so it runs identically on Cloudflare Workers and in tests.
 */
import type { DriveMusicFile, RepertoirePiece } from '../types/choir';
import {
  decodeHtmlEntities,
  parseYouTubeUrl,
  stripTagsToText,
  type ReferenceRecordingLink,
} from './youtube.ts';

export interface LoadedConcertDoc {
  title: string;
  html: string;
  canExportPdf: boolean;
}

export interface ConcertDoc {
  file: DriveMusicFile;
  title: string;
  html: string;
  canExportPdf: boolean;
  isOrderDoc: boolean;
}

export interface ProgramRecording extends ReferenceRecordingLink {
  host: string;
}

export interface ProgramPiece {
  id: string;
  title: string;
  /** Remainder of the concert-order line, e.g. "3.5’ - SSAA - TR - marimba" */
  subtitle: string;
  /** 1-based position in the concert order doc, or null when the piece isn't listed there */
  order: number | null;
  files: DriveMusicFile[];
  recordings: ProgramRecording[];
  notesHtml: string;
  /** Google Drive folder ID where this piece's files reside, if known */
  folderId?: string;
}

export interface ConcertProgram {
  id: string;
  title: string;
  docs: ConcertDoc[];
  orderDocTitle: string | null;
  pieces: ProgramPiece[];
  unassignedRecordings: ProgramRecording[];
}

// ---------------------------------------------------------------------------
// Text normalization & fuzzy title matching
// ---------------------------------------------------------------------------

const EXT_RE = /\.(pdf|mp3|m4a|wav|aac|ogg|flac|docx?|txt|rtf)$/i;
const NUM_PREFIX_RE = /^\s*(\d{1,3})\s*[.)\-—–_:]+\s*/;
const STOP = new Set([
  'the', 'a', 'an', 'of', 'de', 'la', 'el', 'los', 'las', 'del', 'in', 'on', 'at',
  'and', 'y', 'en', 'from', 'to', 'for', 'with', 'o',
]);
const NOISE = new Set([
  'w', 'markings', 'marking', 'marked', 'suggested', 'formatted', 'percussion', 'ssaa', 'satb',
  'ttbb', 'ssa', 'ttb', 'sa', 'tb', 'atr', 'tr', 'pdf', 'score', 'full', 'edition', 'language',
  'guide', 'instrumental', 'parts', 'part', 'pronunciation', 'spanish', 'english', 'reference',
  'track', 'audio', 'rehearsal', 'copy', 'version', 'arr', 'arranged', 'by',
]);

export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’‘`´]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function toks(s: string): string[] {
  const n = normalizeText(s);
  return n ? n.split(' ') : [];
}

function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function tokEq(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 4 || b.length < 4) return false;
  if (withinOneEdit(a, b)) return true;
  return Math.min(a.length, b.length) >= 6 && (a.startsWith(b) || b.startsWith(a));
}

function findPhrase(hay: string[], phrase: string[]): number {
  outer: for (let i = 0; i + phrase.length <= hay.length; i++) {
    for (let k = 0; k < phrase.length; k++) {
      if (!tokEq(hay[i + k], phrase[k])) continue outer;
    }
    return i;
  }
  return -1;
}

interface KeyMatch {
  pos: number;
  score: number;
}

function findKey(hay: string[], key: string[]): KeyMatch | null {
  if (key.length === 0 || hay.length === 0) return null;

  // Single word key (e.g. "Veni", "Refugee", "Gaudete", or composer surname like "Deignan", "Sandström")
  if (key.length === 1) {
    const word = key[0];
    if (word.length >= 4 && !STOP.has(word) && !NOISE.has(word)) {
      const i = findPhrase(hay, [word]);
      if (i >= 0) return { pos: i, score: 3 };
    }
    return null;
  }

  // Multi-word key (e.g. "Silent Night", "People Look East", "Love Came Down at Christmas"):
  // 1. Leading phrase of the title (longest first, >= 2 words)
  for (let n = Math.min(4, key.length); n >= 2; n--) {
    const phrase = key.slice(0, n);
    if (!phrase.some((t) => t.length >= 4 && !STOP.has(t))) continue;
    const i = findPhrase(hay, phrase);
    if (i >= 0) return { pos: i, score: n + 2 };
  }

  // 2. Any distinctive word pair inside the title
  for (let s = 0; s + 1 < key.length && s <= 4; s++) {
    const pair = key.slice(s, s + 2);
    if (pair.some((t) => t.length >= 4 && !STOP.has(t) && !NOISE.has(t))) {
      const i = findPhrase(hay, pair);
      if (i >= 0) return { pos: i, score: 2 };
    }
  }

  return null;
}

export function extractNameVariants(name: string): string[] {
  let s = name
    .replace(EXT_RE, '')
    .replace(/^\s*\d{1,3}\s*[.)\-—–_:]+\s*/, '')
    .replace(/_+/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .trim();

  const variants = [s];

  // If "Composer: Title" or "Title: Subtitle"
  if (s.includes(':')) {
    const parts = s.split(':');
    for (const p of parts) {
      const trimmed = p.trim();
      if (trimmed.length >= 2) variants.push(trimmed);
    }
  }

  // If "Composer — Title" or "Title — Composer"
  if (/\s+[-–—]\s+/.test(s)) {
    const parts = s.split(/\s+[-–—]\s+/);
    for (const p of parts) {
      const trimmed = p.trim();
      if (trimmed.length >= 2) variants.push(trimmed);
    }
  }

  return Array.from(new Set(variants));
}

function cleanNameForKey(name: string): string {
  let s = name
    .replace(EXT_RE, '')
    .replace(/^\s*\d{1,3}\s*[.)\-_:—–]+\s*/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\([^)]*\)/g, ' ');
  const withoutComposer = s.replace(/\s+[-–—]\s+.*$/, '');
  if (withoutComposer.trim().length >= 3) s = withoutComposer;
  return s;
}

function keyTokens(name: string): string[] {
  const t = toks(cleanNameForKey(name)).filter((x) => !NOISE.has(x));
  while (t.length > 1 && /^\d+$/.test(t[t.length - 1])) t.pop();
  return t;
}

function cleanDisplayName(name: string): string {
  return name
    .replace(EXT_RE, '')
    .replace(/^\s*\d{1,3}\s*[.)]\s*/, '')
    .replace(/w[_/]\s*markings?/gi, '')
    .replace(/\((?:marked|suggested)[^)]*\)/gi, '')
    .replace(/_+/g, ' ')
    .replace(/\s+-\s+/g, ' — ')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\s—-]+$/, '')
    .trim();
}

// ---------------------------------------------------------------------------
// Document parsing helpers
// ---------------------------------------------------------------------------

const URL_RE = /https?:\/\/[^\s<>"]+/gi;
const ANCHOR_RE = /<a\b[^>]*?\bhref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
const UNIT_RE = /<(li|p|h[1-6]|td|th|tr)\b[^>]*>([\s\S]*?)<\/\1>/gi;
const BLOCK_RE = /<(p|ul|ol|h[1-6]|table|blockquote)\b[^>]*>([\s\S]*?)<\/\1>|<hr\s*\/?>/gi;
const BOLD_START_RE = /^\s*(?:<span>\s*)*(?:<strong\b|<b\b|<span class="[^"]*font-semibold)/i;
const STOP_RE =
  /^\s*(congregation|carol\b|part\s+[ivx\d]+\b|[ivx]+\s*[:.]\s|the verse theme|verse\s+\d|narrator|total time|closing|final\b|fin\b|new\s*:|before verse|musical mood)/i;
const DURATION_RE =
  /(?:[\s.,]+[-–—]?\s*)\d+(?:[.:]\d+)?\s*(?:[’'′]|min\b|\s*[-–—(]|\s*[A-Z]{1,4}\b)/;
const OTHER_AUDIO_HOST_RE = /\b(spotify\.com|soundcloud\.com|music\.apple\.com|bandcamp\.com|vimeo\.com)\b/i;

function looksLikeUrlText(t: string): boolean {
  return /^(https?:\/\/|www\.)/i.test(t) || /^[\w.-]+\.(com|org|net|edu)\b/i.test(t);
}

/** Plain text with URLs and URL-only link text removed (keeps descriptive link text). */
function plainWithoutUrls(html: string): string {
  const replaced = html.replace(ANCHOR_RE, (_m, _href, inner: string) => {
    const t = stripTagsToText(inner);
    return looksLikeUrlText(t) ? ' ' : ` ${inner} `;
  });
  return stripTagsToText(replaced).replace(URL_RE, ' ').replace(/\s+/g, ' ').trim();
}

/** Plain text excluding every link. */
function ownText(html: string): string {
  return stripTagsToText(html.replace(ANCHOR_RE, ' '))
    .replace(URL_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface DocUnit {
  tag: string;
  html: string;
  text: string;
  tokStart: number;
}

interface DocIndex {
  units: DocUnit[];
  hay: string[];
  unitOf: number[];
}

function indexDoc(html: string): DocIndex {
  const units: DocUnit[] = [];
  const hay: string[] = [];
  const unitOf: number[] = [];
  for (const m of html.matchAll(UNIT_RE)) {
    const text = plainWithoutUrls(m[2]);
    const unitIdx = units.length;
    units.push({ tag: m[1].toLowerCase(), html: m[2], text, tokStart: hay.length });
    for (const t of toks(text)) {
      hay.push(t);
      unitOf.push(unitIdx);
    }
  }
  return { units, hay, unitOf };
}

function splitProgramLine(text: string): { title: string; rest: string } {
  const t = text.replace(/^\s*\d{1,3}\s*[.)]\s*/, '').replace(/^[*\s]+/, '');
  let cut = t.length;
  const d = DURATION_RE.exec(t);
  if (d && d.index >= 3) cut = Math.min(cut, d.index);
  const plus = t.search(/\s\+\s/);
  if (plus >= 3) cut = Math.min(cut, plus);
  const title = t
    .slice(0, cut)
    .replace(/\s+[-–—]\s*\(/g, ' (')
    .replace(/[\s.,\-–—:]+$/, '')
    .trim();
  const rest = t
    .slice(cut)
    .replace(/^[\s.,\-–—:+]+/, '')
    .trim();
  return { title, rest };
}

const SET_HEADER_RE = /^\s*(\d{1,2})\s*[.)]?\s*$/;
const DIVIDER_RE = /^[—–\-\s_*]+$/;
const TOTAL_TIME_RE = /\b(total\s+time|total\s+duration)\b/i;
const PROSE_START_RE =
  /^(part\s+[ivx\d]+|[ivx\d]+\s*[:.]\s|narrator|the verse theme|verse\s+\d|reader|scene\s+\d)/i;

interface ProgramEntry {
  order: number;
  setNum: number | null;
  title: string;
  subtitle: string;
  rawText: string;
  unitIdx: number;
  tokStart: number;
}

function extractProgramEntriesFromUnits(units: DocUnit[]): ProgramEntry[] | null {
  // 1. Check for table-based program rows
  const tableCells = units.filter((u) => u.tag === 'td' || u.tag === 'th');
  if (tableCells.length >= 2) {
    const tableEntries: ProgramEntry[] = [];
    for (let i = 0; i < tableCells.length; i++) {
      const u = tableCells[i];
      const numMatch = /^\s*(\d{1,3})\s*[.)]\s*(.+)/.exec(u.text);
      if (numMatch && u.text.length <= 150) {
        const orderNum = Number(numMatch[1]);
        const parsed = splitProgramLine(numMatch[2]);
        if (parsed.title.length >= 3) {
          tableEntries.push({
            order: orderNum,
            setNum: null,
            title: parsed.title,
            subtitle: parsed.rest,
            rawText: u.text,
            unitIdx: units.indexOf(u),
            tokStart: u.tokStart,
          });
        }
      }
    }
    if (tableEntries.length >= 2) {
      return tableEntries;
    }
  }

  // 2. Check for running program block (e.g. starting with "FINAL", "Order", "Program", or set number "1.")
  let startIdx = -1;
  for (let i = 0; i < Math.min(10, units.length); i++) {
    const t = units[i].text;
    if (/\b(final|running order|concert order|program|set ?list)\b/i.test(t)) {
      startIdx = i + 1;
      break;
    }
    if (SET_HEADER_RE.test(t)) {
      startIdx = i;
      break;
    }
  }

  if (startIdx < 0) return null;

  const entries: ProgramEntry[] = [];
  let currentSet: number | null = null;

  for (let i = startIdx; i < units.length; i++) {
    const u = units[i];
    const t = u.text;

    if (TOTAL_TIME_RE.test(t) || PROSE_START_RE.test(t) || t.length > 250) {
      break;
    }

    if (DIVIDER_RE.test(t)) continue;

    const setMatch = SET_HEADER_RE.exec(t);
    if (setMatch) {
      currentSet = Number(setMatch[1]);
      continue;
    }

    if (t.length >= 3 && t.length <= 220) {
      const parsed = splitProgramLine(t);
      if (parsed.title.length >= 3) {
        entries.push({
          order: entries.length + 1,
          setNum: currentSet,
          title: parsed.title,
          subtitle: parsed.rest,
          rawText: t,
          unitIdx: i,
          tokStart: u.tokStart,
        });
      }
    }
  }

  return entries.length >= 2 ? entries : null;
}

function matchScore(entryTokens: string[], groupKeys: string[][]): number {
  let best = 0;
  for (const key of groupKeys) {
    if (key.length === 0) continue;
    const pIdx = findPhrase(entryTokens, key);
    if (pIdx >= 0) {
      const score = key.length * 10;
      if (score > best) best = score;
      continue;
    }
    for (let s = 0; s + 1 < key.length; s++) {
      const pair = key.slice(s, s + 2);
      if (findPhrase(entryTokens, pair) >= 0) {
        if (20 > best) best = 20;
      }
    }
    for (const word of key) {
      if (word.length >= 4 && !STOP.has(word) && !NOISE.has(word)) {
        if (findPhrase(entryTokens, [word]) >= 0) {
          const s = word.length >= 6 ? 10 : 5;
          if (s > best) best = s;
        }
      }
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Piece grouping
// ---------------------------------------------------------------------------

interface PieceGroup {
  id: string;
  folderTitle?: string;
  folderId?: string;
  prefixNum: number | null;
  files: DriveMusicFile[];
  keys: string[][];
  matchPos: number | null;
  recordings: ProgramRecording[];
  recordingKeys: Set<string>;
  notes: string[];
  noteKeys: Set<string>;
}

function addKey(group: PieceGroup, key: string[]) {
  if (key.length === 0) return;
  const joined = key.join(' ');
  if (!group.keys.some((k) => k.join(' ') === joined)) group.keys.push(key);
}

function bestGroupInTokens(
  tokens: string[],
  groups: PieceGroup[],
  maxPos = Number.POSITIVE_INFINITY
): PieceGroup | null {
  let best: { group: PieceGroup; score: number; pos: number } | null = null;
  for (const g of groups) {
    for (const key of g.keys) {
      const m = findKey(tokens, key);
      if (!m || m.pos > maxPos) continue;
      if (!best || m.score > best.score || (m.score === best.score && m.pos < best.pos)) {
        best = { group: g, score: m.score, pos: m.pos };
      }
    }
  }
  return best?.group ?? null;
}

function isRootCollection(piece: RepertoirePiece, concertId: string, concertTitle: string) {
  return (
    piece.folderId === concertId ||
    piece.title === concertTitle ||
    /—\s*Scores & Tracks$/.test(piece.title)
  );
}

function hostLabel(url: string): string {
  try {
    const h = new URL(url).hostname.replace(/^www\./, '');
    if (/youtu/.test(h)) return 'YouTube';
    if (/spotify/.test(h)) return 'Spotify';
    if (/soundcloud/.test(h)) return 'SoundCloud';
    if (/apple/.test(h)) return 'Apple Music';
    if (/bandcamp/.test(h)) return 'Bandcamp';
    if (/vimeo/.test(h)) return 'Vimeo';
    return h;
  } catch {
    return 'Link';
  }
}

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------

export function buildConcertPrograms(
  repertoire: RepertoirePiece[],
  loadedDocs: Map<string, LoadedConcertDoc>
): ConcertProgram[] {
  const concertMap = new Map<string, { id: string; title: string; pieces: RepertoirePiece[] }>();
  for (const piece of repertoire) {
    const id = piece.concertId || piece.folderId;
    const title = piece.concertTitle || piece.title;
    const entry = concertMap.get(id) ?? { id, title, pieces: [] };
    entry.pieces.push(piece);
    concertMap.set(id, entry);
  }

  return Array.from(concertMap.values()).map((concert) =>
    buildSingleProgram(concert.id, concert.title, concert.pieces, loadedDocs)
  );
}

function buildSingleProgram(
  concertId: string,
  concertTitle: string,
  pieces: RepertoirePiece[],
  loadedDocs: Map<string, LoadedConcertDoc>
): ConcertProgram {
  // 1. Collect director docs + group media files into pieces
  const docFiles: DriveMusicFile[] = [];
  const groupsById = new Map<string, PieceGroup>();
  const newGroup = (
    id: string,
    folderTitle?: string,
    prefixNum: number | null = null,
    folderId?: string
  ): PieceGroup => ({
    id,
    folderTitle,
    folderId,
    prefixNum,
    files: [],
    keys: [],
    matchPos: null,
    recordings: [],
    recordingKeys: new Set(),
    notes: [],
    noteKeys: new Set(),
  });

  for (const piece of pieces) {
    for (const f of piece.files) {
      if (f.isDoc && !docFiles.some((d) => d.id === f.id)) docFiles.push(f);
    }
    const media = piece.files.filter((f) => !f.isDoc);
    if (media.length === 0) continue;

    if (!isRootCollection(piece, concertId, concertTitle)) {
      const g =
        groupsById.get(piece.folderId) ??
        newGroup(piece.folderId, piece.title, null, piece.folderId);
      for (const variant of extractNameVariants(piece.title)) {
        addKey(g, keyTokens(variant));
      }
      for (const f of media) {
        g.files.push(f);
        for (const variant of extractNameVariants(f.name)) {
          addKey(g, keyTokens(variant));
        }
      }
      groupsById.set(g.id, g);
      continue;
    }

    for (const f of media) {
      const prefix = NUM_PREFIX_RE.exec(f.name);
      const key = keyTokens(f.name);
      const gid = prefix
        ? `n:${concertId}:${Number(prefix[1])}`
        : `k:${concertId}:${key.slice(0, 3).join(' ') || f.id}`;
      const g = groupsById.get(gid) ?? newGroup(gid, undefined, prefix ? Number(prefix[1]) : null);
      g.files.push(f);
      for (const variant of extractNameVariants(f.name)) {
        addKey(g, keyTokens(variant));
      }
      groupsById.set(gid, g);
    }
  }

  let groups = Array.from(groupsById.values());

  // 2. Index docs and choose the concert-order doc
  const docs = docFiles
    .map((file) => ({ file, loaded: loadedDocs.get(file.id) }))
    .filter((d): d is { file: DriveMusicFile; loaded: LoadedConcertDoc } => Boolean(d.loaded))
    .map((d) => ({ ...d, index: indexDoc(d.loaded.html) }));

  let orderDoc: (typeof docs)[number] | null = null;
  let orderDocScore = 0;
  for (const d of docs) {
    const matched = groups.filter((g) => g.keys.some((k) => findKey(d.index.hay, k))).length;
    const head = `${d.loaded.title} ${stripTagsToText(d.loaded.html).slice(0, 400)}`;
    const orderish = /\b(order|program|set ?list|running order|final|transitions)\b/i.test(head);
    const score = matched + (orderish ? 1000 : 0);
    if ((matched >= 1 || orderish) && score > orderDocScore) {
      orderDoc = d;
      orderDocScore = score;
    }
  }

  // 3. Position each piece by its appearance in the concert order doc
  const titleOverrides = new Map<string, { title: string; rest: string }>();
  if (orderDoc) {
    const programEntries = extractProgramEntriesFromUnits(orderDoc.index.units);
    if (programEntries && programEntries.length >= 2) {
      const claimedGroupIds = new Set<string>();
      const orderedGroups: PieceGroup[] = [];

      for (const e of programEntries) {
        const entryTokens = toks(`${e.title} ${e.subtitle}`);
        let bestGroup: PieceGroup | null = null;
        let bestScore = 0;

        for (const g of groups) {
          if (claimedGroupIds.has(g.id)) continue;
          const score = matchScore(entryTokens, g.keys);
          if (score > bestScore) {
            bestScore = score;
            bestGroup = g;
          }
        }

        if (bestGroup && bestScore >= 5) {
          claimedGroupIds.add(bestGroup.id);
          bestGroup.matchPos = e.order;
          bestGroup.prefixNum = e.order;
          titleOverrides.set(bestGroup.id, { title: e.title, rest: e.subtitle });

          // Merge any secondary files/parts in the folder matching the same piece (e.g. percussion part)
          for (const other of groups) {
            if (claimedGroupIds.has(other.id)) continue;
            const otherScore = matchScore(entryTokens, other.keys);
            if (otherScore >= 20) {
              claimedGroupIds.add(other.id);
              bestGroup.files.push(...other.files);
              for (const k of other.keys) addKey(bestGroup, k);
            }
          }

          orderedGroups.push(bestGroup);
        } else {
          // Congregational carol or unuploaded score: clean placeholder in the exact program slot
          const synthGroup = newGroup(`doc-entry:${concertId}:${e.order}`, e.title, e.order);
          synthGroup.matchPos = e.order;
          titleOverrides.set(synthGroup.id, { title: e.title, rest: e.subtitle });
          for (const variant of extractNameVariants(e.title)) {
            addKey(synthGroup, keyTokens(variant));
          }
          orderedGroups.push(synthGroup);
        }
      }

      // Any remaining media files that were not part of the concert order document
      const unassigned = groups.filter((g) => !claimedGroupIds.has(g.id));
      groups = [...orderedGroups, ...unassigned];
    } else {
      const { hay, unitOf, units } = orderDoc.index;
      for (const g of groups) {
        let best: KeyMatch | null = null;
        for (const key of g.keys) {
          const m = findKey(hay, key);
          if (m && (!best || m.score > best.score || (m.score === best.score && m.pos < best.pos))) {
            best = m;
          }
        }
        if (!best) continue;
        g.matchPos = best.pos;
        const unit = units[unitOf[best.pos]];
        if (unit) {
          const numMatch = /^\s*(\d{1,3})\s*[.)]/.exec(unit.text);
          if (numMatch) {
            g.prefixNum = Number(numMatch[1]);
          }
          if (best.pos - unit.tokStart <= 6 && unit.text.length <= 220) {
            const line = splitProgramLine(unit.text);
            if (line.title.length >= 3 && line.title.length <= 70) titleOverrides.set(g.id, line);
          }
        }
      }

      // Merge groups that resolve to the same concert-order line (e.g. "Aer Enim w/ markings" + "Aer Enim percussion")
      const byPos = new Map<number, PieceGroup>();
      const merged: PieceGroup[] = [];
      for (const g of groups) {
        if (g.matchPos === null) {
          merged.push(g);
          continue;
        }
        const existing = byPos.get(g.matchPos);
        if (existing) {
          existing.files.push(...g.files);
          for (const k of g.keys) addKey(existing, k);
        } else {
          byPos.set(g.matchPos, g);
          merged.push(g);
        }
      }

      groups = merged;
    }
  }

  // 4. Attach reference recordings to the piece they belong to
  const unassignedRecordings: ProgramRecording[] = [];
  const unassignedKeys = new Set<string>();

  for (const d of docs) {
    let activePiece: PieceGroup | null = null;
    let linesSincePiece = 999;

    for (const unit of d.index.units) {
      linesSincePiece++;

      const own = ownText(unit.html);
      const hasOwnText = own.replace(/[^a-z0-9]/gi, '').length >= 3;
      const ownGroup = hasOwnText && own.length <= 220 ? bestGroupInTokens(toks(own), groups) : null;

      const anchors = new Map<string, string[]>();
      let firstAnchorIndex = -1;
      for (const m of unit.html.matchAll(ANCHOR_RE)) {
        const href = decodeHtmlEntities(m[1]).trim();
        if (!/^https?:/i.test(href)) continue;
        if (firstAnchorIndex < 0) firstAnchorIndex = m.index ?? 0;
        const parts = anchors.get(href) ?? [];
        const t = stripTagsToText(m[2]);
        if (t && !looksLikeUrlText(t)) parts.push(t);
        anchors.set(href, parts);
      }
      // Bare pasted URLs that weren't hyperlinked
      for (const m of stripTagsToText(unit.html.replace(ANCHOR_RE, ' ')).matchAll(URL_RE)) {
        if (!anchors.has(m[0])) anchors.set(m[0], []);
      }

      const beforeText =
        firstAnchorIndex > 0 ? plainWithoutUrls(unit.html.slice(0, firstAnchorIndex)) : '';
      const beforeGroup = beforeText ? bestGroupInTokens(toks(beforeText), groups) : null;

      // A line that looks like a piece title / musical work line (even if not in this concert)
      const isPossiblePieceHeader =
        hasOwnText &&
        own.length <= 160 &&
        (/\s+[-–—]\s+/.test(own) || DURATION_RE.test(own));

      // Update active piece tracking (only valid on same line or immediate next line)
      if (ownGroup) {
        activePiece = ownGroup;
        linesSincePiece = 0;
      } else if (beforeGroup) {
        activePiece = beforeGroup;
        linesSincePiece = 0;
      } else if (
        isPossiblePieceHeader ||
        STOP_RE.test(own) ||
        TOTAL_TIME_RE.test(own) ||
        /^[—–\-\s_*]{3,}$/.test(own) ||
        linesSincePiece > 1 ||
        /^(the verse theme|narrator|part\s+[ivx\d]+|[ivx\d]+\s*[:.]|musical mood|congregation|carol\b|brainstorm)/i.test(
          own
        )
      ) {
        activePiece = null;
      }

      for (const [href, parts] of anchors) {
        const yt = parseYouTubeUrl(href);
        const isAudioHost = OTHER_AUDIO_HOST_RE.test(href);
        if (!(yt.isYouTube && yt.embedUrl) && !isAudioHost) continue;

        const anchorText = parts.join(' ').replace(/\s+/g, ' ').trim();
        const anchorGroup = anchorText ? bestGroupInTokens(toks(anchorText), groups) : null;

        // Skip article footnote citations like "[1]", "[2]", "1", "2" inside long prose (> 80 chars)
        const isCitationNumber = /^(?:\[\d+\]|\d+)$/.test(anchorText);
        if (isCitationNumber && own.length > 80) continue;

        // Target: explicit anchor/before/own match, OR immediate activePiece (same line or immediate next line)
        const isBareUrl = !anchorText || looksLikeUrlText(anchorText);
        const target =
          anchorGroup ??
          beforeGroup ??
          ownGroup ??
          (isBareUrl && linesSincePiece <= 1 ? activePiece : null);
        const dedupeKey = yt.embedUrl ?? href;

        if (!target) {
          if (!unassignedKeys.has(dedupeKey)) {
            unassignedKeys.add(dedupeKey);
            unassignedRecordings.push({
              url: href,
              label: anchorText ? anchorText.slice(0, 80) : '',
              embedUrl: yt.embedUrl,
              videoId: yt.videoId,
              isYouTube: yt.isYouTube,
              host: hostLabel(href),
            });
          }
          continue;
        }

        if (target.recordingKeys.has(dedupeKey)) continue;
        target.recordingKeys.add(dedupeKey);

        const isGeneric =
          !anchorText ||
          looksLikeUrlText(anchorText) ||
          /^(youtube|watch|listen|recording|reference|reference video|video|audio|link|here|click here|\d+)$/i.test(
            anchorText
          );
        const descriptive = anchorText && anchorGroup !== target && !isGeneric;
        const recIndex = target.recordings.length + 1;
        const finalLabel = descriptive
          ? anchorText.slice(0, 80)
          : target.recordings.length === 0
            ? 'Reference Track'
            : `Reference ${recIndex}`;

        target.recordings.push({
          url: href,
          label: finalLabel,
          embedUrl: yt.embedUrl,
          videoId: yt.videoId,
          isYouTube: yt.isYouTube,
          host: hostLabel(href),
        });
      }
    }
  }

  // 5. Attach director's notes sections (part assignments, repeats, style) to each piece
  const notesDocs = docs.filter((d) => !(d === orderDoc && docs.length > 1));
  for (const d of notesDocs) {
    let cur: { group: PieceGroup; mode: 'bold' | 'plain' } | null = null;
    const push = (g: PieceGroup, blockHtml: string) => {
      const k = normalizeText(stripTagsToText(blockHtml));
      if (!k || g.noteKeys.has(k)) return;
      g.noteKeys.add(k);
      g.notes.push(blockHtml);
    };

    for (const m of d.loaded.html.matchAll(BLOCK_RE)) {
      const blockHtml = m[0];
      const tag = (m[1] || 'hr').toLowerCase();
      if (tag === 'hr') {
        cur = null;
        continue;
      }
      const inner = m[2] ?? '';
      const text = plainWithoutUrls(inner);
      const own = ownText(inner);
      const isPH = tag === 'p' || /^h[1-6]$/.test(tag);
      const isHeading = /^h[1-6]$/.test(tag) || (tag === 'p' && BOLD_START_RE.test(inner));

      if (isPH && (STOP_RE.test(text) || (own.length > 0 && /^[—–\-\s_*]+$/.test(own)))) {
        cur = null;
        continue;
      }

      if (isPH && text.length <= 400) {
        const g = bestGroupInTokens(toks(text).slice(0, 16), groups, 2);
        if (g && (isHeading || (text.length <= 220 && DURATION_RE.test(text)))) {
          cur = { group: g, mode: isHeading ? 'bold' : 'plain' };
          if (!isHeading || own.length > 60) push(g, blockHtml);
          continue;
        }
        if (/^h[1-3]$/.test(tag)) {
          cur = null;
          continue;
        }
      }

      if (!cur) continue;
      const linkOnly = own.replace(/[^a-z0-9]/gi, '').length < 3;
      if (cur.mode === 'plain' && !(tag === 'ul' || tag === 'ol' || linkOnly)) {
        cur = null;
        continue;
      }
      push(cur.group, blockHtml);
    }
  }

  // 6. Order: concert-order doc first, then remaining folder files by number/name
  const titleFor = (g: PieceGroup) => {
    const override = titleOverrides.get(g.id);
    if (override) return override.title;
    if (g.folderTitle) return g.folderTitle.replace(/^\s*\d{1,3}\s*[.)\-—–:]+\s*/, '').trim();
    const pdfs = g.files.filter(
      (f) => f.isPdf && !/guide|instrumental|percussion|parts\b/i.test(f.name)
    );
    const candidates = (pdfs.length ? pdfs : g.files).map((f) => cleanDisplayName(f.name));
    return candidates.sort((a, b) => a.length - b.length)[0] || 'Untitled';
  };

  const ordered = groups
    .filter((g) => g.matchPos !== null)
    .sort((a, b) => (a.matchPos as number) - (b.matchPos as number));
  const unordered = groups
    .filter((g) => g.matchPos === null)
    .sort((a, b) => {
      if (a.prefixNum !== null && b.prefixNum !== null) return a.prefixNum - b.prefixNum;
      if (a.prefixNum !== null) return -1;
      if (b.prefixNum !== null) return 1;
      return titleFor(a).localeCompare(titleFor(b));
    });

  const sortFiles = (files: DriveMusicFile[]) =>
    [...files].sort((a, b) => {
      if (a.isPdf !== b.isPdf) return a.isPdf ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });

  const toPiece = (g: PieceGroup, defaultOrder: number | null): ProgramPiece => ({
    id: g.id,
    title: titleFor(g),
    subtitle: titleOverrides.get(g.id)?.rest ?? '',
    order: g.prefixNum ?? defaultOrder,
    files: sortFiles(g.files),
    recordings: g.recordings,
    notesHtml: g.notes.join('\n'),
    folderId: g.folderId,
  });

  return {
    id: concertId,
    title: concertTitle,
    orderDocTitle: orderDoc ? orderDoc.loaded.title : null,
    docs: docs.map((d) => ({
      file: d.file,
      title: d.loaded.title,
      html: d.loaded.html,
      canExportPdf: d.loaded.canExportPdf,
      isOrderDoc: d === orderDoc,
    })),
    pieces: [
      ...ordered.map((g, i) => toPiece(g, g.prefixNum ?? i + 1)),
      ...unordered.map((g) => toPiece(g, null)),
    ],
    unassignedRecordings,
  };
}

