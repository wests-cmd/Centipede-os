/** Decide local-only privileges from the transport peer address, never request headers alone. */
export function isLoopbackPeerAddress(address: unknown): boolean {
  if (typeof address !== 'string') return false;
  if (address === '::1') return true;

  const ipv4 = address.toLowerCase().startsWith('::ffff:') ? address.slice(7) : address;
  const octets = ipv4.split('.');
  if (octets.length !== 4 || octets.some((octet) => !/^\d{1,3}$/.test(octet))) return false;
  const values = octets.map(Number);
  if (values.some((octet) => octet > 255)) return false;
  return values[0] === 127;
}

function headerValue(headers: Record<string, unknown>, name: string): string | null {
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name);
  return typeof entry?.[1] === 'string' ? entry[1] : null;
}

/**
 * Browser origin and host checks are defense in depth against localhost CSRF and DNS rebinding.
 * They can only further restrict a request; the socket peer remains the required authority signal.
 * Native local clients without browser metadata remain supported on loopback.
 */
export function isLocalAdminRequest(
  peerAddress: unknown,
  headers: Record<string, unknown> | undefined,
  protocol: 'http' | 'https' = 'http',
): boolean {
  if (!isLoopbackPeerAddress(peerAddress) || !headers) return false;

  const host = headerValue(headers, 'host');
  if (!host) return false;

  let requestOrigin: string;
  let requestHostname: string;
  try {
    const requestUrl = new URL(`${protocol}://${host}`);
    if (requestUrl.username || requestUrl.password || requestUrl.pathname !== '/' || requestUrl.search || requestUrl.hash) return false;
    requestHostname = requestUrl.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    requestOrigin = requestUrl.origin;
  } catch {
    return false;
  }

  if (!['localhost', '127.0.0.1', '::1'].includes(requestHostname)) return false;

  const origin = headerValue(headers, 'origin');
  if (origin) {
    try {
      if (new URL(origin).origin !== requestOrigin) return false;
    } catch {
      return false;
    }
  }

  const fetchSite = headerValue(headers, 'sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') return false;

  return true;
}
