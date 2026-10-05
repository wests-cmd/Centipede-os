const SECRET_ASSIGNMENT = /(["']?\b(?:password|passcode|token|secret|credential|api[\s_-]*key|access[\s_-]*key|private[\s_-]*key)["']?\s*(?:is|=|:)\s*)("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s,;\]}]+)/gi;
const BEARER_CREDENTIAL = /\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi;
const BASIC_CREDENTIAL = /\bBasic\s+[A-Za-z0-9+/]+=*/gi;
const COMMON_CREDENTIAL = /\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{16,})\b/g;
const PRIVATE_KEY_BLOCK = /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/gi;

/** Redacts common credential formats before text is sent to browser speech synthesis. */
export function redactSpeechSecrets(text: string): string {
  return text
    .replace(SECRET_ASSIGNMENT, (_match, prefix: string, value: string) => {
      const quote = value.startsWith('"') ? '"' : value.startsWith("'") ? "'" : '';
      return `${prefix}${quote}hidden${quote}`;
    })
    .replace(BEARER_CREDENTIAL, 'Bearer hidden')
    .replace(BASIC_CREDENTIAL, 'Basic hidden')
    .replace(COMMON_CREDENTIAL, 'credential hidden')
    .replace(PRIVATE_KEY_BLOCK, 'private key hidden');
}
