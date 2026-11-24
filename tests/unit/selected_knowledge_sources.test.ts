import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, renameSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SelectedKnowledgeSources } from '../../src/server/selectedKnowledgeSources';
import { handleSelectedKnowledgeRequest } from '../../src/server/selectedKnowledgeRoutes';
import { handleKingdomAction, resetOwnerActionSessionsForTests } from '../../src/server/kingdomAction';

const temporary: string[] = [];
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'centipede-knowledge-'));
  temporary.push(root);
  const folder = join(root, 'selected'); mkdirSync(folder);
  return { folder, home: join(root, 'state') };
}
const originalOwnerToken = process.env.KINGDOM_API_TOKEN;
const originalKingdomURL = process.env.KINGDOM_API_URL;
afterEach(() => {
  temporary.splice(0).forEach(path => rmSync(path, { recursive: true, force: true }));
  if (originalOwnerToken === undefined) delete process.env.KINGDOM_API_TOKEN;
  else process.env.KINGDOM_API_TOKEN = originalOwnerToken;
  if (originalKingdomURL === undefined) delete process.env.KINGDOM_API_URL;
  else process.env.KINGDOM_API_URL = originalKingdomURL;
  resetOwnerActionSessionsForTests();
});

describe('owner-selected knowledge sources', () => {
  it('requires adapter-verified loopback AND an expiring owner session for all selected knowledge', async () => {
    const { folder, home } = fixture(); const sources = new SelectedKnowledgeSources(home);
    expect(handleSelectedKnowledgeRequest({ path: '/api/v1/knowledge/sources', method: 'POST',
      body: { root: folder, label: 'Notes' }, headers: { host: 'localhost', authorization: 'Bearer untrusted' },
      isLocalAdmin: false }, () => sources)).toMatchObject({ status: 403 });
    expect(handleSelectedKnowledgeRequest({ path: '/api/v1/knowledge/sources', method: 'POST',
      body: { root: folder, label: 'Notes' }, isLocalAdmin: true }, () => sources)).toMatchObject({ status: 401 });
    expect(handleSelectedKnowledgeRequest({ path: '/api/v1/knowledge/sources', method: 'GET',
      isLocalAdmin: true }, () => sources)).toMatchObject({ status: 401 });
    expect(sources.list()).toEqual([]);
    const ownerCode = 'selected-knowledge-owner-credential-over-thirty-two-characters';
    process.env.KINGDOM_API_URL = 'http://127.0.0.1:8000';
    process.env.KINGDOM_API_TOKEN = ownerCode;
    const login = await handleKingdomAction({ path: '/api/v1/kingdom/actions/unlock',
      method: 'POST', isLocalAdmin: true, body: { ownerCode },
      headers: { 'x-centipede-owner-intent': '1' } });
    expect(login?.status).toBe(200);
    const headers = { 'x-centipede-owner-intent': '1',
      'x-centipede-action-session': login?.data.sessionToken as string };
    expect(handleSelectedKnowledgeRequest({ path: '/api/v1/knowledge/sources', method: 'POST',
      body: { root: folder, label: 'Notes', enabled: true }, headers, isLocalAdmin: true }, () => sources)).toMatchObject({ status: 400 });
    expect(handleSelectedKnowledgeRequest({ path: '/api/v1/knowledge/sources', method: 'POST',
      body: { root: folder, label: 'Notes' }, headers, isLocalAdmin: true }, () => sources)).toMatchObject({ status: 201 });
    expect(handleSelectedKnowledgeRequest({ path: '/api/v1/knowledge/sources', method: 'GET',
      headers, isLocalAdmin: true }, () => sources)).toMatchObject({ status: 200, data: { sources: [{ label: 'Notes' }] } });
    expect((await handleKingdomAction({ path: '/api/v1/kingdom/actions/lock', method: 'POST',
      isLocalAdmin: true, headers, body: {} }))?.status).toBe(200);
    expect(handleSelectedKnowledgeRequest({ path: '/api/v1/knowledge/sources', method: 'GET',
      headers, isLocalAdmin: true }, () => sources)).toMatchObject({ status: 401 });
  });
  it('starts empty and resumes unchanged files with the same provenance after restart', () => {
    const { folder, home } = fixture(); writeFileSync(join(folder, 'note.md'), 'hello');
    const sources = new SelectedKnowledgeSources(home);
    expect(sources.list()).toEqual([]);
    const source = sources.add(folder, 'Project notes');
    expect(sources.scan(source.id, ['note.md'])).toMatchObject({ updated: 1, unchanged: 0 });
    const excerpt = sources.extract(source.id, 'note.md');
    expect(excerpt.sha256).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    expect(excerpt.markdown).toContain('hello');
    expect(excerpt.kind).toBe('UNTRUSTED_SOURCE_EXCERPT');
    const resumed = new SelectedKnowledgeSources(home);
    expect(resumed.scan(source.id, ['note.md'])).toMatchObject({ updated: 0, unchanged: 1 });
    expect(resumed.extract(source.id, 'note.md')).toEqual(excerpt);
  });

  it('revocation removes retained extracts and rejects later reads and scans after restart', () => {
    const { folder, home } = fixture(); writeFileSync(join(folder, 'note.md'), 'private');
    const sources = new SelectedKnowledgeSources(home), source = sources.add(folder, 'Notes');
    sources.scan(source.id, ['note.md']); sources.revoke(source.id);
    const restarted = new SelectedKnowledgeSources(home);
    expect(restarted.list()[0]).toMatchObject({ enabled: false, files: 0 });
    expect(() => restarted.scan(source.id, ['note.md'])).toThrow('ACCESS_REVOKED');
    expect(() => restarted.extract(source.id, 'note.md')).toThrow('ACCESS_REVOKED');
  });

  it('rejects traversal, absolute paths and file/byte overrun without a partial checkpoint', () => {
    const { folder, home } = fixture();
    writeFileSync(join(folder, 'small.txt'), 'hello'); writeFileSync(join(folder, 'large.txt'), 'a'.repeat(32769));
    const sources = new SelectedKnowledgeSources(home), source = sources.add(folder, 'Notes');
    for (const path of ['../secret.txt', '/secret.txt', 'C:/secret.txt', 'a/../../secret.txt', 'a\\secret.txt'])
      expect(() => sources.scan(source.id, [path])).toThrow('INVALID_SELECTION');
    expect(() => sources.scan(source.id, ['small.txt', 'large.txt'])).toThrow('LIMIT_EXCEEDED');
    expect(sources.list()[0].files).toBe(0);
    expect(() => sources.scan(source.id, Array.from({ length: 17 }, (_, i) => `${i}.txt`))).toThrow('INVALID_SELECTION');
  });

  it('holds when a selected root has been replaced, rather than reading the replacement', () => {
    const { folder, home } = fixture(); writeFileSync(join(folder, 'note.md'), 'old');
    const sources = new SelectedKnowledgeSources(home), source = sources.add(folder, 'Notes');
    sources.scan(source.id, ['note.md']); renameSync(folder, folder + '-old');
    mkdirSync(folder); writeFileSync(join(folder, 'note.md'), 'replacement');
    expect(() => sources.scan(source.id, ['note.md'])).toThrow('SOURCE_CHANGED');
    expect(() => sources.extract(source.id, 'note.md')).toThrow('SOURCE_CHANGED');
  });

  it('rejects an intermediate linked directory and a linked source root', () => {
    const { folder, home } = fixture(), outside = join(home, '..', 'outside'); mkdirSync(outside);
    writeFileSync(join(outside, 'secret.md'), 'outside');
    symlinkSync(outside, join(folder, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
    const sources = new SelectedKnowledgeSources(home), source = sources.add(folder, 'Notes');
    expect(() => sources.scan(source.id, ['linked/secret.md'])).toThrow('INVALID_SELECTION');
    expect(() => sources.add(join(folder, 'linked'), 'Linked')).toThrow('INVALID_SELECTION');
    expect(sources.list()[0].files).toBe(0);
  });

  it('updates one retained file version with explicit source provenance and keeps rejected batches atomic', () => {
    const { folder, home } = fixture(); writeFileSync(join(folder, 'note.txt'), 'first');
    const sources = new SelectedKnowledgeSources(home), source = sources.add(folder, 'Notes');
    sources.scan(source.id, ['note.txt']); const first = sources.extract(source.id, 'note.txt');
    writeFileSync(join(folder, 'note.txt'), 'second'); sources.scan(source.id, ['note.txt']);
    expect(sources.list()[0].files).toBe(1);
    expect(sources.extract(source.id, 'note.txt')).toMatchObject({ sourceId: source.id, path: 'note.txt' });
    expect(sources.extract(source.id, 'note.txt').sha256).not.toBe(first.sha256);
    const second = sources.extract(source.id, 'note.txt');
    writeFileSync(join(folder, 'note.txt'), 'not committed');
    writeFileSync(join(folder, 'bad.txt'), Buffer.from([0xff]));
    expect(() => sources.scan(source.id, ['note.txt', 'bad.txt'])).toThrow();
    expect(sources.extract(source.id, 'note.txt')).toEqual(second);
  });

  it('rejects aggregate scan byte overflow and corrupted checkpoints without returning data', () => {
    const { folder, home } = fixture();
    for (let i = 0; i < 5; i++) writeFileSync(join(folder, `${i}.txt`), 'x'.repeat(32768));
    const sources = new SelectedKnowledgeSources(home), source = sources.add(folder, 'Notes');
    expect(() => sources.scan(source.id, ['0.txt', '1.txt', '2.txt', '3.txt', '4.txt'])).toThrow('LIMIT_EXCEEDED');
    expect(sources.list()[0].files).toBe(0);
    writeFileSync(join(home, 'sources.json'), '{ invalid');
    expect(() => sources.list()).toThrow('CHECKPOINT_UNAVAILABLE');
  });
});
