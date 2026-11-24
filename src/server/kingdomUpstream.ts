/** A bearer credential may only leave this host over authenticated HTTPS.
 * HTTP is supported exclusively for explicit loopback development/runtime.
 * Never infer trust from LAN/Docker DNS names or forwarded headers.
 */
export function trustedKingdomBase(raw: string): URL | null {
  try {
    const base = new URL(raw);
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) return null;
    const host = base.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (base.protocol === 'http:' && !['localhost', '127.0.0.1', '::1'].includes(host)) return null;
    return base;
  } catch { return null; }
}
