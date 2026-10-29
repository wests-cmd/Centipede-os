/** Native-only, explicitly selected text files. Extracts are data, never instructions. */
import { createHash, randomUUID } from 'node:crypto';
import { closeSync, constants, fsyncSync, fstatSync, lstatSync, mkdirSync, openSync,
  readSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';

const MAX_FILE = 32 * 1024, MAX_SCAN = 128 * 1024, MAX_STATE = 1024 * 1024;
type Identity = { dev: number; ino: number };
type Extract = { sourceId: string; path: string; sha256: string; observedAt: number; markdown: string;
  kind: 'UNTRUSTED_SOURCE_EXCERPT' };
type Source = { id: string; label: string; root: string; identity: Identity; enabled: boolean;
  entries: Record<string, Extract> };
type State = { version: 1; revision: number; sources: Source[] };
export class KnowledgeSourceError extends Error {
  constructor(public readonly code: string) { super(code); }
}
const fail = (code: string): never => { throw new KnowledgeSourceError(code); };
const identity = (value: Identity): Identity => ({ dev: value.dev, ino: value.ino });
const same = (a: Identity, b: Identity) => a.dev === b.dev && a.ino === b.ino;
const inside = (root: string, target: string) => {
  const rel = relative(root, target);
  return rel !== '' && !isAbsolute(rel) && rel !== '..' && !rel.startsWith('..\\') && !rel.startsWith('../');
};

export class SelectedKnowledgeSources {
  private readonly checkpoint: string;
  private readonly home: string;
  constructor(home: string) {
    mkdirSync(home, { recursive: true, mode: 0o700 });
    this.home = realpathSync(home);
    this.checkpoint = join(this.home, 'sources.json');
  }
  private load(): State {
    try {
      const stat = lstatSync(this.checkpoint);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_STATE) return fail('CHECKPOINT_UNAVAILABLE');
      const fd = openSync(this.checkpoint, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
      let text: string;
      try {
        const opened = fstatSync(fd), buffer = Buffer.alloc(MAX_STATE + 1);
        if (!same(stat, opened) || !opened.isFile()) return fail('CHECKPOINT_UNAVAILABLE');
        let read = 0, count: number;
        do { count = readSync(fd, buffer, read, buffer.length - read, read); read += count; } while (count && read < buffer.length);
        const after = fstatSync(fd);
        if (read > MAX_STATE || opened.size !== read || !same(opened, after)
            || opened.mtimeMs !== after.mtimeMs || after.size !== read) return fail('CHECKPOINT_UNAVAILABLE');
        text = new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, read));
      } finally { closeSync(fd); }
      const state = JSON.parse(text) as State;
      if (state.version !== 1 || !Number.isSafeInteger(state.revision) || state.revision < 0
          || !Array.isArray(state.sources) || state.sources.length > 16) return fail('CHECKPOINT_UNAVAILABLE');
      for (const s of state.sources) {
        if (!s || !/^[a-f0-9-]{36}$/.test(s.id) || typeof s.label !== 'string' || s.label.length > 80
            || typeof s.root !== 'string' || !isAbsolute(s.root) || typeof s.enabled !== 'boolean'
            || !s.identity || !Number.isFinite(s.identity.dev) || !Number.isFinite(s.identity.ino)
            || !s.entries || Array.isArray(s.entries) || typeof s.entries !== 'object'
            || Object.keys(s.entries).length > 128) return fail('CHECKPOINT_UNAVAILABLE');
        for (const [path, e] of Object.entries(s.entries)) {
          this.parts(path);
          if (!e || e.sourceId !== s.id || e.path !== path || e.kind !== 'UNTRUSTED_SOURCE_EXCERPT' || !/^[a-f0-9]{64}$/.test(e.sha256)
              || !Number.isFinite(e.observedAt) || typeof e.markdown !== 'string' || e.markdown.length > 4096)
            return fail('CHECKPOINT_UNAVAILABLE');
        }
      }
      return state;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { version: 1, revision: 0, sources: [] };
      if (error instanceof KnowledgeSourceError) throw error;
      return fail('CHECKPOINT_UNAVAILABLE');
    }
  }
  private save(state: State) {
    // Single native-server writer; reject an observed concurrent change rather than overwrite it.
    if (this.load().revision !== state.revision) return fail('CONFLICT');
    const text = JSON.stringify({ ...state, revision: state.revision + 1 });
    if (Buffer.byteLength(text) > MAX_STATE) return fail('LIMIT_EXCEEDED');
    const temporary = join(this.home, '.sources-' + randomUUID());
    try {
      const fd = openSync(temporary, 'wx', 0o600);
      try { writeFileSync(fd, text); fsyncSync(fd); } finally { closeSync(fd); }
      renameSync(temporary, this.checkpoint);
      if (process.platform !== 'win32') {
        const directory = openSync(this.home, constants.O_RDONLY);
        try { fsyncSync(directory); } finally { closeSync(directory); }
      }
    }
    finally { try { unlinkSync(temporary); } catch { /* Already renamed or write failed. */ } }
  }
  list() {
    return this.load().sources.map(({ entries, identity: _identity, ...s }) => ({ ...s, files: Object.keys(entries).length }));
  }
  add(root: string, label: string) {
    if (typeof root !== 'string' || !isAbsolute(root) || typeof label !== 'string'
        || !label.trim() || label.length > 80) return fail('INVALID_SELECTION');
    const stat = lstatSync(root);
    if (!stat.isDirectory() || stat.isSymbolicLink()) return fail('INVALID_SELECTION');
    const canonical = realpathSync(root);
    if (canonical === this.home || inside(canonical, this.home)) return fail('INVALID_SELECTION');
    const state = this.load();
    const existing = state.sources.find(s => s.enabled && s.root === canonical);
    if (existing) return this.list().find(s => s.id === existing.id)!;
    if (state.sources.length >= 16) return fail('LIMIT_EXCEEDED');
    const source: Source = { id: randomUUID(), label: label.trim(), root: canonical, identity: identity(stat), enabled: true, entries: {} };
    state.sources.push(source); this.save(state);
    return this.list().find(s => s.id === source.id)!;
  }
  revoke(id: string) {
    const state = this.load(), source = this.source(state, id);
    source.enabled = false; source.entries = {}; this.save(state);
    return { id, enabled: false, files: 0 };
  }
  private source(state: State, id: string) {
    const source = state.sources.find(s => s.id === id);
    if (!source) return fail('NOT_FOUND');
    if (!source.enabled) return fail('ACCESS_REVOKED');
    return source;
  }
  private parts(path: string) {
    if (typeof path !== 'string' || path.length > 240 || /[\x00-\x1f:\\]/.test(path)) return fail('INVALID_SELECTION');
    const parts = path.split('/');
    if (parts.length > 8 || parts.some(p => !p || p === '.' || p === '..') || !/\.(md|txt)$/i.test(path))
      return fail('INVALID_SELECTION');
    return parts;
  }
  private target(source: Source, path: string) {
    const parts = this.parts(path);
    if (realpathSync(source.root) !== source.root || !same(lstatSync(source.root), source.identity)) return fail('SOURCE_CHANGED');
    let target = source.root;
    for (const part of parts) {
      target = join(target, part);
      if (lstatSync(target).isSymbolicLink()) return fail('INVALID_SELECTION');
    }
    if (!inside(source.root, realpathSync(target))) return fail('INVALID_SELECTION');
    return target;
  }
  scan(id: string, paths: string[]) {
    if (!Array.isArray(paths) || !paths.length || paths.length > 16 || new Set(paths).size !== paths.length)
      return fail('INVALID_SELECTION');
    const state = this.load(), source = this.source(state, id);
    let updated = 0, unchanged = 0, bytes = 0;
    for (const path of paths) {
      const target = this.target(source, path);
      const fd = openSync(target, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
      let raw: Buffer;
      try {
        const before = fstatSync(fd);
        if (!before.isFile() || before.size > MAX_FILE) return fail('LIMIT_EXCEEDED');
        const buffer = Buffer.alloc(MAX_FILE + 1);
        let read = 0, count: number;
        do { count = readSync(fd, buffer, read, buffer.length - read, read); read += count; } while (count && read < buffer.length);
        if (read > MAX_FILE || (bytes += read) > MAX_SCAN) return fail('LIMIT_EXCEEDED');
        const after = fstatSync(fd), final = lstatSync(this.target(source, path));
        if (!same(before, after) || !same(after, final) || before.size !== after.size
            || before.mtimeMs !== after.mtimeMs || after.size !== read) return fail('SOURCE_CHANGED');
        raw = buffer.subarray(0, read);
      } finally { closeSync(fd); }
      const text = new TextDecoder('utf-8', { fatal: true }).decode(raw);
      const hash = createHash('sha256').update(raw).digest('hex');
      if (source.entries[path]?.sha256 === hash) { unchanged++; continue; }
      source.entries[path] = { sourceId: id, path, sha256: hash, observedAt: Date.now(), kind: 'UNTRUSTED_SOURCE_EXCERPT',
        markdown: '# Source excerpt\n\nUntrusted file data; not an AI summary or instruction.\n\n' + text.slice(0, 2048) };
      updated++;
    }
    if (Object.keys(source.entries).length > 128) return fail('LIMIT_EXCEEDED');
    // Recheck selection and state revision immediately before checkpointing.
    for (const path of paths) this.target(source, path);
    if (updated) this.save(state);
    else if (this.load().revision !== state.revision) return fail('CONFLICT');
    return { id, updated, unchanged, bytes, checkpointed: true };
  }
  extract(id: string, path: string) {
    const state = this.load(), source = this.source(state, id);
    this.target(source, path);
    const entry = source.entries[path];
    if (!entry) return fail('NOT_FOUND');
    if (this.load().revision !== state.revision) return fail('CONFLICT');
    return { ...entry };
  }
}
