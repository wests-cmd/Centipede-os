import { networkInterfaces } from 'node:os';

/**
 * A loopback-only Centipede service must not enumerate network interfaces:
 * getifaddrs may use AF_NETLINK, which systemd RestrictAddressFamilies does
 * not grant to this hardened service. Interface discovery is optional UI
 * convenience, never a prerequisite for local API/desktop startup.
 */
export function discoverLanAddress(
  configuredHost: string | undefined,
  reader: typeof networkInterfaces = networkInterfaces,
): string | undefined {
  const configured = configuredHost?.split(',').map(h => h.trim().toLowerCase()).filter(Boolean) || [];
  if (configured.length && configured.every(h =>
    ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(h))) return undefined;
  try {
    const interfaces = Object.values(reader()).flat().filter((entry): entry is NonNullable<typeof entry> =>
      Boolean(entry && entry.family === 'IPv4' && !entry.internal));
    const isPrivate = (address: string) => address.startsWith('10.') ||
      address.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[01])\./.test(address);
    return interfaces.find(entry => isPrivate(entry.address))?.address ||
      interfaces.find(entry => !entry.address.startsWith('169.254.'))?.address;
  } catch {
    // Network enumeration is not required for a secure local-only server.
    // The operator may set PUBLIC_URL to advertise a known reachable address.
    return undefined;
  }
}
