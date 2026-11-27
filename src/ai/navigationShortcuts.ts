import { validShortcut, type NavigationShortcut } from './deterministicRouter';
const KEY='centipede.segmentor.navigation-shortcuts.v1';
const LIMIT=32;

export function readShortcuts(storage:Pick<Storage,'getItem'>):NavigationShortcut[] {
  try {
    const raw=storage.getItem(KEY);
    if (!raw || raw.length>16000) return [];
    const rows:unknown=JSON.parse(raw);
    if (!Array.isArray(rows) || rows.length>LIMIT) return [];
    const result:NavigationShortcut[]=[];
    for (const row of rows) {
      if (!validShortcut(row) || result.some(r=>r.phrase===row.phrase)) return [];
      result.push({phrase:row.phrase,destination:row.destination});
    }
    return result;
  } catch { return []; }
}
export function saveShortcuts(storage:Pick<Storage,'setItem'>,rows:readonly NavigationShortcut[]) {
  if (rows.length>LIMIT || rows.some(row=>!validShortcut(row)) || new Set(rows.map(row=>row.phrase)).size!==rows.length)
    throw new Error('Invalid shortcut list or maximum of 32 reached.');
  storage.setItem(KEY,JSON.stringify(rows.map(row=>({phrase:row.phrase,destination:row.destination}))));
}
export function localShortcuts():NavigationShortcut[] {
  try { return readShortcuts(window.localStorage); } catch { return []; }
}
