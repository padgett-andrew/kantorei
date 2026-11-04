import { sanitizeHandbookHtml } from './sanitize.ts';

interface ZipEntry {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

function readUint16LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

function listZipEntries(bytes: Uint8Array): Map<string, ZipEntry> {
  const entries = new Map<string, ZipEntry>();
  const minEocdOffset = Math.max(0, bytes.byteLength - 65557);
  let eocdOffset = -1;

  for (let i = bytes.byteLength - 22; i >= minEocdOffset; i--) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x05 &&
      bytes[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset < 0) {
    throw new Error('Invalid .docx archive (missing ZIP central directory).');
  }

  const totalEntries = readUint16LE(bytes, eocdOffset + 10);
  const cdOffset = readUint32LE(bytes, eocdOffset + 16);
  const decoder = new TextDecoder('utf-8');

  let ptr = cdOffset;
  for (let idx = 0; idx < totalEntries && ptr + 46 <= bytes.byteLength; idx++) {
    if (
      bytes[ptr] !== 0x50 ||
      bytes[ptr + 1] !== 0x4b ||
      bytes[ptr + 2] !== 0x01 ||
      bytes[ptr + 3] !== 0x02
    ) {
      break;
    }

    const compressionMethod = readUint16LE(bytes, ptr + 10);
    const compressedSize = readUint32LE(bytes, ptr + 20);
    const uncompressedSize = readUint32LE(bytes, ptr + 24);
    const nameLen = readUint16LE(bytes, ptr + 28);
    const extraLen = readUint16LE(bytes, ptr + 30);
    const commentLen = readUint16LE(bytes, ptr + 32);
    const localHeaderOffset = readUint32LE(bytes, ptr + 42);

    const name = decoder.decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));
    entries.set(name, {
      name,
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });

    ptr += 46 + nameLen + extraLen + commentLen;
  }

  return entries;
}

async function extractZipTextEntry(
  bytes: Uint8Array,
  entries: Map<string, ZipEntry>,
  entryName: string
): Promise<string | null> {
  const entry = entries.get(entryName);
  if (!entry) return null;

  const lh = entry.localHeaderOffset;
  if (
    lh + 30 > bytes.byteLength ||
    bytes[lh] !== 0x50 ||
    bytes[lh + 1] !== 0x4b ||
    bytes[lh + 2] !== 0x03 ||
    bytes[lh + 3] !== 0x04
  ) {
    return null;
  }

  const localNameLen = readUint16LE(bytes, lh + 26);
  const localExtraLen = readUint16LE(bytes, lh + 28);
  const dataStart = lh + 30 + localNameLen + localExtraLen;
  const compressedSlice = bytes.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.compressionMethod === 0) {
    return new TextDecoder('utf-8').decode(compressedSlice);
  }

  if (entry.compressionMethod === 8) {
    const ds = new DecompressionStream('deflate-raw');
    const copy = new Uint8Array(compressedSlice.byteLength);
    copy.set(compressedSlice);
    const stream = new Blob([copy]).stream().pipeThrough(ds);
    const ab = await new Response(stream).arrayBuffer();
    return new TextDecoder('utf-8').decode(ab);
  }

  throw new Error(`Unsupported .docx compression method: ${entry.compressionMethod}`);
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseRelsMap(relsXml: string | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!relsXml) return map;

  const relRegex = /<Relationship\b([^>]*?)\/?>/gi;
  let match: RegExpExecArray | null;
  while ((match = relRegex.exec(relsXml)) !== null) {
    const attrs = match[1];
    const idMatch = /\bId="([^"]+)"/i.exec(attrs);
    const targetMatch = /\bTarget="([^"]+)"/i.exec(attrs);
    if (idMatch && targetMatch) {
      map.set(idMatch[1], decodeXmlEntities(targetMatch[1]));
    }
  }
  return map;
}

function parseNumberingFormats(numberingXml: string | null): Map<string, 'ul' | 'ol'> {
  const abstractFormats = new Map<string, 'ul' | 'ol'>();
  const numMap = new Map<string, 'ul' | 'ol'>();
  if (!numberingXml) return numMap;

  const abstractRegex =
    /<w:abstractNum\b[^>]*?\bw:abstractNumId="([^"]+)"[^>]*>([\s\S]*?)<\/w:abstractNum>/gi;
  let absMatch: RegExpExecArray | null;
  while ((absMatch = abstractRegex.exec(numberingXml)) !== null) {
    const absId = absMatch[1];
    const inner = absMatch[2];
    const fmtMatch = /<w:numFmt\b[^>]*?\bw:val="([^"]+)"/i.exec(inner);
    const fmt = (fmtMatch?.[1] || '').toLowerCase();
    abstractFormats.set(absId, fmt === 'bullet' || fmt === 'none' ? 'ul' : 'ol');
  }

  const numRegex = /<w:num\b[^>]*?\bw:numId="([^"]+)"[^>]*>([\s\S]*?)<\/w:num>/gi;
  let numMatch: RegExpExecArray | null;
  while ((numMatch = numRegex.exec(numberingXml)) !== null) {
    const numId = numMatch[1];
    const absRef = /<w:abstractNumId\b[^>]*?\bw:val="([^"]+)"/i.exec(numMatch[2]);
    const listTag = absRef ? abstractFormats.get(absRef[1]) || 'ul' : 'ul';
    numMap.set(numId, listTag);
  }

  return numMap;
}

function isToggleEnabled(rPrXml: string, tag: string): boolean {
  const m = new RegExp(`<w:${tag}\\b([^>]*?)\\/?>`, 'i').exec(rPrXml);
  if (!m) return false;
  const valMatch = /\bw:val="([^"]+)"/i.exec(m[1]);
  if (!valMatch) return true;
  const val = valMatch[1].toLowerCase();
  return val !== '0' && val !== 'false' && val !== 'none';
}

function renderRunXml(runXml: string): string {
  const rPrMatch = /<w:rPr\b[^>]*>([\s\S]*?)<\/w:rPr>/i.exec(runXml);
  const rPr = rPrMatch ? rPrMatch[1] : '';

  const tokenRegex = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:br\b[^>]*\/?>|<w:tab\b[^>]*\/?>/gi;
  const parts: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = tokenRegex.exec(runXml)) !== null) {
    if (m[1] !== undefined) {
      parts.push(escapeHtml(decodeXmlEntities(m[1])));
    } else if (m[0].toLowerCase().startsWith('<w:br')) {
      parts.push('<br />');
    } else if (m[0].toLowerCase().startsWith('<w:tab')) {
      parts.push(' &emsp; ');
    }
  }

  let content = parts.join('');
  if (!content) return '';

  const bold = isToggleEnabled(rPr, 'b');
  const italic = isToggleEnabled(rPr, 'i');
  const underline = isToggleEnabled(rPr, 'u');

  if (underline) content = `<u>${content}</u>`;
  if (italic) content = `<em>${content}</em>`;
  if (bold) content = `<strong>${content}</strong>`;

  return content;
}

function renderInlineContent(xml: string, rels: Map<string, string>): string {
  const blockRegex =
    /<w:hyperlink\b([^>]*)>([\s\S]*?)<\/w:hyperlink>|<w:r\b[^>]*>([\s\S]*?)<\/w:r>/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;

  while ((m = blockRegex.exec(xml)) !== null) {
    if (m[1] !== undefined && m[2] !== undefined) {
      const rIdMatch = /\br:id="([^"]+)"/i.exec(m[1]);
      const href = rIdMatch ? rels.get(rIdMatch[1]) : undefined;
      const innerRuns = m[2].match(/<w:r\b[^>]*>[\s\S]*?<\/w:r>/gi) || [];
      const text = innerRuns.map(renderRunXml).join('');
      if (text) {
        if (href && /^https?:|^mailto:/i.test(href)) {
          out.push(`<a href="${escapeHtml(href)}">${text}</a>`);
        } else {
          out.push(text);
        }
      }
    } else if (m[3] !== undefined) {
      out.push(renderRunXml(m[3]));
    }
  }

  return out.join('');
}

interface ParsedParagraph {
  kind: 'heading' | 'list' | 'paragraph' | 'hr';
  tag: 'h1' | 'h2' | 'h3' | 'p';
  listType?: 'ul' | 'ol';
  html: string;
}

function parseParagraph(
  pXml: string,
  rels: Map<string, string>,
  numFormats: Map<string, 'ul' | 'ol'>
): ParsedParagraph | null {
  const pPrMatch = /<w:pPr\b[^>]*>([\s\S]*?)<\/w:pPr>/i.exec(pXml);
  const pPr = pPrMatch ? pPrMatch[1] : '';

  const hasBottomBorder = /<w:pBdr\b[\s\S]*?<w:bottom\b/i.test(pPr);
  const styleMatch = /<w:pStyle\b[^>]*?\bw:val="([^"]+)"/i.exec(pPr);
  const style = (styleMatch?.[1] || '').toLowerCase();

  const numIdMatch = /<w:numPr\b[\s\S]*?<w:numId\b[^>]*?\bw:val="([^"]+)"/i.exec(pPr);
  const numId = numIdMatch?.[1];

  const innerHtml = renderInlineContent(pXml, rels).trim();

  if (!innerHtml) {
    if (hasBottomBorder) {
      return { kind: 'hr', tag: 'p', html: '' };
    }
    return null;
  }

  if (numId && numId !== '0') {
    const listType = numFormats.get(numId) || (style.includes('number') ? 'ol' : 'ul');
    return { kind: 'list', tag: 'p', listType, html: innerHtml };
  }

  if (style === 'title' || style === 'heading1' || style === 'heading 1') {
    return { kind: 'heading', tag: 'h1', html: innerHtml };
  }
  if (style === 'subtitle' || style === 'heading2' || style === 'heading 2') {
    return { kind: 'heading', tag: 'h2', html: innerHtml };
  }
  if (style.startsWith('heading')) {
    return { kind: 'heading', tag: 'h3', html: innerHtml };
  }

  return { kind: 'paragraph', tag: 'p', html: innerHtml };
}

function renderTableXml(
  tblXml: string,
  rels: Map<string, string>,
  numFormats: Map<string, 'ul' | 'ol'>
): string {
  const rowMatches = tblXml.match(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/gi) || [];
  if (rowMatches.length === 0) return '';

  const rowsHtml = rowMatches.map((trXml, rowIndex) => {
    const isHeaderRow = rowIndex === 0 && /<w:tblHeader\b/i.test(trXml);
    const cellMatches = trXml.match(/<w:tc\b[^>]*>[\s\S]*?<\/w:tc>/gi) || [];
    const cellsHtml = cellMatches
      .map((tcXml) => {
        const spanMatch = /<w:gridSpan\b[^>]*?\bw:val="(\d+)"/i.exec(tcXml);
        const colspan = spanMatch ? ` colspan="${spanMatch[1]}"` : '';
        const pMatches = tcXml.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/gi) || [];
        const cellParts = pMatches
          .map((p) => parseParagraph(p, rels, numFormats))
          .filter((p): p is ParsedParagraph => p !== null)
          .map((p) => p.html);
        const cellTag = isHeaderRow || (rowIndex === 0 && cellMatches.length > 1) ? 'th' : 'td';
        return `<${cellTag}${colspan}>${cellParts.join('<br />')}</${cellTag}>`;
      })
      .join('');
    return `<tr>${cellsHtml}</tr>`;
  });

  if (rowsHtml.length > 1) {
    return `<table><thead>${rowsHtml[0]}</thead><tbody>${rowsHtml.slice(1).join('')}</tbody></table>`;
  }
  return `<table><tbody>${rowsHtml.join('')}</tbody></table>`;
}

/**
 * Converts a Microsoft Word (.docx) binary file into clean, sanitized semantic HTML
 * using Web Streams `DecompressionStream('deflate-raw')` (zero npm packages, 0ms Worker overhead).
 */
export async function convertDocxToHtml(bytes: Uint8Array): Promise<string> {
  const entries = listZipEntries(bytes);
  const [docXml, relsXml, numberingXml] = await Promise.all([
    extractZipTextEntry(bytes, entries, 'word/document.xml'),
    extractZipTextEntry(bytes, entries, 'word/_rels/document.xml.rels'),
    extractZipTextEntry(bytes, entries, 'word/numbering.xml'),
  ]);

  if (!docXml) {
    throw new Error('Could not locate word/document.xml inside .docx file.');
  }

  const rels = parseRelsMap(relsXml);
  const numFormats = parseNumberingFormats(numberingXml);

  const bodyMatch = /<w:body\b[^>]*>([\s\S]*?)<\/w:body>/i.exec(docXml);
  const bodyXml = bodyMatch ? bodyMatch[1] : docXml;

  // Match top-level tables and paragraphs in document order
  const blockRegex = /<w:tbl\b[^>]*>[\s\S]*?<\/w:tbl>|<w:p\b[^>]*>[\s\S]*?<\/w:p>/gi;
  const htmlBlocks: string[] = [];
  let openList: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (openList) {
      htmlBlocks.push(`</${openList}>`);
      openList = null;
    }
  };

  let m: RegExpExecArray | null;
  while ((m = blockRegex.exec(bodyXml)) !== null) {
    const token = m[0];
    if (token.toLowerCase().startsWith('<w:tbl')) {
      flushList();
      const tableHtml = renderTableXml(token, rels, numFormats);
      if (tableHtml) htmlBlocks.push(tableHtml);
    } else {
      const parsed = parseParagraph(token, rels, numFormats);
      if (!parsed) continue;

      if (parsed.kind === 'list' && parsed.listType) {
        if (openList !== parsed.listType) {
          flushList();
          openList = parsed.listType;
          htmlBlocks.push(`<${openList}>`);
        }
        htmlBlocks.push(`<li>${parsed.html}</li>`);
      } else {
        flushList();
        if (parsed.kind === 'hr') {
          htmlBlocks.push('<hr />');
        } else {
          htmlBlocks.push(`<${parsed.tag}>${parsed.html}</${parsed.tag}>`);
        }
      }
    }
  }

  flushList();
  return sanitizeHandbookHtml(htmlBlocks.join('\n'));
}

export function convertPlainTextToHtml(rawText: string): string {
  const blocks = rawText
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br />')}</p>`);

  return sanitizeHandbookHtml(blocks.join('\n'));
}

