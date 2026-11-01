import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KingdomAdapter } from '../../src/api/kingdomAdapter';
import { centipedeServer } from '../../src/server/server';

const enabled = process.env.CENTIPEDE_LIVE_KINGDOM_TEST === '1'
  && Boolean(process.env.KINGDOM_API_URL)
  && Boolean(process.env.KINGDOM_API_TOKEN);

describe.skipIf(!enabled)('Live Kingdom through Centipede local read proxy', () => {
  const port = 3199;
  const adapter = new KingdomAdapter(`http://127.0.0.1:${port}/api/v1/kingdom`);

  beforeAll(async () => {
    centipedeServer.start(port);
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(() => centipedeServer.stop());

  it('reads live runtime identity, protocol, Knights, models, and security status without fixtures', async () => {
    const runtime = await adapter.get_status();
    expect(runtime.version).toMatch(/^v\d/);
    expect(typeof runtime.running).toBe('boolean');
    expect(runtime.protocol?.major).toBe(1);

    const [knights, models, security] = await Promise.all([
      adapter.get_knights(),
      adapter.get_models(),
      adapter.get_security_status(),
    ]);
    expect(knights.knights.length).toBeGreaterThan(0);
    expect(typeof models.ollama.available).toBe('boolean');
    expect(security.zero_trust).toBe(true);
    expect(security.deny_by_default).toBe(true);
  });
});
