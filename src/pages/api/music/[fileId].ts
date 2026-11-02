import type { APIRoute } from 'astro';
import {
  fetchDriveMediaResponse,
  generateDemoPdfBytes,
  generateDemoWavBytes,
  getDriveFileMetadata,
  NotFoundError,
} from '../../../lib/google';

function sanitizeFilename(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9._ -]/g, '_').replace(/\s+/g, '_');
}

function sliceBytesForRange(
  bytes: Uint8Array,
  rangeHeader: string | null,
  mimeType: string,
  filename: string,
  forceDownload: boolean
): Response {
  const total = bytes.byteLength;
  const disposition = `${forceDownload ? 'attachment' : 'inline'}; filename="${filename}"`;

  if (rangeHeader && rangeHeader.startsWith('bytes=')) {
    const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
    if (match) {
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Math.min(Number(match[2]), total - 1) : total - 1;

      if (start >= 0 && start <= end && start < total) {
        const chunk = bytes.slice(start, end + 1);
        return new Response(chunk.buffer, {
          status: 206,
          headers: {
            'Content-Type': mimeType,
            'Content-Length': String(chunk.byteLength),
            'Content-Range': `bytes ${start}-${end}/${total}`,
            'Accept-Ranges': 'bytes',
            'Content-Disposition': disposition,
            'Cache-Control': 'private, max-age=3600',
          },
        });
      }
    }
  }

  const fullCopy = bytes.slice();
  return new Response(fullCopy.buffer, {
    status: 200,
    headers: {
      'Content-Type': mimeType,
      'Content-Length': String(total),
      'Accept-Ranges': 'bytes',
      'Content-Disposition': disposition,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}

export const GET: APIRoute = async ({ params, request, url, locals }) => {
  if (!locals.singer) {
    return new Response(JSON.stringify({ error: 'Authentication required.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const fileId = params.fileId;
  if (!fileId) {
    return new Response('Missing fileId', { status: 400 });
  }

  const requestedName = url.searchParams.get('name') || `${fileId}`;
  const forceDownload = url.searchParams.get('download') === '1';
  const rangeHeader = request.headers.get('range');

  // Sandbox / Demo Score & Rehearsal Audio Generator (full HTTP 206 Range support for iPad Safari)
  if (fileId.startsWith('demo-')) {
    const cleanName = sanitizeFilename(requestedName);
    if (fileId.startsWith('demo-pdf-')) {
      const pdfBytes = generateDemoPdfBytes(requestedName);
      return sliceBytesForRange(
        pdfBytes,
        rangeHeader,
        'application/pdf',
        cleanName.endsWith('.pdf') ? cleanName : `${cleanName}.pdf`,
        forceDownload
      );
    }

    const wavBytes = generateDemoWavBytes(fileId);
    return sliceBytesForRange(
      wavBytes,
      rangeHeader,
      'audio/wav',
      cleanName.endsWith('.wav') ? cleanName : `${cleanName}.wav`,
      forceDownload
    );
  }

  // Live Google Drive v3 Streaming with HTTP Range Passthrough
  try {
    const meta = await getDriveFileMetadata(fileId, locals);
    const isPdf = meta.mimeType === 'application/pdf' || meta.name.toLowerCase().endsWith('.pdf');
    const isAudio =
      meta.mimeType.startsWith('audio/') || /\.(mp3|m4a|wav|aac|ogg|flac)$/i.test(meta.name);

    if (!isPdf && !isAudio) {
      return new Response('Unsupported file type.', { status: 415 });
    }

    const driveRes = await fetchDriveMediaResponse(fileId, rangeHeader, locals);
    if (!driveRes.ok && driveRes.status !== 206) {
      return new Response('Failed to stream file from Google Drive.', {
        status: driveRes.status,
      });
    }

    const cleanName = sanitizeFilename(url.searchParams.get('name') || meta.name);
    const normalizedContentType = isPdf
      ? 'application/pdf'
      : /\.m4a$/i.test(meta.name) && (!meta.mimeType || meta.mimeType === 'video/mp4')
        ? 'audio/mp4'
        : meta.mimeType || 'audio/mpeg';

    const headers = new Headers();
    headers.set('Content-Type', normalizedContentType);
    headers.set(
      'Content-Disposition',
      `${forceDownload ? 'attachment' : 'inline'}; filename="${cleanName}"`
    );
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'private, max-age=3600');

    const contentLength = driveRes.headers.get('content-length');
    if (contentLength) headers.set('Content-Length', contentLength);

    const contentRange = driveRes.headers.get('content-range');
    if (contentRange) headers.set('Content-Range', contentRange);

    return new Response(driveRes.body, {
      status: driveRes.status,
      headers,
    });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return new Response('Score or audio track not found.', { status: 404 });
    }
    console.error('[Music Stream Error]', err);
    return new Response('Error streaming repertoire file.', { status: 500 });
  }
};
