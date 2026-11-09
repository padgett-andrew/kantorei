import type { PortalConfig } from '../../types/choir';
import { extractGoogleId, getEnv } from '../env';

export interface ConfiguredFolderTarget {
  folderId: string;
  explicitLabel?: string;
}

/**
 * Parses single or multi-target repertoire folder settings from Config.
 * Supports comma/newline separated entries, prefix labels (e.g. "Advent: https://..."),
 * and individual Repertoire_Folder_* keys.
 */
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

/**
 * Checks whether a string looks like a real Google Drive / Sheets alphanumeric ID
 * (at least 15 characters of base64/url-safe characters, and not a demo placeholder).
 */
export function isRealGoogleId(id?: string | null): boolean {
  if (!id) return false;
  const trimmed = id.trim();
  if (
    trimmed === 'DEMO' ||
    trimmed.startsWith('PASTE_') ||
    trimmed.startsWith('piece-') ||
    trimmed.startsWith('notes-') ||
    trimmed.startsWith('k:') ||
    trimmed.startsWith('n:')
  ) {
    return false;
  }
  return /^[a-zA-Z0-9_-]{15,}$/.test(trimmed);
}

/**
 * Returns the appropriate Google Sheets URL for the Choir Database Sheet based on user role.
 * - Admins get `/edit` (full edit access to roster, schedule, absences, config)
 * - Singers / Section Leaders get `/view` (view access)
 */
export function getChoirSheetUrl(isAdmin: boolean, locals?: App.Locals): string {
  const raw = getEnv('GOOGLE_SHEET_ID', locals);
  const sheetId = extractGoogleId(raw);
  if (!sheetId || sheetId === 'DEMO') {
    return 'https://docs.google.com/spreadsheets';
  }
  const mode = isAdmin ? 'edit' : 'view';
  return `https://docs.google.com/spreadsheets/d/${sheetId}/${mode}`;
}

export const getMasterSheetUrl = getChoirSheetUrl;

/**
 * Returns the direct Google Drive URL for a folder ID.
 * Falls back to the configured REPERTOIRE_DRIVE_FOLDER_ID or the default Kantorei music folder.
 */
export function getDriveFolderUrl(folderId?: string | null, locals?: App.Locals): string {
  if (isRealGoogleId(folderId)) {
    return `https://drive.google.com/drive/folders/${extractGoogleId(folderId!)}`;
  }
  const envFolder = getEnv('REPERTOIRE_DRIVE_FOLDER_ID', locals);
  const cleanEnvFolder = extractGoogleId(envFolder);
  if (isRealGoogleId(cleanEnvFolder)) {
    return `https://drive.google.com/drive/folders/${cleanEnvFolder}`;
  }
  return 'https://drive.google.com/drive/folders/1tIPYJBkibVLjQOaGSzZ2y7L9UOTNOyJc';
}

export interface DriveFolderTargetLink {
  label: string;
  folderId: string;
  url: string;
}

export interface WorkspaceLinks {
  sheetUrl: string;
  sheetMode: 'edit' | 'view';
  sheetLabel: string;
  masterSheetUrl: string;
  masterSheetMode: 'edit' | 'view';
  masterSheetLabel: string;
  repertoireDriveUrl: string;
  concertDriveFolders: DriveFolderTargetLink[];
  isAdmin: boolean;
}

export function getWorkspaceLinks(
  isAdmin: boolean,
  config?: PortalConfig | null,
  locals?: App.Locals
): WorkspaceLinks {
  const sheetUrl = getChoirSheetUrl(isAdmin, locals);
  const sheetMode = isAdmin ? 'edit' : 'view';
  const sheetLabel = isAdmin
    ? 'Choir Google Sheet (Edit Access)'
    : 'Choir Google Sheet (View Access)';

  const targets = config ? parseRepertoireFolderTargets(config) : [];
  const concertDriveFolders: DriveFolderTargetLink[] = targets.map((t, idx) => ({
    label:
      t.explicitLabel ||
      (targets.length === 1 ? 'Music Drive Folder' : `Concert Program ${idx + 1} Folder`),
    folderId: t.folderId,
    url: getDriveFolderUrl(t.folderId, locals),
  }));

  const repertoireDriveUrl =
    concertDriveFolders[0]?.url ||
    getDriveFolderUrl(config?.Repertoire_Drive_Folder_ID, locals);

  return {
    sheetUrl,
    sheetMode,
    sheetLabel,
    masterSheetUrl: sheetUrl,
    masterSheetMode: sheetMode,
    masterSheetLabel: sheetLabel,
    repertoireDriveUrl,
    concertDriveFolders,
    isAdmin,
  };
}
