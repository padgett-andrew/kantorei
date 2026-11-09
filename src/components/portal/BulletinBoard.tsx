import { useState, useMemo } from 'react';
import {
  Archive,
  ExternalLink,
  Mail,
  MessageSquarePlus,
  Music,
  Pin,
  Search,
  Send,
  Terminal,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import type {
  BulletinCategory,
  BulletinMessage,
  RepertoirePiece,
  Singer,
} from '../../types/choir';

interface Props {
  initialMessages: BulletinMessage[];
  currentSinger: Singer;
  roster: Singer[];
  repertoire: RepertoirePiece[];
  canManage: boolean;
}

export interface ParsedLine {
  raw: string;
  trimmed: string;
  isNumberedHeading: boolean;
  numberLabel?: string;
  headingText?: string;
  isDivider: boolean;
  isIndented: boolean;
  matchedPieceTitle?: string;
  mentionsCurrentSinger: boolean;
}

export interface ParsedDispatch {
  lines: ParsedLine[];
  mentionsCurrentSinger: boolean;
  matchedRepertoireTitles: string[];
}

function getSingerMatchTokens(singer: Singer): string[] {
  const parts = singer.name.trim().split(/\s+/);
  const first = parts[0] || '';
  const last = parts[parts.length - 1] || '';
  const tokens = new Set<string>();
  if (first.length >= 3) tokens.add(first.toLowerCase());
  if (first && last) {
    tokens.add(`${first} ${last[0]}`.toLowerCase());
    tokens.add(`${first} ${last.slice(0, 2)}`.toLowerCase());
    tokens.add(singer.name.toLowerCase());
  }
  return Array.from(tokens);
}

function textMentionsSinger(text: string, singer: Singer): boolean {
  const tokens = getSingerMatchTokens(singer);
  const lower = text.toLowerCase();
  for (const token of tokens) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, 'i');
    if (regex.test(lower)) return true;
  }
  return false;
}

function matchPieceFromLine(line: string, repertoire: RepertoirePiece[]): string | undefined {
  const lower = line.toLowerCase();
  for (const piece of repertoire) {
    if (piece.folderId.startsWith('notes-')) continue;
    const baseTitle = piece.title.split('—')[0].trim().toLowerCase();
    if (baseTitle.length >= 5 && lower.includes(baseTitle)) {
      return piece.title;
    }
    const cleanWords = baseTitle.replace(/^(a|the|o)\s+/i, '').trim();
    if (cleanWords.length >= 6 && lower.includes(cleanWords)) {
      return piece.title;
    }
  }
  return undefined;
}

export function formatDispatchBody(
  bodyText: string,
  currentSinger: Singer,
  repertoire: RepertoirePiece[]
): ParsedDispatch {
  const rawLines = bodyText.replace(/\r\n/g, '\n').split('\n');
  const matchedTitlesSet = new Set<string>();
  const mentionsCurrentSinger = textMentionsSinger(bodyText, currentSinger);
  const numberedHeaderRegex = /^\s*(\d+[).]?)\s+(.+)$/;

  const lines: ParsedLine[] = rawLines.map((raw) => {
    const trimmed = raw.trim();
    const matchedPieceTitle = trimmed ? matchPieceFromLine(trimmed, repertoire) : undefined;
    if (matchedPieceTitle) {
      matchedTitlesSet.add(matchedPieceTitle);
    }

    const numberedMatch = numberedHeaderRegex.exec(raw);
    const isDivider = /^--\s*.+\s*--$/.test(trimmed);
    const isIndented = /^\s{4,}/.test(raw) && !numberedMatch;

    return {
      raw,
      trimmed,
      isNumberedHeading: Boolean(numberedMatch),
      numberLabel: numberedMatch ? numberedMatch[1] : undefined,
      headingText: numberedMatch ? numberedMatch[2].trim() : undefined,
      isDivider,
      isIndented,
      matchedPieceTitle,
      mentionsCurrentSinger: trimmed ? textMentionsSinger(trimmed, currentSinger) : false,
    };
  });

  return {
    lines,
    mentionsCurrentSinger,
    matchedRepertoireTitles: Array.from(matchedTitlesSet),
  };
}

function formatCategoryLabel(cat: BulletinCategory): string {
  switch (cat) {
    case 'Rehearsal_Notes':
      return 'Rehearsal Notes';
    case 'Part_Assignments':
      return 'Voicing & Small Groups';
    case 'Logistics':
      return 'Venue & Logistics';
    case 'Discussion':
      return 'Ensemble Thread';
    default:
      return 'Announcement';
  }
}

function formatReadableTimestamp(iso: string): { dateStr: string; timeStr: string } {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { dateStr: iso, timeStr: '' };
    const dateStr = d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'America/Chicago',
    });
    const timeStr = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/Chicago',
    });
    return { dateStr, timeStr };
  } catch {
    return { dateStr: iso, timeStr: '' };
  }
}

export default function BulletinBoard({
  initialMessages,
  currentSinger,
  roster,
  repertoire,
  canManage,
}: Props) {
  const [messages, setMessages] = useState<BulletinMessage[]>(initialMessages);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'MY_MENTIONS' | BulletinCategory>(
    'ALL'
  );
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showBotSetupModal, setShowBotSetupModal] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  // Compose Modal State
  const [draftSubject, setDraftSubject] = useState('');
  const [draftCategory, setDraftCategory] = useState<BulletinCategory>('Rehearsal_Notes');
  const [draftBody, setDraftBody] = useState('');
  const [draftPinned, setDraftPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);

  const enrichedMessages = useMemo(() => {
    return messages.map((msg) => {
      const parsed = formatDispatchBody(msg.bodyText, currentSinger, repertoire);
      const senderRosterMatch = roster.find(
        (s) =>
          s.email.toLowerCase() === msg.fromEmail.toLowerCase() ||
          s.name.toLowerCase() === msg.fromName.toLowerCase()
      );
      return {
        msg,
        parsed,
        senderRole:
          msg.fromName.toLowerCase().includes('adam reinwald')
            ? 'Artistic & Executive Director'
            : msg.fromName.toLowerCase().includes('tony rangel')
            ? 'Assistant Conductor'
            : senderRosterMatch?.role === 'Admin'
            ? 'Managing Director / Board'
            : senderRosterMatch?.role === 'Section_Leader'
            ? `${senderRosterMatch.sectionGroup} Section Leader`
            : senderRosterMatch
            ? `${senderRosterMatch.sectionGroup} · ${senderRosterMatch.voicePart}`
            : 'Kantorei Mailing List',
      };
    });
  }, [messages, currentSinger, repertoire, roster]);

  const myMentionCount = useMemo(
    () => enrichedMessages.filter((item) => item.parsed.mentionsCurrentSinger).length,
    [enrichedMessages]
  );

  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedMessages.filter(({ msg, parsed }) => {
      if (activeCategory === 'MY_MENTIONS' && !parsed.mentionsCurrentSinger) {
        return false;
      }
      if (
        activeCategory !== 'ALL' &&
        activeCategory !== 'MY_MENTIONS' &&
        msg.category !== activeCategory
      ) {
        return false;
      }
      if (!q) return true;
      return (
        msg.subject.toLowerCase().includes(q) ||
        msg.fromName.toLowerCase().includes(q) ||
        msg.bodyText.toLowerCase().includes(q)
      );
    });
  }, [enrichedMessages, activeCategory, searchQuery]);

  async function handleTogglePin(msg: BulletinMessage) {
    if (!canManage || busyId) return;
    setBusyId(msg.id);
    try {
      const res = await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: msg.id, pinned: !msg.pinned }),
      });
      const data = await res.json();
      if (res.ok && data.messages) {
        setMessages(data.messages);
        setFeedbackBanner(
          !msg.pinned
            ? `Pinned "${msg.subject}" to the top of the Singer Portal.`
            : `Unpinned "${msg.subject}".`
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleArchive(msg: BulletinMessage) {
    if (!canManage || busyId) return;
    setBusyId(msg.id);
    try {
      const res = await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: msg.id, status: 'Archived' }),
      });
      const data = await res.json();
      if (res.ok && data.messages) {
        setMessages(data.messages);
        setFeedbackBanner(`Archived "${msg.subject}".`);
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreateDispatch(e: { preventDefault: () => void }) {
    e.preventDefault();
    setComposeError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: draftSubject,
          bodyText: draftBody,
          category: draftCategory,
          pinned: draftPinned,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setComposeError(data.error || 'Could not publish dispatch.');
        return;
      }
      if (data.messages) {
        setMessages(data.messages);
      }
      setDraftSubject('');
      setDraftBody('');
      setDraftPinned(false);
      setShowComposeModal(false);
      setFeedbackBanner('Dispatch published to the ensemble bulletin board.');
    } catch {
      setComposeError('Network error while publishing dispatch.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Mailing List Synchronization Status Bar */}
      <div className="flex flex-col justify-between gap-4 rounded-sm border border-stone-200/90 bg-[#f5efe8]/80 px-5 py-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3.5 sm:items-center">
          <span
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-600 sm:mt-0"
            aria-hidden="true"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-copper-600">
                Mailing List Archive
              </span>
              <span className="text-stone-300" aria-hidden="true">
                ·
              </span>
              <code className="rounded-xs bg-white/80 px-1.5 py-0.5 text-xs font-medium text-navy-950 ring-1 ring-stone-200/90">
                singers@kantorei.net
              </code>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-stone-600">
              Messages sent to <span className="font-medium text-stone-800">singers@kantorei.net</span> are automatically archived here with direct links to referenced scores in the Music Library.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          <a
            href="mailto:singers@kantorei.net"
            className="inline-flex items-center gap-1.5 rounded-sm border border-stone-300 bg-white px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-950 transition hover:border-copper-400 hover:text-copper-600"
          >
            <Mail className="h-3.5 w-3.5 text-copper-600" />
            <span>Email List</span>
          </a>

          {canManage && (
            <>
              <button
                type="button"
                onClick={() => setShowBotSetupModal(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-stone-300 bg-white px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-700 transition hover:border-navy-950 hover:text-navy-950"
              >
                <Terminal className="h-3.5 w-3.5 text-copper-600" />
                <span>Bot Setup</span>
              </button>
              <button
                type="button"
                onClick={() => setShowComposeModal(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm bg-navy-950 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-ivory-50 transition hover:bg-navy-900"
              >
                <MessageSquarePlus className="h-3.5 w-3.5 text-copper-400" />
                <span>Post Dispatch</span>
              </button>
            </>
          )}
        </div>
      </div>

      {feedbackBanner && (
        <div className="flex items-center justify-between border-l-2 border-copper-500 bg-[#f5efe8] px-4 py-3 text-xs text-stone-800">
          <span>{feedbackBanner}</span>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="cursor-pointer text-stone-500 hover:text-navy-950"
            aria-label="Dismiss notice"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col justify-between gap-4 border-b border-stone-200/90 pb-4 lg:flex-row lg:items-center">
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="tablist"
          aria-label="Filter dispatches"
        >
          {[
            { id: 'ALL', label: `All Dispatches (${messages.length})` },
            {
              id: 'MY_MENTIONS',
              label: `Mentions ${currentSinger.name.split(' ')[0]} (${myMentionCount})`,
              highlight: myMentionCount > 0,
            },
            { id: 'Rehearsal_Notes', label: 'Rehearsal Notes' },
            { id: 'Logistics', label: 'Venue & Logistics' },
            { id: 'Announcement', label: 'Announcements' },
          ].map((tab) => {
            const active = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() =>
                  setActiveCategory(tab.id as 'ALL' | 'MY_MENTIONS' | BulletinCategory)
                }
                className={`cursor-pointer rounded-sm px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition ${
                  active
                    ? 'bg-navy-950 text-ivory-50'
                    : tab.highlight
                    ? 'border border-copper-300/90 bg-[#f9efe8] text-copper-600 hover:bg-copper-200/50'
                    : 'text-stone-600 hover:bg-[#f5efe8] hover:text-navy-950'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-72">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-stone-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pieces, names, or notes..."
            aria-label="Search ensemble dispatches"
            className="w-full rounded-sm border border-stone-300/90 bg-white py-1.5 pr-8 pl-9 text-xs text-navy-950 placeholder:text-stone-400 focus:border-copper-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer text-stone-400 hover:text-navy-950"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Dispatches Feed */}
      {filteredMessages.length === 0 ? (
        <div className="rounded-sm border border-stone-200/90 bg-white px-6 py-14 text-center">
          <p className="font-editorial text-2xl text-navy-950">No matching dispatches found</p>
          <p className="mt-1.5 text-xs text-stone-500">
            Try clearing your search filter or viewing all messages from singers@kantorei.net.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredMessages.map(({ msg, parsed, senderRole }) => {
            const { dateStr, timeStr } = formatReadableTimestamp(msg.timestamp);
            const initials =
              msg.fromName
                .split(' ')
                .filter(Boolean)
                .map((p) => p[0])
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'K';

            const replySubject = msg.subject.toLowerCase().startsWith('re:')
              ? msg.subject
              : `Re: ${msg.subject}`;

            return (
              <article
                key={msg.id}
                id={msg.id}
                className={`rounded-sm border bg-white transition ${
                  msg.pinned
                    ? 'border-t-2 border-stone-300/90 border-t-navy-950 shadow-xs'
                    : 'border-stone-200/90'
                }`}
              >
                {/* Dispatch Header Bar */}
                <header className="border-b border-stone-200/80 bg-[#FAF7F2]/65 px-5 py-5 sm:px-8 sm:py-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {msg.pinned && (
                        <span className="inline-flex items-center gap-1 rounded-xs bg-navy-950 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ivory-50">
                          <Pin className="h-3 w-3 text-copper-400" />
                          <span>Pinned</span>
                        </span>
                      )}
                      <span className="rounded-xs border border-stone-300/80 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-copper-600">
                        {formatCategoryLabel(msg.category)}
                      </span>
                      {parsed.mentionsCurrentSinger && (
                        <span className="inline-flex items-center gap-1 rounded-xs border border-copper-300 bg-[#f9efe8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-copper-600">
                          <UserCheck className="h-3 w-3" />
                          <span>Mentions {currentSinger.name.split(' ')[0]}</span>
                        </span>
                      )}
                    </div>

                    <time
                      dateTime={msg.timestamp}
                      className="text-xs font-medium tabular-nums text-stone-500"
                    >
                      {dateStr}
                      {timeStr ? ` · ${timeStr}` : ''}
                    </time>
                  </div>

                  <h2 className="mt-3 font-editorial text-2xl font-medium leading-snug tracking-tight text-navy-950 sm:text-3xl">
                    {msg.subject}
                  </h2>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pt-1">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f9efe8] text-xs font-semibold text-copper-600 ring-1 ring-copper-200">
                        {initials}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-navy-950">
                            {msg.fromName}
                          </span>
                          <span className="text-xs text-stone-500">· {senderRole}</span>
                        </div>
                        <p className="text-[11px] text-stone-500">
                          via <span className="font-medium text-stone-700">singers@kantorei.net</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </header>

                {/* Clean Editorial Message Body */}
                <div className="px-5 py-6 sm:px-8 sm:py-8">
                  <div className="max-w-3xl space-y-1 text-sm leading-relaxed text-stone-800 sm:text-[15px]">
                    {parsed.lines.map((line, idx) => {
                      if (!line.trimmed) {
                        return <div key={idx} className="h-3" aria-hidden="true" />;
                      }

                      if (line.isDivider) {
                        return (
                          <div
                            key={idx}
                            className="my-2 pl-4 sm:pl-8 text-xs font-semibold uppercase tracking-[0.2em] text-copper-600"
                          >
                            {line.trimmed}
                          </div>
                        );
                      }

                      if (line.isNumberedHeading) {
                        return (
                          <div
                            key={idx}
                            className="pt-3 pb-1 flex flex-wrap items-baseline gap-2 font-medium text-navy-950"
                          >
                            <span className="font-semibold text-copper-600">
                              {line.numberLabel}
                            </span>
                            <span className="font-semibold text-navy-950">
                              {line.headingText}
                            </span>
                            {line.matchedPieceTitle && (
                              <a
                                href="/portal/music"
                                className="inline-flex items-center gap-1 rounded-xs border border-copper-300/80 bg-[#f9efe8] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-copper-600 transition hover:border-copper-500 hover:bg-copper-200/50"
                              >
                                <Music className="h-2.5 w-2.5" />
                                <span>Score ↗</span>
                              </a>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={idx}
                          className={`flex flex-wrap items-baseline gap-x-2.5 gap-y-1 ${
                            line.isIndented ? 'pl-4 sm:pl-8' : ''
                          } ${
                            line.mentionsCurrentSinger
                              ? 'rounded-xs border-l-2 border-copper-500 bg-[#f9efe8]/60 py-0.5 pr-2 pl-3 font-medium text-navy-950'
                              : ''
                          }`}
                        >
                          <span className="whitespace-pre-wrap">{line.trimmed}</span>
                          {line.matchedPieceTitle && (
                            <a
                              href="/portal/music"
                              className="inline-flex items-center gap-1 rounded-xs border border-stone-200 bg-[#FAF7F2] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-copper-600 transition hover:border-copper-400 hover:bg-[#f9efe8]"
                            >
                              <Music className="h-2.5 w-2.5" />
                              <span>Score ↗</span>
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Referenced Scores Footer Bar */}
                  {parsed.matchedRepertoireTitles.length > 0 && (
                    <div className="mt-7 border-t border-stone-200/80 pt-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                        Referenced Repertoire in Music Library
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {parsed.matchedRepertoireTitles.map((title) => (
                          <a
                            key={title}
                            href="/portal/music"
                            className="inline-flex items-center gap-1.5 rounded-sm border border-stone-200/90 bg-[#FAF7F2] px-3 py-1.5 text-xs font-medium text-navy-950 transition hover:border-copper-400 hover:bg-[#f9efe8] hover:text-copper-600"
                          >
                            <Music className="h-3.5 w-3.5 text-copper-600" />
                            <span>{title}</span>
                            <span aria-hidden="true" className="text-stone-400">
                              ↗
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Dispatch Footer Actions */}
                <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200/80 bg-[#FAF7F2]/50 px-5 py-3.5 sm:px-8">
                  <div className="flex flex-wrap items-center gap-4">
                    <a
                      href={`mailto:${msg.fromEmail}?subject=${encodeURIComponent(replySubject)}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-navy-950 transition hover:text-copper-600"
                    >
                      <Mail className="h-3.5 w-3.5 text-copper-600" />
                      <span>Reply to {msg.fromName.split(' ')[0]}</span>
                    </a>
                    <span className="text-stone-300" aria-hidden="true">
                      ·
                    </span>
                    <a
                      href={`mailto:singers@kantorei.net?subject=${encodeURIComponent(replySubject)}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-stone-600 transition hover:text-navy-950"
                    >
                      <Users className="h-3.5 w-3.5 text-stone-400" />
                      <span>Reply All to Choir</span>
                    </a>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={busyId === msg.id}
                        onClick={() => handleTogglePin(msg)}
                        className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-600 transition hover:text-copper-600 disabled:opacity-50"
                      >
                        <Pin className="h-3.5 w-3.5" />
                        <span>{msg.pinned ? 'Unpin' : 'Pin to Top'}</span>
                      </button>
                      <span className="text-stone-300" aria-hidden="true">
                        ·
                      </span>
                      <button
                        type="button"
                        disabled={busyId === msg.id}
                        onClick={() => handleArchive(msg)}
                        className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500 transition hover:text-rose-700 disabled:opacity-50"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        <span>Archive</span>
                      </button>
                    </div>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal 1: Post New Dispatch (Leaders & Admins) */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-navy-950/60 backdrop-blur-xs"
            onClick={() => setShowComposeModal(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="compose-dispatch-title"
            className="relative z-10 w-full max-w-2xl rounded-sm border border-stone-200 bg-[#FAF7F2] p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between border-b border-stone-200/90 pb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-copper-600">
                  Ensemble Bulletin Board
                </p>
                <h2
                  id="compose-dispatch-title"
                  className="mt-1 font-editorial text-2xl font-medium text-navy-950 sm:text-3xl"
                >
                  Post Ensemble Dispatch
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowComposeModal(false)}
                className="cursor-pointer rounded-sm p-1.5 text-stone-400 hover:bg-stone-200/60 hover:text-navy-950"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDispatch} className="mt-5 space-y-4">
              {composeError && (
                <div className="border-l-2 border-rose-500 bg-rose-50 px-4 py-2.5 text-xs text-rose-900">
                  {composeError}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="dispatch-subject"
                    className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-700"
                  >
                    Subject Line
                  </label>
                  <input
                    id="dispatch-subject"
                    type="text"
                    required
                    value={draftSubject}
                    onChange={(e) => setDraftSubject(e.target.value)}
                    placeholder="e.g., Quick notes for a Saturday — Sunday Rehearsal Notes"
                    className="mt-1.5 w-full rounded-sm border border-stone-300 bg-white px-3.5 py-2 text-sm text-navy-950 focus:border-copper-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="dispatch-category"
                    className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-700"
                  >
                    Category
                  </label>
                  <select
                    id="dispatch-category"
                    value={draftCategory}
                    onChange={(e) => setDraftCategory(e.target.value as BulletinCategory)}
                    className="mt-1.5 w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm text-navy-950 focus:border-copper-500 focus:outline-none"
                  >
                    <option value="Rehearsal_Notes">Rehearsal Notes</option>
                    <option value="Part_Assignments">Voicing &amp; Small Groups</option>
                    <option value="Logistics">Venue &amp; Logistics</option>
                    <option value="Announcement">Announcement</option>
                    <option value="Discussion">Ensemble Thread</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="dispatch-body"
                  className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-700"
                >
                  Message Body
                </label>
                <textarea
                  id="dispatch-body"
                  required
                  rows={10}
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  placeholder="Paste or write your message to the ensemble..."
                  className="mt-1.5 w-full rounded-sm border border-stone-300 bg-white p-3.5 font-sans text-sm leading-relaxed text-navy-950 focus:border-copper-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-stone-700">
                  <input
                    type="checkbox"
                    checked={draftPinned}
                    onChange={(e) => setDraftPinned(e.target.checked)}
                    className="h-4 w-4 rounded-xs border-stone-300 text-navy-950 focus:ring-copper-500"
                  />
                  <span>Pin to top of Bulletin Board &amp; Portal Overview</span>
                </label>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowComposeModal(false)}
                    className="cursor-pointer rounded-sm border border-stone-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-700 hover:bg-stone-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm bg-navy-950 px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-ivory-50 transition hover:bg-navy-900 disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5 text-copper-400" />
                    <span>{isSubmitting ? 'Publishing...' : 'Publish Dispatch'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Bot Account & Mailing List Bridge Setup Guide */}
      {showBotSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-navy-950/60 backdrop-blur-xs"
            onClick={() => setShowBotSetupModal(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bot-setup-title"
            className="relative z-10 max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-sm border border-stone-200 bg-[#FAF7F2] p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between border-b border-stone-200/90 pb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-copper-600">
                  Zero-Database Email Ingestion
                </p>
                <h2
                  id="bot-setup-title"
                  className="mt-1 font-editorial text-2xl font-medium text-navy-950 sm:text-3xl"
                >
                  Connecting <code className="text-xl">singers@kantorei.net</code> Bot
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowBotSetupModal(false)}
                className="cursor-pointer rounded-sm p-1.5 text-stone-400 hover:bg-stone-200/60 hover:text-navy-950"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-5 text-xs leading-relaxed text-stone-700 sm:text-sm">
              <p>
                The portal includes a ready-to-use webhook at{' '}
                <code className="rounded-xs bg-white px-1.5 py-0.5 font-mono text-xs text-navy-950 ring-1 ring-stone-200">
                  POST /api/webhooks/incoming-email
                </code>{' '}
                that automatically parses emails sent to{' '}
                <strong className="font-semibold text-navy-950">singers@kantorei.net</strong> and
                appends them to the <strong className="font-semibold text-navy-950">Messages</strong>{' '}
                tab in the Choir Google Sheet.
              </p>

              <div className="space-y-3 rounded-sm border border-stone-200/90 bg-white p-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-copper-600">
                  3-Step Setup (Cloudflare Email Routing or Google Groups)
                </h3>
                <ol className="list-decimal space-y-2.5 pl-5 text-xs sm:text-sm">
                  <li>
                    <strong>Create the Bot Address:</strong> In Cloudflare Dashboard →{' '}
                    <em>Email → Email Routing → Email Workers</em>, route{' '}
                    <code className="rounded-xs bg-[#f5efe8] px-1.5 py-0.5 font-mono text-xs text-navy-950">
                      bulletin-bot@kantorei.net
                    </code>{' '}
                    to forward parsed JSON (<code className="font-mono text-xs">from</code>,{' '}
                    <code className="font-mono text-xs">subject</code>,{' '}
                    <code className="font-mono text-xs">text</code>) to{' '}
                    <code className="rounded-xs bg-[#f5efe8] px-1.5 py-0.5 font-mono text-xs text-navy-950">
                      https://kantorei.net/api/webhooks/incoming-email
                    </code>{' '}
                    with header{' '}
                    <code className="font-mono text-xs">
                      x-kantorei-bot-secret: YOUR_SECRET
                    </code>
                    .
                  </li>
                  <li>
                    <strong>Add to Mailing List:</strong> Add{' '}
                    <code className="rounded-xs bg-[#f5efe8] px-1.5 py-0.5 font-mono text-xs text-navy-950">
                      bulletin-bot@kantorei.net
                    </code>{' '}
                    as a member of <strong className="text-navy-950">singers@kantorei.net</strong>{' '}
                    in Google Groups (set delivery to <em>All Email</em>).
                  </li>
                  <li>
                    <strong>Zero Maintenance Moderation:</strong> Any email sent to the list appears
                    on this board within seconds. Board members can pin or archive posts right from
                    this page or edit rows directly in the Choir Sheet’s{' '}
                    <code className="font-mono text-xs">Messages</code> tab.
                  </li>
                </ol>
              </div>

              <div className="flex items-center justify-between border-t border-stone-200 pt-4">
                <a
                  href="/portal/handbook?doc=admin-guide"
                  className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-copper-600 hover:text-navy-950"
                >
                  <span>Read Full Admin Operations Guide</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setShowBotSetupModal(false)}
                  className="cursor-pointer rounded-sm bg-navy-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-ivory-50 hover:bg-navy-900"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
