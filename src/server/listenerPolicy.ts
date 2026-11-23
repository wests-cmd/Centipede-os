/** Trusted deployment configuration, not an HTTP Host header.
 * A fresh local desktop must not listen on the LAN without explicit opt-in.
 */
export function listenerHosts(configured?: string): string[] {
  if (!configured?.trim()) return ['127.0.0.1'];
  const hosts = configured.split(',').map(host => host.trim()).filter(Boolean);
  if (hosts.length === 0 || hosts.length > 8)
    throw new Error('Centipede HOST must specify 1–8 explicit listening addresses.');
  if (hosts.some(host => host.length > 253 || /[\/\\@\s]/.test(host)))
    throw new Error('Centipede HOST includes an invalid listener name.');
  return [...new Set(hosts)];
}
