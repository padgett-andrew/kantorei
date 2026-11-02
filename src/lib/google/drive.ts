import type {
  DriveMusicFile,
  PortalConfig,
  RepertoirePiece,
} from '../../types/choir';
import { cachedFetchJson } from '../cache';
import { convertDocxToHtml, convertPlainTextToHtml } from '../docx';
import { extractGoogleId, hasGoogleServiceAccount } from '../env';
import { DEFAULT_HANDBOOK_HTML, DEFAULT_STRATEGIC_PLAN_HTML } from '../handbook-content';
import { sanitizeHandbookHtml } from '../sanitize';
import { NotFoundError, getGoogleAccessToken } from './client';
import { demoStore } from './demo-store';
import { getConcerts, getPortalConfig } from './sheets';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  shortcutDetails?: {
    targetId?: string;
    targetMimeType?: string;
  };
}

export function resolveDriveItem(item: DriveFileItem): {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
} {
  if (
    item.mimeType === 'application/vnd.google-apps.shortcut' &&
    item.shortcutDetails?.targetId &&
    item.shortcutDetails?.targetMimeType
  ) {
    return {
      id: item.shortcutDetails.targetId,
      name: item.name,
      mimeType: item.shortcutDetails.targetMimeType,
      size: item.size,
    };
  }
  return item;
}

export function isSupportedDocItem(mimeType: string, name: string): {
  isDoc: boolean;
  canExportPdf: boolean;
} {
  if (mimeType === 'application/vnd.google-apps.document') {
    return { isDoc: true, canExportPdf: true };
  }
  const lower = name.toLowerCase();
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword' ||
    mimeType === 'text/plain' ||
    mimeType === 'application/rtf' ||
    /\.(docx|doc|txt|rtf)$/i.test(lower)
  ) {
    return { isDoc: true, canExportPdf: false };
  }
  return { isDoc: false, canExportPdf: false };
}

export function toDriveMusicFile(
  rawItem: DriveFileItem,
  prefixLabel?: string
): DriveMusicFile | null {
  const f = resolveDriveItem(rawItem);
  const isPdf = f.mimeType === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
  const isAudio =
    f.mimeType.startsWith('audio/') || /\.(mp3|m4a|wav|aac|ogg|flac)$/i.test(f.name);
  const docInfo = isSupportedDocItem(f.mimeType, f.name);
  if (!isPdf && !isAudio && !docInfo.isDoc) return null;

  return {
    id: f.id,
    name: prefixLabel ? `${prefixLabel} — ${f.name}` : f.name,
    mimeType: f.mimeType,
    sizeBytes: f.size ? Number(f.size) : undefined,
    isPdf,
    isAudio,
    isDoc: docInfo.isDoc || undefined,
    canExportPdf: docInfo.canExportPdf || undefined,
  };
}

export async function driveListQuery(query: string, locals?: App.Locals): Promise<DriveFileItem[]> {
  const token = await getGoogleAccessToken(locals);
  const params = new URLSearchParams({
    q: query,
    fields: 'files(id,name,mimeType,size,shortcutDetails(targetId,targetMimeType))',
    orderBy: 'name',
    pageSize: '200',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Drive list failed (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { files?: DriveFileItem[] };
  return data.files ?? [];
}

export interface ConfiguredFolderTarget {
  folderId: string;
  explicitLabel?: string;
}

export function parseRepertoireFolderTargets(config: PortalConfig): ConfiguredFolderTarget[] {
  const seen = new Set<string>();
  const targets: ConfiguredFolderTarget[] = [];

  function addRawEntries(rawValue: string, fallbackLabel?: string) {
    const entries = rawValue
      .split(/\s*(?:\||;|\r?\n|,)\s*/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const entry of entries) {
      const colonIdx = entry.indexOf(':');
      let label = fallbackLabel;
      let targetPart = entry;

      if (colonIdx > 0) {
        const prefix = entry.slice(0, colonIdx).trim();
        const rest = entry.slice(colonIdx + 1).trim();
        if (!/^https?$/i.test(prefix) && rest.length >= 10) {
          label = prefix;
          targetPart = rest;
        }
      }

      const folderId = extractGoogleId(targetPart);
      if (
        !folderId ||
        folderId === 'DEMO' ||
        folderId.startsWith('PASTE_') ||
        seen.has(folderId)
      ) {
        continue;
      }
      seen.add(folderId);
      targets.push({ folderId, explicitLabel: label });
    }
  }

  if (config.Repertoire_Drive_Folder_ID) {
    addRawEntries(config.Repertoire_Drive_Folder_ID);
  }

  for (const [key, val] of Object.entries(config)) {
    if (/^Repertoire_Folder_/i.test(key) && val) {
      const derivedLabel = key
        .replace(/^Repertoire_Folder_/i, '')
        .replace(/_/g, ' ')
        .trim();
      addRawEntries(val, derivedLabel || undefined);
    }
  }

  return targets;
}

export async function resolveFolderConcertName(
  target: ConfiguredFolderTarget,
  fallbackConcertTitle: string,
  locals?: App.Locals
): Promise<string> {
  if (target.explicitLabel) return target.explicitLabel;
  try {
    const meta = await getDriveFileMetadata(target.folderId, locals);
    const cleaned = meta.name
      .replace(/\s+(?:music\s+files|sheet\s+music|music\s+folder|repertoire\s+files)$/i, '')
      .trim();
    if (cleaned && !/^(music|scores|repertoire|folder|shared)$/i.test(cleaned)) {
      return cleaned;
    }
  } catch {
    // Ignore metadata read failure and fall back cleanly
  }
  return fallbackConcertTitle;
}

export async function scanConcertRootFolder(
  target: ConfiguredFolderTarget,
  fallbackConcertTitle: string,
  totalRoots: number,
  locals?: App.Locals
): Promise<RepertoirePiece[]> {
  const concertTitle = await resolveFolderConcertName(target, fallbackConcertTitle, locals);
  const rootFolderId = target.folderId;
  const escapedRoot = rootFolderId.replace(/'/g, "\\'");
  const rootChildren = await driveListQuery(
    `'${escapedRoot}' in parents and trashed = false`,
    locals
  );

  const rootMusicFiles: DriveMusicFile[] = [];
  const subfolders: { id: string; name: string }[] = [];

  for (const raw of rootChildren) {
    const resolved = resolveDriveItem(raw);
    if (resolved.mimeType === 'application/vnd.google-apps.folder') {
      subfolders.push({ id: resolved.id, name: resolved.name });
    } else {
      const musicFile = toDriveMusicFile(raw);
      if (musicFile) rootMusicFiles.push(musicFile);
    }
  }

  const subfolderPieces = await Promise.all(
    subfolders.map(async (folder): Promise<RepertoirePiece[]> => {
      const escapedFolder = folder.id.replace(/'/g, "\\'");
      const children = await driveListQuery(
        `'${escapedFolder}' in parents and trashed = false`,
        locals
      );

      const directFiles: DriveMusicFile[] = [];
      const nestedFolders: { id: string; name: string }[] = [];

      for (const child of children) {
        const resolvedChild = resolveDriveItem(child);
        if (resolvedChild.mimeType === 'application/vnd.google-apps.folder') {
          nestedFolders.push({ id: resolvedChild.id, name: resolvedChild.name });
        } else {
          const mf = toDriveMusicFile(child);
          if (mf) directFiles.push(mf);
        }
      }

      if (nestedFolders.length > 0) {
        const nestedResults = await Promise.all(
          nestedFolders.map(async (nf) => {
            const escapedNested = nf.id.replace(/'/g, "\\'");
            const nestedRaw = await driveListQuery(
              `'${escapedNested}' in parents and trashed = false`,
              locals
            );
            return {
              folder: nf,
              files: nestedRaw
                .map((item) => toDriveMusicFile(item))
                .filter((f): f is DriveMusicFile => f !== null),
            };
          })
        );

        if (directFiles.length === 0) {
          const groupTitle = totalRoots === 1 && rootMusicFiles.length === 0 ? folder.name : concertTitle;
          const groupId = totalRoots === 1 && rootMusicFiles.length === 0 ? folder.id : rootFolderId;
          return nestedResults
            .filter((nr) => nr.files.length > 0)
            .map((nr) => ({
              folderId: nr.folder.id,
              title: nr.folder.name,
              concertId: groupId,
              concertTitle: groupTitle,
              files: nr.files,
            }));
        }

        for (const nr of nestedResults) {
          for (const f of nr.files) {
            directFiles.push({
              ...f,
              name: `${nr.folder.name} — ${f.name}`,
            });
          }
        }
      }

      const treatSubfolderAsConcert =
        totalRoots === 1 && rootMusicFiles.length === 0 && directFiles.length > 3;

      return directFiles.length > 0
        ? [
            {
              folderId: folder.id,
              title: folder.name,
              concertId: treatSubfolderAsConcert ? folder.id : rootFolderId,
              concertTitle: treatSubfolderAsConcert ? folder.name : concertTitle,
              files: directFiles,
            },
          ]
        : [];
    })
  );

  const pieces: RepertoirePiece[] = [];
  if (rootMusicFiles.length > 0) {
    pieces.push({
      folderId: rootFolderId,
      title: subfolders.length > 0 ? `${concertTitle} — Scores & Tracks` : concertTitle,
      concertId: rootFolderId,
      concertTitle,
      files: rootMusicFiles,
    });
  }
  for (const group of subfolderPieces) {
    pieces.push(...group);
  }

  return pieces;
}

export async function getRepertoire(locals?: App.Locals): Promise<RepertoirePiece[]> {
  const [config, concerts] = await Promise.all([
    getPortalConfig(locals),
    getConcerts(locals),
  ]);
  const targets = parseRepertoireFolderTargets(config);

  if (!hasGoogleServiceAccount(locals) || targets.length === 0) {
    return demoStore.repertoire.map((piece) => ({
      ...piece,
      files: piece.files.map((f) => ({ ...f })),
    }));
  }

  const activeConcertTitle =
    concerts.find((c) => c.status === 'On_Sale' || c.status === 'Upcoming')?.title ||
    'Concert Repertoire';

  return cachedFetchJson('music', 300, async () => {
    const groups = await Promise.all(
      targets.map((target, idx) =>
        scanConcertRootFolder(
          target,
          idx === 0 ? activeConcertTitle : `Concert Program ${idx + 1}`,
          targets.length,
          locals
        )
      )
    );
    const flat = groups.flat();

    const extraDocId = extractGoogleId(
      config.Director_Notes_Doc_ID || config.Repertoire_Notes_Doc_ID || ''
    );
    if (extraDocId && extraDocId !== 'DEMO' && !extraDocId.startsWith('PASTE_')) {
      const alreadyPresent = flat.some((p) => p.files.some((f) => f.id === extraDocId));
      if (!alreadyPresent) {
        try {
          const meta = await getDriveFileMetadata(extraDocId, locals);
          const docInfo = isSupportedDocItem(meta.mimeType, meta.name);
          if (docInfo.isDoc && flat[0]) {
            flat[0].files.unshift({
              id: meta.id,
              name: meta.name,
              mimeType: meta.mimeType,
              sizeBytes: meta.size,
              isPdf: false,
              isAudio: false,
              isDoc: true,
              canExportPdf: docInfo.canExportPdf || undefined,
            });
          }
        } catch {
          // Ignore invalid or unshared optional doc ID
        }
      }
    }

    return flat;
  });
}

const DEMO_DIRECTOR_MARKINGS_HTML: Record<string, string> = {
  'demo-doc-advent-markings': sanitizeHandbookHtml(`
    <h2>Concert Order &amp; Transitions — Advent with Kantorei</h2>
    <p><strong>Artistic Director Callouts (Adam Reinwald):</strong> Please transfer all measure numbers, breaths, and repeat instructions into ForScore or your octavos prior to our first November sectional.</p>
    <table>
      <thead>
        <tr>
          <th>Order &amp; Piece</th>
          <th>Divisi &amp; Part Assignments</th>
          <th>Repeats, Cuts &amp; Style</th>
          <th>Reference Recording</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>1. Gaudete</strong> — Steven Sametz</td>
          <td><strong>SATB + Solo Quartet:</strong> S1/A1/T1/B1 take upper divisi at m. 34; B2 anchor low drone pedal smoothly.</td>
          <td>Take 1st &amp; 2nd endings at m. 24; <em>subito piano</em> on repeat. Crisp liturgical Latin consonants.</td>
          <td><a href="https://www.youtube.com/watch?v=9yM6S6qU4uY">Listen on YouTube</a></td>
        </tr>
        <tr>
          <td><strong>2. O Magnum Mysterium</strong> — Morten Lauridsen</td>
          <td><strong>Full SATB (8-part divisi mm. 28–39):</strong> S2 split evenly on m. 36 cluster; A2/T1 match warm vowel color; B1/B2 stagger breathing through mm. 44–52.</td>
          <td>&#9833; = 54. No breath before "et admirabile" in m. 5 (carry phrase across barline). Release final chord on beat 4.</td>
          <td><a href="https://www.youtube.com/watch?v=nn5ken3RJBo">Lauridsen Reference (YouTube)</a></td>
        </tr>
        <tr>
          <td><strong>3. and the swallow</strong> — Caroline Shaw</td>
          <td><strong>SATB:</strong> S1/S2 straight tone opening ("How lovely is your dwelling place"); T2/B1 bring out moving inner 16ths at m. 41.</td>
          <td>Observe written glissandi gently (not theatrical); observe 2-bar silence before Coda.</td>
          <td><a href="https://www.youtube.com/watch?v=X3N2h6uP5F4">Shaw Reference (YouTube)</a></td>
        </tr>
      </tbody>
    </table>
    <h3>General Advent Style &amp; Standing Formation</h3>
    <ul>
      <li><strong>Mixed Quartet Formation</strong> for Set I; switch to <strong>Sectional Arc (S–A–B–T)</strong> during organ interlude before Lauridsen.</li>
      <li>All final <em>m</em> and <em>n</em> consonants place cleanly on the release beat unless marked <em>morendo</em>.</li>
    </ul>
  `),
  'demo-doc-muertos-markings': sanitizeHandbookHtml(`
    <h2>Concert Order &amp; Markings — Día de los Muertos</h2>
    <p><strong>Rehearsal &amp; Performance Notes:</strong> Attacca transitions between Movements I &amp; II of the Howells Requiem.</p>
    <ul>
      <li><strong>1. J.S. Bach — Lobet den Herrn, BWV 230:</strong> Observe breath marks in marked score; B1/B2 detached 8ths in continuo-style passages, legato on melismas. Reference: https://www.youtube.com/watch?v=c6b6B8T3a7E</li>
      <li><strong>2. Herbert Howells — Requiem:</strong> S1/A1 float upper cathedral resonance without heavy vibrato; T1/T2 lean into suspensions at rehearsal [C]. Reference: <a href="https://www.youtube.com/watch?v=1bZ0vF3y4fA">Howells Requiem Reference</a></li>
    </ul>
  `),
};

export async function getRepertoireDocHtml(
  fileId: string,
  requestedName: string,
  locals?: App.Locals
): Promise<{
  title: string;
  html: string;
  sourceType: 'gdoc' | 'docx' | 'text' | 'legacy-doc';
  canExportPdf: boolean;
}> {
  if (fileId.startsWith('demo-doc-')) {
    return {
      title: requestedName,
      html:
        DEMO_DIRECTOR_MARKINGS_HTML[fileId] ||
        DEMO_DIRECTOR_MARKINGS_HTML['demo-doc-advent-markings'],
      sourceType: 'docx',
      canExportPdf: true,
    };
  }

  return cachedFetchJson(`repertoire-doc:${fileId}`, 300, async () => {
    const meta = await getDriveFileMetadata(fileId, locals);
    const title = meta.name || requestedName;

    if (meta.mimeType === 'application/vnd.google-apps.document') {
      const token = await getGoogleAccessToken(locals);
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
          fileId
        )}/export?mimeType=text/html`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        throw new Error(`Google Doc markings export failed (${res.status}).`);
      }
      const rawHtml = await res.text();
      return {
        title,
        html: sanitizeHandbookHtml(rawHtml),
        sourceType: 'gdoc' as const,
        canExportPdf: true,
      };
    }

    const lower = title.toLowerCase();
    const isDocx =
      meta.mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      lower.endsWith('.docx');

    if (isDocx) {
      const mediaRes = await fetchDriveMediaResponse(fileId, null, locals);
      if (!mediaRes.ok) {
        throw new Error(`Failed to fetch .docx markings from Google Drive (${mediaRes.status}).`);
      }
      const bytes = new Uint8Array(await mediaRes.arrayBuffer());
      const html = await convertDocxToHtml(bytes);
      return {
        title,
        html,
        sourceType: 'docx' as const,
        canExportPdf: false,
      };
    }

    if (meta.mimeType === 'text/plain' || lower.endsWith('.txt')) {
      const mediaRes = await fetchDriveMediaResponse(fileId, null, locals);
      if (!mediaRes.ok) {
        throw new Error(`Failed to fetch text notes from Google Drive (${mediaRes.status}).`);
      }
      const rawText = await mediaRes.text();
      return {
        title,
        html: convertPlainTextToHtml(rawText),
        sourceType: 'text' as const,
        canExportPdf: false,
      };
    }

    return {
      title,
      html: sanitizeHandbookHtml(
        `<p>This markings file (<strong>${title}</strong>) uses a legacy Word format (<code>.doc</code> / <code>.rtf</code>). Click <strong>Download Original</strong> above to view it, or open it in Google Docs / save as <code>.docx</code> in Drive for instant inline viewing.</p>`
      ),
      sourceType: 'legacy-doc' as const,
      canExportPdf: false,
    };
  });
}

export async function exportGoogleDocPdfResponse(
  fileId: string,
  locals?: App.Locals
): Promise<Response> {
  const token = await getGoogleAccessToken(locals);
  return fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      fileId
    )}/export?mimeType=application/pdf`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export async function getDriveFileMetadata(
  fileId: string,
  locals?: App.Locals
): Promise<{ id: string; name: string; mimeType: string; size?: number }> {
  const token = await getGoogleAccessToken(locals);
  const params = new URLSearchParams({
    fields: 'id,name,mimeType,size',
    supportsAllDrives: 'true',
  });
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    throw new NotFoundError(`Drive file ${fileId} not found (${res.status}).`);
  }

  const meta = (await res.json()) as { id: string; name: string; mimeType: string; size?: string };
  return {
    id: meta.id,
    name: meta.name,
    mimeType: meta.mimeType,
    size: meta.size ? Number(meta.size) : undefined,
  };
}

export async function fetchDriveMediaResponse(
  fileId: string,
  rangeHeader: string | null,
  locals?: App.Locals
): Promise<Response> {
  const token = await getGoogleAccessToken(locals);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (rangeHeader) {
    headers.Range = rangeHeader;
  }

  return fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      fileId
    )}?alt=media&supportsAllDrives=true`,
    { headers }
  );
}

export async function getHandbookHtml(
  locals?: App.Locals
): Promise<{ html: string; isDemo: boolean }> {
  const config = await getPortalConfig(locals);
  const docId = extractGoogleId(config.Handbook_Google_Doc_ID || '');

  if (!hasGoogleServiceAccount(locals) || !docId || docId === 'DEMO' || docId.startsWith('PASTE_')) {
    return { html: DEFAULT_HANDBOOK_HTML, isDemo: true };
  }

  const sanitized = await cachedFetchJson('handbook', 300, async () => {
    const token = await getGoogleAccessToken(locals);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        docId
      )}/export?mimeType=text/html`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      throw new Error(`Handbook Google Doc export failed (${res.status})`);
    }
    const rawHtml = await res.text();
    return sanitizeHandbookHtml(rawHtml);
  });

  return { html: sanitized, isDemo: false };
}

export async function getStrategicPlanHtml(
  locals?: App.Locals
): Promise<{ html: string; isDemo: boolean }> {
  const config = await getPortalConfig(locals);
  const docId = extractGoogleId(config.Strategic_Plan_Google_Doc_ID || '');

  if (!hasGoogleServiceAccount(locals) || !docId || docId === 'DEMO' || docId.startsWith('PASTE_')) {
    return { html: DEFAULT_STRATEGIC_PLAN_HTML, isDemo: true };
  }

  const sanitized = await cachedFetchJson('strategic-plan', 300, async () => {
    const token = await getGoogleAccessToken(locals);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        docId
      )}/export?mimeType=text/html`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      throw new Error(`Strategic Plan Google Doc export failed (${res.status})`);
    }
    const rawHtml = await res.text();
    return sanitizeHandbookHtml(rawHtml);
  });

  return { html: sanitized, isDemo: false };
}

