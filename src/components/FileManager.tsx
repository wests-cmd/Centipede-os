import React, { useEffect, useState } from 'react';
import { kingdomActions, type HostFileItem } from '../api/kingdomActions';
import { KingdomActionUnlock } from './KingdomActionUnlock';
import { Folder, FileText, ArrowUp, RefreshCw, FolderPlus, FilePlus } from 'lucide-react';

/** A real private on-disk workspace, not a full-disk or browser-simulated file manager. */
export const FileManager: React.FC = () => {
  const [unlocked, setUnlocked] = useState(kingdomActions.isUnlocked());
  const [directory, setDirectory] = useState('');
  const [items, setItems] = useState<HostFileItem[]>([]);
  const [selected, setSelected] = useState('');
  const [text, setText] = useState('');
  const [newName, setNewName] = useState('');
  const [newText, setNewText] = useState('');
  const [newFolder, setNewFolder] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [truncated, setTruncated] = useState(false);
  useEffect(() => kingdomActions.subscribe(setUnlocked), []);

  const refresh = async (path = directory) => {
    try {
      const data = await kingdomActions.listHostFiles(path);
      setItems(data.entries);
      setTruncated(data.truncated);
      setError('');
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : 'Files service unavailable.');
    }
  };
  useEffect(() => {
    setItems([]);
    setSelected('');
    setText('');
    if (unlocked) void refresh(directory);
  }, [unlocked, directory]);

  const openItem = async (item: HostFileItem) => {
    const path = [directory, item.name].filter(Boolean).join('/');
    if (item.kind === 'directory') { setDirectory(path); return; }
    setSelected(path); setText(''); setBusy(true); setError('');
    try { const file = await kingdomActions.readHostFile(path); setText(file.content); }
    catch (err) { setError(err instanceof Error ? err.message : 'File preview unavailable.'); }
    finally { setBusy(false); }
  };
  const createFile = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      await kingdomActions.createHostFile(directory, newName, newText);
      setNewName(''); setNewText(''); setMessage('New text file saved to the local workspace.');
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'File creation failed.'); }
    finally { setBusy(false); }
  };
  const createFolder = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      await kingdomActions.createHostDirectory(directory, newFolder);
      setNewFolder(''); setMessage('Folder created.'); await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Folder creation failed.'); }
    finally { setBusy(false); }
  };

  return <div className="p-6 max-w-5xl mx-auto space-y-5">
    <header className="p-5 rounded-2xl bg-slate-900 border border-slate-700">
      <h2 className="text-xl font-semibold text-white flex gap-2 items-center"><Folder className="text-blue-400"/>Centipede Files — Local Workspace</h2>
      <p className="text-slate-300 text-sm mt-2">Real folders and text files on this computer in one restricted Centipede directory. This is not a full-system file manager: deleting, editing, copying, external disks and binary previews are not enabled.</p>
    </header>
    <KingdomActionUnlock/>
    {!unlocked && <p role="status" className="p-3 bg-slate-900 border border-blue-800 rounded-xl text-slate-200 text-sm">Files are locked. Unlock on this computer to browse or create real files; no sample files are shown as real data.</p>}
    {error && <p role="alert" className="p-3 bg-slate-950 border border-red-800 rounded-xl text-red-300 text-sm">{error}</p>}
    {message && <p role="status" className="p-3 bg-slate-950 border border-blue-800 rounded-xl text-blue-300 text-sm">{message}</p>}
    <div className="grid md:grid-cols-3 gap-4">
      <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 space-y-3">
        <div className="flex gap-2 items-center justify-between">
          <h3 className="text-slate-200 text-sm font-semibold break-all">/{directory || 'Centipede Files'}</h3>
          <button aria-label="Parent folder" type="button" disabled={!unlocked || !directory} onClick={() => setDirectory(directory.split('/').slice(0,-1).join('/'))} className="text-blue-300 disabled:opacity-40"><ArrowUp className="w-4 h-4"/></button>
          <button aria-label="Refresh files" type="button" disabled={!unlocked || busy} onClick={() => void refresh()} className="text-blue-300 disabled:opacity-40"><RefreshCw className="w-4 h-4"/></button>
        </div>
        {!items.length && unlocked && <p className="text-sm text-slate-400">No files found in this folder.</p>}
        {items.map(item => <button type="button" key={item.name} disabled={!unlocked || busy} onClick={() => void openItem(item)}
          className="w-full flex items-center gap-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg p-2 text-slate-200 text-sm text-left disabled:opacity-40">
          {item.kind === 'directory' ? <Folder className="w-4 h-4 text-blue-400"/> : <FileText className="w-4 h-4 text-slate-400"/>}
          <span className="truncate">{item.name}</span></button>)}
        {truncated && <p className="text-xs text-slate-400">First 200 entries shown; directory listing is truncated.</p>}
      </section>
      <section className="md:col-span-2 rounded-2xl border border-slate-700 bg-slate-900 p-4 space-y-4">
        <div><h3 className="text-slate-200 font-semibold">{selected || 'Text preview'}</h3>
          <pre className="mt-2 bg-slate-950 border border-slate-800 p-3 min-h-32 rounded-xl text-xs text-slate-200 whitespace-pre-wrap break-all overflow-auto">{selected ? (text || '(Empty text or preview unavailable)') : 'Choose a text file to inspect.'}</pre>
        </div>
        <form onSubmit={createFile} className="border-t border-slate-800 pt-3 space-y-2">
          <label htmlFor="new-text-file" className="text-slate-200 text-sm flex items-center gap-2"><FilePlus className="w-4 h-4 text-blue-400"/>New text file</label>
          <input id="new-text-file" placeholder="notes.txt" value={newName} onChange={e => setNewName(e.target.value)} disabled={!unlocked} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"/>
          <textarea aria-label="New file contents" placeholder="New file contents" rows={3} value={newText} onChange={e => setNewText(e.target.value)} disabled={!unlocked} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"/>
          <button type="submit" disabled={!unlocked || busy || !newName.trim()} className="px-3 py-2 rounded-lg bg-blue-700 text-white text-sm disabled:opacity-40">Create file (no overwrite)</button>
        </form>
        <form onSubmit={createFolder} className="space-y-2">
          <label htmlFor="new-workspace-folder" className="text-slate-200 text-sm flex gap-2 items-center"><FolderPlus className="w-4 h-4 text-blue-400"/>New folder</label>
          <div className="flex flex-wrap gap-2">
            <input id="new-workspace-folder" placeholder="Projects" value={newFolder} onChange={e => setNewFolder(e.target.value)} disabled={!unlocked} className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"/>
            <button type="submit" disabled={!unlocked || busy || !newFolder.trim()} className="px-3 py-2 rounded-lg border border-blue-800 text-blue-300 text-sm disabled:opacity-40">Create folder</button>
          </div>
        </form>
      </section>
    </div>
    <p className="text-xs text-slate-400">Local-only owner session; the backend rejects path traversal, symbolic links, unsupported file types and overwrites. Full native file management remains a release requirement.</p>
  </div>;
};
