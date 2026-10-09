import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { prepareTaskAttachment } from '../../src/ingest/taskAttachments';

describe('task attachment extraction', () => {
  it('extracts readable text and office document contents', async () => {
    const text = await prepareTaskAttachment(new File(['First line\nSecond line'], 'notes.md', { type: 'text/markdown' }));
    expect(text.kind).toBe('text');
    expect(text.extractedText).toContain('Second line');
    expect(text.sha256).toMatch(/^[a-f0-9]{64}$/);

    const docx = new JSZip();
    docx.file('word/document.xml', '<w:document xmlns:w="urn:w"><w:p><w:r><w:t>Quarterly report</w:t></w:r></w:p></w:document>');
    const docxBytes = await docx.generateAsync({ type: 'uint8array' });
    const word = await prepareTaskAttachment(new File([docxBytes.buffer.slice(docxBytes.byteOffset, docxBytes.byteOffset + docxBytes.byteLength) as ArrayBuffer], 'report.docx'));
    expect(word.kind).toBe('word');
    expect(word.extractedText).toContain('Quarterly report');
  });

  it('extracts readable members from a bounded ZIP without writing archive paths to disk', async () => {
    const archive = new JSZip();
    archive.file('../outside.csv', 'date,close\n2026-01-01,104.2');
    archive.file('image.bin', new Uint8Array([0, 1, 2, 3]));
    const bytes = await archive.generateAsync({ type: 'uint8array' });
    const prepared = await prepareTaskAttachment(new File([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], 'market.zip', { type: 'application/zip' }));
    expect(prepared.kind).toBe('zip');
    expect(prepared.extractedText).toContain('date,close');
    expect(prepared.note).toContain('Skipped 1');
  });

  it('does not claim image contents when no local vision model was selected', async () => {
    const image = await prepareTaskAttachment(new File([new Uint8Array([1, 2, 3])], 'diagram.png', { type: 'image/png' }));
    expect(image.kind).toBe('image');
    expect(image.extractedText).toBe('');
    expect(image.note).toContain('vision-capable local model');
  });
});
