/** A phone connects to a separate HTTPS Kingdom host; it has no localhost backend. */
export function validateMobileEndpoint(raw: string): string {
  if (!raw.trim()) return '';
  const url = new URL(raw.trim());
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('Use your Kingdom HTTPS address without passwords, query parameters or fragments.');
  }
  return url.toString().replace(/\/$/, '');
}
