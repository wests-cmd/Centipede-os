import { describe, expect, it } from 'vitest';
import { apiRouter } from '../../src/server/routes';
import { readHostTelemetry } from '../../src/server/hostTelemetry';
import { buildVisibilityCards, deriveVisibilityAlerts, telemetryIsFresh, type VisibilitySnapshot } from '../../src/visibility/state';

const empty = (connection: VisibilitySnapshot['connection'] = 'DISCONNECTED'): VisibilitySnapshot => ({
  connection, host:null, hostError:null, tasks:null, approvals:null, nodes:null, models:null,
  skills:null, security:null, events:null, audit:null, browserOnline:null,
});

describe('local-only Command Center host metrics', () => {
  it('denies LAN, unauthenticated, or non-local access without returning metrics', async () => {
    const response = await apiRouter.handleRequest({path:'/api/v1/visibility/host',method:'GET',isLocalAdmin:false});
    expect(response).toEqual({status:403,error:expect.any(String)});
    expect('data' in response).toBe(false);
  });
  it('does not accept writes, including requests from a local operator', async () => {
    for (const method of ['POST','DELETE','PUT'] as const) {
      const result = await apiRouter.handleRequest({path:'/api/v1/visibility/host',method,isLocalAdmin:true});
      expect(result.status).toBe(405);
      expect(result.data).toBeUndefined();
    }
  });
  it('returns a bounded, labelled snapshot only when local-admin transport is authenticated', async () => {
    const direct = readHostTelemetry();
    expect(direct.scope).toBe('local-centipede-server-kernel-view');
    expect(direct.observedAt).toBeGreaterThan(0);
    expect(direct.staleAfterMs).toBe(20000);
    expect(direct.serverProcessRssMiB).toBeGreaterThan(0);
    expect(direct).not.toHaveProperty('processList');
    expect(direct).not.toHaveProperty('username');
    const response = await apiRouter.handleRequest({path:'/api/v1/visibility/host',method:'GET',isLocalAdmin:true});
    expect(response.status).toBe(200);
    expect(response.data?.scope).toBe('local-centipede-server-kernel-view');
    expect(JSON.stringify(response)).not.toContain('KINGDOM_API_TOKEN');
  });
});

describe('visibility truth contract', () => {
  it('never labels absent measurements and disconnected Kingdom as healthy', () => {
    const cards = buildVisibilityCards(empty(), '1.0.1');
    expect(cards).toHaveLength(16);
    expect(cards.find(c=>c.id==='system')?.state).toBe('unverified');
    expect(cards.find(c=>c.id==='tasks')?.state).toBe('unverified');
    expect(cards.find(c=>c.id==='kingdom')?.state).toBe('attention');
    expect(cards.find(c=>c.id==='backups')?.value).toBe('Not verified');
    expect(cards.find(c=>c.id==='updates')?.description).toContain('not checked');
  });
  it('expires readings and retains unknown instead of presenting stale CPU values', () => {
    const host = {
      scope: 'local-centipede-server-kernel-view' as const,
      observedAt:1000,staleAfterMs:20000,platform:'linux',logicalCpus:2,cpuUsagePercent:42,
      memory:{totalMiB:4096,freeMiB:100,availableMiB:200},
      serverProcessRssMiB:90,serviceVolume:null,osUptimeSeconds:123,limitations:'kernel view',
    };
    expect(telemetryIsFresh(host,20000)).toBe(true);
    expect(telemetryIsFresh(host,22001)).toBe(false);
    const cards = buildVisibilityCards({...empty(),host},'1.0.1',22001);
    expect(cards.find(c=>c.id==='performance')?.value).toBe('Not verified');
    expect(deriveVisibilityAlerts({...empty(),host},22001).some(a=>a.id==='low-memory')).toBe(false);
    expect(deriveVisibilityAlerts({...empty(),host},20000).some(a=>a.id==='low-memory')).toBe(true);
  });
  it('does not infer task verification from reported task completion', () => {
    const cards = buildVisibilityCards({...empty('CONNECTED'),tasks:[{id:'real-id',prompt:'',status:'completed'}]},'1.0.1');
    expect(cards.find(c=>c.id==='tasks')?.description).toContain('not proof of verified work');
    expect(cards.find(c=>c.id==='devices')?.value).toBe('Not verified');
  });
  it('alerts on connection loss and pending approvals without treating inbox as an audit log', () => {
    const disconnected = deriveVisibilityAlerts(empty('DISCONNECTED'));
    expect(disconnected.some(a=>a.id==='kingdom-offline')).toBe(true);
    const authorized = deriveVisibilityAlerts({...empty('CONNECTED'),approvals:[{
      id:'a',capability:'x',operation:'y',reason:'z',requesting_actor:'p',risk_level:'HIGH',status:'pending',
    }]});
    expect(authorized.some(a=>a.id==='pending-approvals')).toBe(true);
    expect(authorized.some(a=>a.id==='kingdom-offline')).toBe(false);
  });
});
