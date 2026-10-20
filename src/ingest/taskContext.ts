export interface PreparedTaskAttachment {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256?: string;
  kind: 'text' | 'pdf' | 'zip' | 'word' | 'spreadsheet' | 'presentation' | 'image';
  extractedText: string;
  note?: string;
}

export interface TaskAttachmentBatch {
  attachments: PreparedTaskAttachment[];
  context: string;
  warnings: string[];
  originalCharacters: number;
  redactedValues: number;
}

const MAX_BATCH_TEXT_CHARS = 180_000;
const SECRET_ASSIGNMENT = /((?:api[_-]?key|access[_-]?token|refresh[_-]?token|password|passwd|secret|authorization|bearer)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi;
const TOKEN_VALUES = /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16})\b/g;

export function containsCredentialLikeValue(text: string): boolean {
  SECRET_ASSIGNMENT.lastIndex = 0;
  TOKEN_VALUES.lastIndex = 0;
  return SECRET_ASSIGNMENT.test(text) || TOKEN_VALUES.test(text) || text.includes('-----BEGIN PRIVATE KEY-----');
}

function redactCredentialLikeValues(text: string): { text: string; count: number } {
  let count = 0;
  const withoutPrivateKey = text.replace(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, () => {
    count += 1;
    return '[REDACTED PRIVATE KEY]';
  });
  const withoutAssignments = withoutPrivateKey.replace(SECRET_ASSIGNMENT, (_match, prefix: string) => {
    count += 1;
    return `${prefix}[REDACTED]`;
  });
  const redacted = withoutAssignments.replace(TOKEN_VALUES, () => {
    count += 1;
    return '[REDACTED TOKEN]';
  });
  SECRET_ASSIGNMENT.lastIndex = 0;
  TOKEN_VALUES.lastIndex = 0;
  return { text: redacted, count };
}

export function buildTaskAttachmentContext(attachments: PreparedTaskAttachment[]): TaskAttachmentBatch {
  const totalCharacters = attachments.reduce((sum, file) => sum + file.extractedText.length, 0);
  let remaining = MAX_BATCH_TEXT_CHARS;
  const contextBlocks: string[] = [];
  const warnings: string[] = [];
  let redactedValues = 0;
  const prepared = attachments.map((file) => {
    if (file.note) warnings.push(`${file.fileName}: ${file.note}`);
    if (!file.extractedText) return file;
    if (remaining <= 0) {
      warnings.push(`${file.fileName}: extracted text was omitted because the combined context limit was reached.`);
      return { ...file, extractedText: '' };
    }
    const safeText = redactCredentialLikeValues(file.extractedText);
    redactedValues += safeText.count;
    const excerpt = safeText.text.slice(0, remaining);
    remaining -= excerpt.length;
    if (excerpt.length < file.extractedText.length) warnings.push(`${file.fileName}: clipped to fit the combined context limit.`);
    contextBlocks.push(`[Untrusted reference: ${file.fileName} | ${file.kind} | ${file.sha256 ? `SHA-256 ${file.sha256}` : 'checksum unavailable'}]\n${excerpt}`);
    return { ...file, extractedText: excerpt, ...(safeText.count ? { note: `${file.note ? `${file.note} ` : ''}Redacted ${safeText.count} likely credential value(s) before context use.` } : {}) };
  });
  if (redactedValues) warnings.push(`Redacted ${redactedValues} likely credential value(s) from extracted file text.`);
  return { attachments: prepared, context: contextBlocks.join('\n\n'), warnings, originalCharacters: totalCharacters, redactedValues };
}
