import { describe, expect, it } from 'vitest';
import { buildTaskAttachmentContext, containsCredentialLikeValue } from '../../src/ingest/taskContext';

describe('task context preparation', () => {
  it('keeps file provenance and marks extracted contents as untrusted', () => {
    const batch = buildTaskAttachmentContext([{
      fileName: 'report.pdf', mimeType: 'application/pdf', sizeBytes: 100, sha256: 'a'.repeat(64),
      kind: 'pdf', extractedText: 'Quarterly revenue was $4.2m.',
    }]);
    expect(batch.context).toContain('[Untrusted reference: report.pdf | pdf');
    expect(batch.context).toContain('SHA-256 ' + 'a'.repeat(64));
    expect(batch.context).toContain('Quarterly revenue was $4.2m.');
    expect(batch.originalCharacters).toBe(28);
  });

  it('redacts likely credentials before reference text is sent to a model or task', () => {
    const batch = buildTaskAttachmentContext([{
      fileName: 'config.txt', mimeType: 'text/plain', sizeBytes: 100,
      kind: 'text', extractedText: 'api_key=super-secret-value-123 and public setting=true',
    }]);
    expect(batch.redactedValues).toBe(1);
    expect(batch.context).not.toContain('super-secret-value-123');
    expect(batch.context).toContain('api_key=[REDACTED]');
    expect(containsCredentialLikeValue('password: super-secret-value-123')).toBe(true);
  });

  it('bounds the combined extracted context while preserving attachment warnings', () => {
    const batch = buildTaskAttachmentContext([
      { fileName: 'one.txt', mimeType: 'text/plain', sizeBytes: 1, kind: 'text', extractedText: 'x'.repeat(120_000) },
      { fileName: 'two.pdf', mimeType: 'application/pdf', sizeBytes: 1, kind: 'pdf', extractedText: 'y'.repeat(120_000), note: 'Read first 80 pages.' },
    ]);
    expect(batch.context.length).toBeLessThanOrEqual(180_000 + 400);
    expect(batch.warnings.some((warning) => warning.includes('Read first 80 pages'))).toBe(true);
    expect(batch.warnings.some((warning) => warning.includes('clipped'))).toBe(true);
  });
});
