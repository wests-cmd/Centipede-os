import { constants } from 'node:fs';
import { lstat, mkdir, open, opendir, realpath } from 'node:fs/promises';
import { join, resolve, isAbsolute } from 'node:path';
import type { ApiRequest, ApiResponse } from './routes';
import { isLocalOwnerActionAuthorized } from './kingdomAction';
import { isPrivateWindowsDirectory } from './windowsFilesAcl';

const PREFIX = '/api/v1/host-files';
const MAX_TEXT = 128 * 1024;
class FileError extends Error {
  constructor(readonly code: number, message: string) { super(message); }
}
function segments(input: unknown, rootAllowed = true): string[] {
  if (typeof input !== 'string' || input.length > 600) throw new FileError(422, 'Invalid Files path.');
  if (input === '' && rootAllowed) return [];
  if (!input || isAbsolute(input) || /[\\\x00-\x1f\x7f]/.test(input)) throw new FileError(422, 'Invalid Files path.');
  const parts = input.split('/');
  if (parts.length > 8 || parts.some(p => p.length < 1 || p.length > 120 || p.startsWith('.') || p.endsWith(' ') || p.endsWith('.') || p.includes(':')))
    throw new FileError(422, 'Invalid Files path.');
  return parts;
}
async function rootDirectory(): Promise<string> {
  const root = resolve(process.env.CENTIPEDE_FILES_ROOT || join(process.cwd(), 'data', 'files'));
  if (root === resolve('/') || root === resolve(process.cwd())) throw new FileError(503, 'Configure a dedicated Files root.');
  await mkdir(root, { recursive: true, mode: 0o700 });
  const stat = await lstat(root);
  if (!stat.isDirectory() || stat.isSymbolicLink() || await realpath(root) !== root)
    throw new FileError(503, 'Files root must be a private real directory.');
  const privateDirectory = process.platform === 'win32'
    ? await isPrivateWindowsDirectory(root) : (stat.mode & 0o022) === 0;
  if (!privateDirectory) throw new FileError(503, 'Files root must be a private real directory.');
  return root;
}
async function checked(root: string, parts: string[], kind: 'file' | 'dir'): Promise<string> {
  let path = root;
  if (!parts.length && kind === 'file') throw new FileError(422, 'Select a file.');
  for (let i = 0; i < parts.length; i++) {
    path = join(path, parts[i]);
    let st;
    try { st = await lstat(path); }
    catch (e: any) { if (e?.code === 'ENOENT') throw new FileError(404, 'File or folder not found.'); throw e; }
    if (st.isSymbolicLink()) throw new FileError(403, 'Symbolic links are not allowed.');
    if (i < parts.length - 1 && !st.isDirectory()) throw new FileError(422, 'Parent is not a folder.');
    if (i === parts.length - 1 && (kind === 'dir' ? !st.isDirectory() : !st.isFile()))
      throw new FileError(422, 'Incorrect file type.');
  }
  return path;
}
/** Authenticated, fixed-surface service-owned workspace. No arbitrary host access. */
export async function handleHostFiles(req: ApiRequest): Promise<ApiResponse | null> {
  if (!req.path.startsWith(`${PREFIX}/`)) return null;
  if (req.method !== 'POST') return { status: 405, error: 'Use POST for Files.' };
  if (!req.isLocalAdmin) return { status: 403, error: 'Files are local-owner only.' };
  if (!isLocalOwnerActionAuthorized(req)) return { status: 401, error: 'Owner session required. Unlock on this computer.' };
  try {
    const root = await rootDirectory();
    if (req.path === `${PREFIX}/list`) {
      const parts = segments(req.body?.directory);
      const path = await checked(root, parts, 'dir');
      const entries: Array<{ name: string; kind: 'file' | 'directory'; size: number }> = [];
      let truncated = false;
      const dir = await opendir(path);
      for await (const item of dir) {
        if (item.name.startsWith('.') || item.isSymbolicLink() || (!item.isDirectory() && !item.isFile())) continue;
        if (entries.length >= 200) { truncated = true; break; }
        try {
          const st = await lstat(join(path, item.name));
          if (!st.isSymbolicLink()) entries.push({ name: item.name, kind: st.isDirectory() ? 'directory' : 'file', size: st.isFile() ? st.size : 0 });
        } catch { /* Entry changed during listing. */ }
      }
      entries.sort((a,b) => a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'directory' ? -1 : 1);
      return { status: 200, data: { directory: parts.join('/'), entries, truncated } };
    }
    if (req.path === `${PREFIX}/read`) {
      const parts = segments(req.body?.path, false);
      const path = await checked(root, parts, 'file');
      const handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
      try {
        const stat = await handle.stat();
        if (!stat.isFile()) throw new FileError(422, 'Only regular files may be previewed.');
        if (stat.size > MAX_TEXT) throw new FileError(413, 'Text preview limit is 128 KiB.');
        const buffer = Buffer.alloc(MAX_TEXT + 1);
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
        if (bytesRead > MAX_TEXT) throw new FileError(413, 'Text preview limit is 128 KiB.');
        let content: string;
        try { content = new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, bytesRead)); }
        catch { throw new FileError(415, 'Not a UTF-8 text file.'); }
        if (content.includes('\u0000')) throw new FileError(415, 'Binary files cannot be previewed.');
        return { status: 200, data: { path: parts.join('/'), size: bytesRead, content } };
      } finally { await handle.close(); }
    }
    if (req.path === `${PREFIX}/create` || req.path === `${PREFIX}/mkdir`) {
      const parents = segments(req.body?.directory);
      const directory = await checked(root, parents, 'dir');
      const name = segments(req.body?.name, false);
      if (name.length !== 1) throw new FileError(422, 'Provide a single filename.');
      const target = join(directory, name[0]);
      if (req.path === `${PREFIX}/mkdir`) {
        try { await mkdir(target, { mode: 0o700 }); }
        catch (e: any) { if (e?.code === 'EEXIST') throw new FileError(409, 'Name already exists.'); throw e; }
        return { status: 201, data: { created: true, directory: [...parents, name[0]].join('/') } };
      }
      const content = req.body?.content;
      if (typeof content !== 'string' || Buffer.byteLength(content, 'utf8') > MAX_TEXT)
        throw new FileError(413, 'New text content must be at most 128 KiB.');
      let handle;
      try { handle = await open(target, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW || 0), 0o600); }
      catch (e: any) { if (e?.code === 'EEXIST') throw new FileError(409, 'Overwriting files is not allowed.'); throw e; }
      try { await handle.writeFile(content, 'utf8'); await handle.sync(); }
      finally { await handle.close(); }
      return { status: 201, data: { created: true, path: [...parents, name[0]].join('/') } };
    }
    return { status: 404, error: 'Unsupported Files operation.' };
  } catch (e) {
    if (e instanceof FileError) return { status: e.code, error: e.message };
    return { status: 500, error: 'Files operation failed; inspect local workspace permissions.' };
  }
}
