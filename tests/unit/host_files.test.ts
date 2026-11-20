import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apiRouter } from '../../src/server/routes';
import { resetOwnerActionSessionsForTests } from '../../src/server/kingdomAction';

const secret = 'test-local-files-owner-access-secret-over-32-characters';
const oldRoot = process.env.CENTIPEDE_FILES_ROOT;
const oldToken = process.env.KINGDOM_API_TOKEN;
const oldURL = process.env.KINGDOM_API_URL;
let root = '';
let session = '';
const request = (action: string, body: object, local = true, token = session) =>
  apiRouter.handleRequest({ path: `/api/v1/host-files/${action}`, method: 'POST',
    body, isLocalAdmin: local, headers: { 'x-centipede-owner-intent':'1', 'x-centipede-action-session': token } });
beforeEach(async () => {
  resetOwnerActionSessionsForTests();
  root = await mkdtemp(join(tmpdir(), 'centipede-files-test-'));
  process.env.CENTIPEDE_FILES_ROOT = root;
  process.env.KINGDOM_API_URL = 'http://127.0.0.1:8000';
  process.env.KINGDOM_API_TOKEN = secret;
  const login = await apiRouter.handleRequest({ path:'/api/v1/kingdom/actions/unlock', method:'POST', isLocalAdmin:true,
    body:{ ownerCode: secret }, headers:{ 'x-centipede-owner-intent':'1' } });
  expect(login.status).toBe(200);
  session = login.data.sessionToken;
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
  if (oldRoot === undefined) delete process.env.CENTIPEDE_FILES_ROOT; else process.env.CENTIPEDE_FILES_ROOT = oldRoot;
  if (oldToken === undefined) delete process.env.KINGDOM_API_TOKEN; else process.env.KINGDOM_API_TOKEN = oldToken;
  if (oldURL === undefined) delete process.env.KINGDOM_API_URL; else process.env.KINGDOM_API_URL = oldURL;
});

describe('Centipede local Files security', () => {
  it('persists and reads a real on-disk text file', async () => {
    expect((await request('list',{directory:''})).data.entries).toEqual([]);
    expect((await request('mkdir',{directory:'',name:'Projects'})).status).toBe(201);
    expect((await request('create',{directory:'Projects',name:'notes.txt',content:'real data'})).status).toBe(201);
    const files = await request('list',{directory:'Projects'});
    expect(files.data.entries[0].name).toBe('notes.txt');
    expect((await request('read',{path:'Projects/notes.txt'})).data.content).toBe('real data');
    expect(await readFile(join(root,'Projects','notes.txt'),'utf8')).toBe('real data');
  });
  it('blocks remote clients, missing sessions, wrong method and owner intent', async () => {
    expect((await request('list',{directory:''}, false)).status).toBe(403);
    expect((await request('list',{directory:''}, true, '')).status).toBe(401);
    expect((await apiRouter.handleRequest({path:'/api/v1/host-files/list',method:'GET',isLocalAdmin:true})).status).toBe(405);
    expect((await apiRouter.handleRequest({path:'/api/v1/host-files/list',method:'POST',isLocalAdmin:true,headers:{'x-centipede-action-session':session},body:{directory:''}})).status).toBe(401);
  });
  it('denies traversal and symbolic links, including linked parent folders', async () => {
    for (const path of ['../outside','/etc','a/../../secret','.hidden','x\\..\\secret'])
      expect((await request('list',{directory:path})).status).toBe(422);
    await symlink(tmpdir(), join(root, 'escape'));
    expect((await request('list',{directory:'escape'})).status).toBe(403);
    expect((await request('read',{path:'escape/config'})).status).toBe(403);
  });
  it('never overwrites existing files and bounds content size', async () => {
    expect((await request('create',{directory:'',name:'safe.txt',content:'original'})).status).toBe(201);
    expect((await request('create',{directory:'',name:'safe.txt',content:'override'})).status).toBe(409);
    expect(await readFile(join(root,'safe.txt'),'utf8')).toBe('original');
    expect((await request('create',{directory:'',name:'huge.txt',content:'x'.repeat(128*1024+1)})).status).toBe(413);
  });
  it('revokes Files access immediately after owner locks', async () => {
    expect((await apiRouter.handleRequest({path:'/api/v1/kingdom/actions/lock',method:'POST',isLocalAdmin:true,
      headers:{'x-centipede-owner-intent':'1','x-centipede-action-session':session},body:{}})).status).toBe(200);
    expect((await request('list',{directory:''})).status).toBe(401);
  });
});
