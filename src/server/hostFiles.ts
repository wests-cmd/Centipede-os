import { constants } from 'node:fs';
import { lstat, mkdir, open, opendir, realpath, unlink, link } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { join, resolve, isAbsolute } from 'node:path';
import type { ApiRequest, ApiResponse } from './routes';
import { isLocalOwnerActionAuthorized } from './kingdomAction';
import { isPrivateWindowsDirectory } from './windowsFilesAcl';

const PREFIX = '/api/v1/host-files';
const MAX_TEXT = 128 * 1024;
const MAX_COPY = 32 * 1024 * 1024; // streamed binary copy, no large in-memory buffers
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
  // Reject Windows device names and nonportable special characters on every OS.
  // This prevents a file created on Linux from becoming a device path on Windows.
  if (parts.some(p => /[<>"|?*]/.test(p) || /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(p)))
    throw new FileError(422, 'Reserved or nonportable Files name.');
  return parts;
}
async function rootDirectory(): Promise<string> {
  const root = resolve(process.env.CENTIPEDE_FILES_ROOT || join(process.cwd(), 'data', 'files'));
  if (root === resolve('/') || root === resolve(process.cwd())) throw new FileError(503, 'Configure a dedicated Files root.');
  await mkdir(root, { recursive: true, mode: 0o700 });
  const stat = await lstat(root);
  if (!stat.isDirectory() || stat.isSymbolicLink() || await realpath(root) !== root)
    throw new FileError(503, 'Files root must be a private real directory.');
  // A directory writable only by its owner may still be readable/traversable
  // by every account (0755). The Files workspace is private user data: all
  // group/other permission bits must be absent, and POSIX ownership must
  // belong to the current unprivileged service account.
  const privateDirectory = process.platform === 'win32'
    ? await isPrivateWindowsDirectory(root)
    : (stat.mode & 0o077) === 0 &&
      (typeof process.getuid !== 'function' || stat.uid === process.getuid());
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
        if (!stat.isFile() || stat.nlink !== 1) throw new FileError(403, 'Only independent regular files may be previewed.');
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
    if (req.path === `${PREFIX}/copy`) {
      // Only read and write under the authorized private Files root.
      // No symlink traversal, source deletion or destination overwrite.
      const parts = segments(req.body?.path, false);
      const source = await checked(root, parts, 'file');
      const parents = segments(req.body?.directory);
      const directory = await checked(root, parents, 'dir');
      const name = segments(req.body?.name, false);
      if (name.length !== 1) throw new FileError(422, 'Provide a single destination filename.');
      const target = join(directory, name[0]);
      // Publish only a fully synced copy. An interrupted operation must not
      // leave a destination that looks complete. A hard-link publish refuses
      // an existing name, unlike rename() which may silently overwrite it.
      const temporary = join(directory, '.centipede-copy-' + randomBytes(16).toString('hex'));
      const sourceHandle = await open(source, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
      let targetHandle: Awaited<ReturnType<typeof open>> | undefined;
      let bytesCopied = 0;
      let temporaryOwned = false;
      try {
        const before = await sourceHandle.stat();
        if (!before.isFile() || before.nlink !== 1) throw new FileError(403, 'Only independent regular files can be copied.');
        if (before.size > MAX_COPY) throw new FileError(413, 'Copy limit is 32 MiB per file.');
        try {
          targetHandle = await open(temporary,
            constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW || 0), 0o600);
          temporaryOwned = true;
        } catch (error: any) {
          if (error?.code === 'EEXIST')
            throw new FileError(503, 'Temporary copy name collision; retry after inspecting workspace.');
          throw error;
        }
        const buffer = Buffer.allocUnsafe(64 * 1024);
        while (true) {
          const { bytesRead } = await sourceHandle.read(buffer, 0, buffer.length, null);
          if (!bytesRead) break;
          bytesCopied += bytesRead;
          if (bytesCopied > MAX_COPY) throw new FileError(413, 'Source grew beyond 32 MiB while copying.');
          let offset = 0;
          while (offset < bytesRead) {
            const { bytesWritten } = await targetHandle.write(buffer, offset, bytesRead - offset, null);
            if (!bytesWritten) throw new FileError(500, 'File copy was interrupted.');
            offset += bytesWritten;
          }
        }
        const after = await sourceHandle.stat();
        if (before.size !== bytesCopied || after.size !== bytesCopied || after.nlink !== 1 ||
            before.mtimeMs !== after.mtimeMs)
          throw new FileError(409, 'Source changed during copy; no destination was retained.');
        await targetHandle.sync();
        await targetHandle.close();
        targetHandle = undefined;
        try { await link(temporary, target); }
        catch (error: any) {
          if (error?.code === 'EEXIST' || error?.code === 'EISDIR')
            throw new FileError(409, 'Destination exists. No file was overwritten.');
          throw error;
        }
      } finally {
        try { await targetHandle?.close(); }
        finally {
          if (temporaryOwned) await unlink(temporary).catch(() => {});
          await sourceHandle.close();
        }
      }
      return { status: 201, data: {
        copied: true, source: parts.join('/'), path: [...parents, name[0]].join('/'),
        size: bytesCopied,
      } };
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
      // Write and fsync a private staging file before publishing its name.
      // Never expose a partial text file or replace another operation's target.
      const temporary = join(directory, '.centipede-create-' + randomBytes(16).toString('hex'));
      let handle: Awaited<ReturnType<typeof open>> | undefined;
      let temporaryOwned = false;
      try {
        handle = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW || 0), 0o600);
        temporaryOwned = true;
        await handle.writeFile(content, 'utf8');
        await handle.sync();
        await handle.close();
        handle = undefined;
        try { await link(temporary, target); }
        catch (e: any) {
          if (e?.code === 'EEXIST' || e?.code === 'EISDIR') throw new FileError(409, 'Overwriting files is not allowed.');
          throw e;
        }
      } finally {
        try { await handle?.close(); }
        finally { if (temporaryOwned) await unlink(temporary).catch(() => {}); }
      }
      return { status: 201, data: { created: true, path: [...parents, name[0]].join('/') } };
    }
    return { status: 404, error: 'Unsupported Files operation.' };
  } catch (e) {
    if (e instanceof FileError) return { status: e.code, error: e.message };
    return { status: 500, error: 'Files operation failed; inspect local workspace permissions.' };
  }
}
