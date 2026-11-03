import type { APIRoute } from 'astro';
import {
  exportGoogleDocPdfResponse,
  fetchDriveMediaResponse,
  generateDemoPdfBytes,
  generateDemoWavBytes,
  getDriveFileMetadata,
  getRepertoireDocHtml,
  NotFoundError,
} from '../../../lib/google';
import { extractReferenceRecordingsFromHtml } from '../../../lib/youtube';

function sanitizeFilename(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9._ -]/g, '_').replace(/\s+/g, '_');
}

function sliceBytesForRange(
  bytes: Uint8Array,
  rangeHeader: string | null,
  mimeType: string,
  filename: string,
  forceDownload: boolean,
  etag?: string
): Response {
  const total = bytes.byteLength;
  const disposition = `${forceDownload ? 'attachment' : 'inline'}; filename="${filename}"`;

  const headers: Record<string, string> = {
    'Content-Type': mimeType,
    'Accept-Ranges': 'bytes',
    'Content-Disposition': disposition,
    'Cache-Control': 'private, max-age=3600',
  };
  if (etag) {
    headers['ETag'] = etag;
  }

  if (rangeHeader && rangeHeader.startsWith('bytes=')) {
    const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
    if (match) {
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Math.min(Number(match[2]), total - 1) : total - 1;

      if (start >= 0 && start <= end && start < total) {
        const chunk = bytes.slice(start, end + 1);
        headers['Content-Length'] = String(chunk.byteLength);
        headers['Content-Range'] = `bytes ${start}-${end}/${total}`;
        return new Response(chunk.buffer, {
          status: 206,
          headers,
        });
      }
    }
  }

  const fullCopy = bytes.slice();
  headers['Content-Length'] = String(total);
  return new Response(fullCopy.buffer, {
    status: 200,
    headers,
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
  const format = url.searchParams.get('format');
  const forceDownload = url.searchParams.get('download') === '1';
  const rangeHeader = request.headers.get('range');
  const ifNoneMatch = request.headers.get('if-none-match')?.trim();

  // 1. HTML JSON payload for Director's Markings & Program Notes (Google Docs, .docx, .txt)
  if (format === 'html') {
    try {
      const doc = await getRepertoireDocHtml(fileId, requestedName, locals);
      const referenceLinks = extractReferenceRecordingsFromHtml(doc.html);
      return new Response(
        JSON.stringify({
          ...doc,
          referenceLinks,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'private, max-age=300',
          },
        }
      );
    } catch (err) {
      if (err instanceof NotFoundError) {
        return new Response(JSON.stringify({ error: 'Markings document not found.' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      console.error('[Markings HTML Error]', err);
      return new Response(
        JSON.stringify({ error: 'Unable to render markings document.' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // 2. Sandbox / Demo Score, Audio & Markings PDF Generator
  if (fileId.startsWith('demo-')) {
    const cleanName = sanitizeFilename(requestedName);
    if (fileId.startsWith('demo-pdf-') || fileId.startsWith('demo-doc-')) {
      const basePdfName = cleanName.replace(/\.(docx|doc|txt)$/i, '');
      const pdfBytes = generateDemoPdfBytes(requestedName);
      const etag = `W/"demo-${fileId}-${pdfBytes.byteLength}"`;

      if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === '*')) {
        return new Response(null, {
          status: 304,
          headers: {
            ETag: etag,
            'Cache-Control': 'private, max-age=3600',
            'Accept-Ranges': 'bytes',
          },
        });
      }

      return sliceBytesForRange(
        pdfBytes,
        rangeHeader,
        'application/pdf',
        basePdfName.endsWith('.pdf') ? basePdfName : `${basePdfName}.pdf`,
        forceDownload,
        etag
      );
    }

    const wavBytes = generateDemoWavBytes(fileId);
    const etag = `W/"demo-${fileId}-${wavBytes.byteLength}"`;

    if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === '*')) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'private, max-age=3600',
          'Accept-Ranges': 'bytes',
        },
      });
    }

    return sliceBytesForRange(
      wavBytes,
      rangeHeader,
      'audio/wav',
      cleanName.endsWith('.wav') ? cleanName : `${cleanName}.wav`,
      forceDownload,
      etag
    );
  }

  // 3. Live Google Drive v3 Streaming (PDF, Audio, Google Doc PDF export, and .docx download)
  try {
    const meta = await getDriveFileMetadata(fileId, locals);
    const isGoogleDoc = meta.mimeType === 'application/vnd.google-apps.document';
    const etag = `W/"${fileId}-${meta.size ?? 'live'}"`;

    // Fast-path HTTP 304 Not Modified for unchanged scores / audio on iPad & browsers
    if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === '*')) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'private, max-age=3600',
          'Accept-Ranges': 'bytes',
        },
      });
    }

    if (isGoogleDoc) {
      const pdfRes = await exportGoogleDocPdfResponse(fileId, locals);
      if (!pdfRes.ok) {
        return new Response('Failed to export Google Doc as PDF.', { status: pdfRes.status });
      }
      const baseName = sanitizeFilename(url.searchParams.get('name') || meta.name).replace(
        /\.pdf$/i,
        ''
      );
      return new Response(pdfRes.body, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `${
            forceDownload ? 'attachment' : 'inline'
          }; filename="${baseName}.pdf"`,
          'Cache-Control': 'private, max-age=600',
          ETag: etag,
        },
      });
    }

    const isPdf = meta.mimeType === 'application/pdf' || meta.name.toLowerCase().endsWith('.pdf');
    const isAudio =
      meta.mimeType.startsWith('audio/') || /\.(mp3|m4a|wav|aac|ogg|flac)$/i.test(meta.name);
    const isWordOrTextDoc =
      meta.mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      meta.mimeType === 'application/msword' ||
      meta.mimeType === 'text/plain' ||
      meta.mimeType === 'application/rtf' ||
      /\.(docx|doc|txt|rtf)$/i.test(meta.name);

    if (!isPdf && !isAudio && !isWordOrTextDoc) {
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
      : isAudio
        ? /\.m4a$/i.test(meta.name) && (!meta.mimeType || meta.mimeType === 'video/mp4')
          ? 'audio/mp4'
          : meta.mimeType || 'audio/mpeg'
        : meta.mimeType || 'application/octet-stream';

    const headers = new Headers();
    headers.set('Content-Type', normalizedContentType);
    headers.set(
      'Content-Disposition',
      `${forceDownload || isWordOrTextDoc ? 'attachment' : 'inline'}; filename="${cleanName}"`
    );
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'private, max-age=3600');
    headers.set('ETag', etag);

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
      return new Response('Score, track, or markings document not found.', { status: 404 });
    }
    console.error('[Music Stream Error]', err);
    return new Response('Error streaming repertoire file.', { status: 500 });
  }
};
