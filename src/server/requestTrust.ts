/** Decide local-only privileges from the transport peer address, never request headers. */
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
