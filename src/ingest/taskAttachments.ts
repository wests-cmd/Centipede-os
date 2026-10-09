import JSZip from 'jszip';
import { localModelsApi } from '../api/localModels';
import type { PreparedTaskAttachment } from './taskContext';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_ARCHIVE_BYTES = 18 * 1024 * 1024;
const MAX_ARCHIVE_EXPANDED_BYTES = 24 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 40;
const MAX_ATTACHMENT_TEXT_CHARS = 48_000;
const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'jsonl', 'yaml', 'yml', 'xml', 'html', 'htm', 'log',
  'ini', 'toml', 'conf', 'cfg', 'js', 'jsx', 'ts', 'tsx', 'css', 'scss', 'py', 'sh', 'bash', 'ps1',
  'sql', 'java', 'c', 'h', 'cpp', 'hpp', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'tex', 'rst', 'graphql',
]);

function extensionOf(name: string): string {
  const lastDot = name.lastIndexOf('.');
  return lastDot < 0 ? '' : name.slice(lastDot + 1).toLowerCase();
}

function normalizeText(text: string): string {
  return text.replace(/\u0000/g, '').replace(/\r\n?/g, '\n').replace(/[\t ]+\n/g, '\n').trim();
}

async function checksum(file: File): Promise<string | undefined> {
  if (!globalThis.crypto?.subtle) return undefined;
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function readUtf8(file: File): Promise<string> {
  return file.text();
}

async function readImageDescription(file: File, model: string): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image processing is unavailable in this browser.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Could not prepare the image.')), 'image/jpeg', 0.78));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
    }
    return localModelsApi.describeImage(model, 'Describe the image for the user task. Include useful visible labels and facts, and state uncertainty.', btoa(binary));
  } finally {
    bitmap.close();
  }
}

async function extractDocx(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  if (entries.length > MAX_ARCHIVE_ENTRIES || entries.reduce((sum, entry) => sum + Number((entry as any)._data?.uncompressedSize || 0), 0) > MAX_ARCHIVE_EXPANDED_BYTES) {
    throw new Error('The Word document expands beyond the safe text-extraction limits.');
  }
  const document = zip.file('word/document.xml');
  if (!document) throw new Error('The Word document does not contain a readable document.xml.');
  const xml = await document.async('text');
  if (!/<(?:[\w.-]+:)?document\b/i.test(xml)) throw new Error('The Word document contents could not be read.');
  const decodeXml = (value: string) => value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_entity, name: string) => {
    if (name.startsWith('#x')) return String.fromCodePoint(Number.parseInt(name.slice(2), 16));
    if (name.startsWith('#')) return String.fromCodePoint(Number.parseInt(name.slice(1), 10));
    return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" } as Record<string, string>)[name.toLowerCase()] || '';
  });
  const words: string[] = [];
  const textElements = /<(?:[\w.-]+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w.-]+:)?t\s*>/gi;
  for (const match of xml.matchAll(textElements)) words.push(decodeXml(match[1]));
  return normalizeText(words.join(' '));
}

async function extractSpreadsheet(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  if (entries.length > MAX_ARCHIVE_ENTRIES || entries.reduce((sum, entry) => sum + Number((entry as any)._data?.uncompressedSize || 0), 0) > MAX_ARCHIVE_EXPANDED_BYTES) {
    throw new Error('The spreadsheet expands beyond the safe text-extraction limits.');
  }
  const sharedFile = zip.file('xl/sharedStrings.xml');
  const sharedStrings: string[] = [];
  if (sharedFile) {
    const xml = new DOMParser().parseFromString(await sharedFile.async('text'), 'application/xml');
    if (!xml.querySelector('parsererror')) {
      for (const item of Array.from(xml.getElementsByTagNameNS('*', 'si'))) {
        sharedStrings.push(Array.from(item.getElementsByTagNameNS('*', 't')).map((node) => node.textContent || '').join(''));
      }
    }
  }
  const sheets = entries.filter((entry) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(entry.name)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const output: string[] = [];
  for (const sheet of sheets) {
    const xml = new DOMParser().parseFromString(await sheet.async('text'), 'application/xml');
    if (xml.querySelector('parsererror')) continue;
    for (const row of Array.from(xml.getElementsByTagNameNS('*', 'row'))) {
      const values: string[] = [];
      for (const cell of Array.from(row.getElementsByTagNameNS('*', 'c'))) {
        const valueNode = cell.getElementsByTagNameNS('*', 'v')[0];
        const inline = cell.getElementsByTagNameNS('*', 't')[0];
        const raw = valueNode?.textContent || inline?.textContent || '';
        const value = cell.getAttribute('t') === 's' ? sharedStrings[Number(raw)] || '' : raw;
        values.push(`${cell.getAttribute('r') || ''}=${value}`);
      }
      if (values.length) output.push(`[${sheet.name}] ${values.join(' | ')}`);
      if (output.join('\n').length > MAX_ATTACHMENT_TEXT_CHARS) return output.join('\n').slice(0, MAX_ATTACHMENT_TEXT_CHARS);
    }
  }
  return normalizeText(output.join('\n'));
}

async function extractPresentation(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  if (entries.length > MAX_ARCHIVE_ENTRIES || entries.reduce((sum, entry) => sum + Number((entry as any)._data?.uncompressedSize || 0), 0) > MAX_ARCHIVE_EXPANDED_BYTES) {
    throw new Error('The presentation expands beyond the safe text-extraction limits.');
  }
  const slides = entries.filter((entry) => /^ppt\/slides\/slide\d+\.xml$/i.test(entry.name)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const output: string[] = [];
  for (const slide of slides) {
    const xml = new DOMParser().parseFromString(await slide.async('text'), 'application/xml');
    if (xml.querySelector('parsererror')) continue;
    const text = Array.from(xml.getElementsByTagNameNS('*', 't')).map((node) => node.textContent || '').join(' ');
    if (text.trim()) output.push(`[${slide.name}] ${normalizeText(text)}`);
    if (output.join('\n').length > MAX_ATTACHMENT_TEXT_CHARS) break;
  }
  return normalizeText(output.join('\n')).slice(0, MAX_ATTACHMENT_TEXT_CHARS);
}

async function extractZip(file: File): Promise<{ text: string; note?: string }> {
  if (file.size > MAX_ARCHIVE_BYTES) throw new Error(`ZIP files must be smaller than ${MAX_ARCHIVE_BYTES / 1024 / 1024} MB.`);
  const archive = await JSZip.loadAsync(file, { createFolders: false });
  const entries = Object.values(archive.files).filter((entry) => !entry.dir);
  if (entries.length > MAX_ARCHIVE_ENTRIES) throw new Error(`ZIP contains more than ${MAX_ARCHIVE_ENTRIES} files; split it into smaller archives.`);
  const expandedBytes = entries.reduce((total, entry) => total + Number((entry as any)._data?.uncompressedSize || 0), 0);
  if (expandedBytes > MAX_ARCHIVE_EXPANDED_BYTES) throw new Error('ZIP expands beyond the safe 24 MB text-extraction limit.');

  const pieces: string[] = [];
  let remaining = MAX_ATTACHMENT_TEXT_CHARS;
  let skipped = 0;
  for (const entry of entries) {
    if (remaining <= 0) { skipped += 1; continue; }
    const suffix = extensionOf(entry.name);
    if (!TEXT_EXTENSIONS.has(suffix) && !['pdf', 'docx', 'xlsx', 'pptx'].includes(suffix)) { skipped += 1; continue; }
    const expectedSize = Number((entry as any)._data?.uncompressedSize);
    if (!Number.isFinite(expectedSize) || expectedSize > MAX_ARCHIVE_EXPANDED_BYTES) { skipped += 1; continue; }
    const bytes = await entry.async('uint8array');
    const item = new File([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], entry.name);
    let text = '';
    if (suffix === 'pdf') text = (await (await import('./pdfExtraction')).extractPdfText(await item.arrayBuffer())).text;
    else if (suffix === 'docx') text = await extractDocx(item);
    else if (suffix === 'xlsx') text = await extractSpreadsheet(item);
    else if (suffix === 'pptx') text = await extractPresentation(item);
    else text = normalizeText(await readUtf8(item));
    if (!text) continue;
    const excerpt = text.slice(0, remaining);
    pieces.push(`[Archive file: ${entry.name}]\n${excerpt}`);
    remaining -= excerpt.length;
  }
  const note = skipped ? `Skipped ${skipped} unsupported, binary, or over-budget archive entries.` : undefined;
  return { text: pieces.join('\n\n'), note: pieces.length ? note : 'No supported readable files were found in the archive.' };
}

export async function prepareTaskAttachment(file: File, visionModel?: string): Promise<PreparedTaskAttachment> {
  if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} exceeds the 20 MB per-file limit.`);
  const extension = extensionOf(file.name);
  const sha256 = await checksum(file);
  let kind: PreparedTaskAttachment['kind'] = 'text';
  let extractedText = '';
  let note: string | undefined;

  if (extension === 'pdf' || file.type === 'application/pdf') {
    kind = 'pdf';
    const result = await (await import('./pdfExtraction')).extractPdfText(await file.arrayBuffer());
    extractedText = result.text;
    note = result.note;
  } else if (extension === 'zip' || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
    kind = 'zip';
    const result = await extractZip(file);
    extractedText = result.text;
    note = result.note;
  } else if (extension === 'docx' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    kind = 'word';
    extractedText = await extractDocx(file);
  } else if (extension === 'xlsx') {
    kind = 'spreadsheet';
    extractedText = await extractSpreadsheet(file);
  } else if (extension === 'pptx') {
    kind = 'presentation';
    extractedText = await extractPresentation(file);
  } else if (['jpg', 'jpeg', 'png', 'webp'].includes(extension) || file.type.startsWith('image/')) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && !['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
      throw new Error(`${file.name} is not a supported image. Use JPEG, PNG, or WebP.`);
    }
    kind = 'image';
    if (visionModel?.trim()) {
      try { extractedText = await readImageDescription(file, visionModel.trim()); }
      catch (error) { note = error instanceof Error ? error.message : 'Image analysis failed; add a description manually.'; }
    } else note = 'Add a vision-capable local model or enter an image description to include its contents.';
  } else if (TEXT_EXTENSIONS.has(extension) || file.type.startsWith('text/')) {
    extractedText = normalizeText(await readUtf8(file)).slice(0, MAX_ATTACHMENT_TEXT_CHARS);
    if (file.size > MAX_ATTACHMENT_TEXT_CHARS) note = 'Text was clipped to the per-file context budget.';
  } else {
    throw new Error(`${file.name} is not supported yet. Use a text/code file, PDF, DOCX, XLSX, PPTX, ZIP, JPEG, PNG, or WebP.`);
  }

  return { fileName: file.name, mimeType: file.type || 'application/octet-stream', sizeBytes: file.size, sha256, kind, extractedText, note };
}
