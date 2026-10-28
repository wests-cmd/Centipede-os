/** One local, validated background. No remote URLs, credentials or executable formats. */
export const MAX_MEDIA_BYTES = 20 * 1024 * 1024;
export const MAX_MEDIA_PIXELS = 4096 * 4096;
export const MEDIA_CHANGED = 'centipede-home-media-changed';
export interface HomeMedia { blob: Blob; poster: Blob; name: string; kind: 'image' | 'video'; }

export function isSavedHomeMedia(value: unknown): value is HomeMedia {
  if (!value || typeof value !== 'object') return false;
  const media = value as Partial<HomeMedia>;
  return media.blob instanceof Blob && media.blob.size > 0 && media.blob.size <= MAX_MEDIA_BYTES
    && media.poster instanceof Blob && media.poster.type === 'image/png' && media.poster.size > 0 && media.poster.size <= MAX_MEDIA_BYTES
    && typeof media.name === 'string' && media.name.length <= 180
    && (media.kind === 'image' && ['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(media.blob.type)
      || media.kind === 'video' && ['video/mp4', 'video/webm'].includes(media.blob.type));
}

export function mediaKind(type: string, size: number, header: Uint8Array): HomeMedia['kind'] {
  if (!size || size > MAX_MEDIA_BYTES) throw new Error('Choose a file between 1 byte and 20 MiB.');
  const ascii = (start: number, end: number) => String.fromCharCode(...header.slice(start, end));
  const valid = type === 'image/png' && ascii(1, 4) === 'PNG' && header[0] === 137
    || type === 'image/jpeg' && header[0] === 255 && header[1] === 216 && header[2] === 255
    || type === 'image/gif' && ['GIF87a', 'GIF89a'].includes(ascii(0, 6))
    || type === 'image/webp' && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP'
    || type === 'video/mp4' && ascii(4, 8) === 'ftyp'
    || type === 'video/webm' && header[0] === 26 && header[1] === 69 && header[2] === 223 && header[3] === 163;
  if (!valid) throw new Error('Use a valid PNG, JPEG, GIF, WebP, MP4 or WebM file. SVG and web pages are not accepted.');
  return type.startsWith('video/') ? 'video' : 'image';
}

export function checkMediaDimensions(width: number, height: number, duration?: number) {
  if (!Number.isFinite(width * height) || width < 1 || height < 1 || width > 4096 || height > 4096 || width * height > MAX_MEDIA_PIXELS)
    throw new Error('Background dimensions must be at most 4096 × 4096 pixels.');
  if (duration !== undefined && (!Number.isFinite(duration) || duration <= 0 || duration > 120))
    throw new Error('Videos must be no longer than 2 minutes.');
}

const openDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open('centipede-home-media', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('background');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(new Error('Local background storage is unavailable.'));
  request.onblocked = () => reject(new Error('Close another old Centipede tab, then try again.'));
});

export async function loadHomeMedia(): Promise<HomeMedia | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('background', 'readonly');
    const request = tx.objectStore('background').get('selected');
    let value: HomeMedia | null = null;
    request.onsuccess = () => { value = request.result ?? null; };
    tx.oncomplete = () => {
      db.close();
      if (value !== null && !isSavedHomeMedia(value)) reject(new Error('Saved background is damaged. Choose another in Settings.'));
      else resolve(value);
    };
    tx.onerror = tx.onabort = () => { db.close(); reject(new Error('Could not read the saved background.')); };
  });
}

export async function storeHomeMedia(media: HomeMedia | null): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('background', 'readwrite');
    if (media) tx.objectStore('background').put(media, 'selected');
    else tx.objectStore('background').delete('selected');
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = tx.onabort = () => { db.close(); reject(new Error('Could not save this background. Browser storage may be full.')); };
  });
  window.dispatchEvent(new Event(MEDIA_CHANGED));
}

export async function prepareHomeMedia(file: File): Promise<HomeMedia> {
  const kind = mediaKind(file.type, file.size, new Uint8Array(await file.slice(0, 16).arrayBuffer()));
  const url = URL.createObjectURL(file);
  const element = kind === 'video' ? document.createElement('video') : new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => finish(new Error('This background took too long to decode.')), 10000);
      const finish = (error?: Error) => { window.clearTimeout(timer); element.onerror = null; if (error) reject(error); else resolve(); };
      element.onerror = () => finish(new Error('This file could not be decoded. Your previous background is unchanged.'));
      if (element instanceof HTMLVideoElement) {
        element.muted = true;
        element.preload = 'auto';
        element.onloadeddata = () => finish();
      } else element.onload = () => finish();
      element.src = url;
    });
    const width = element instanceof HTMLVideoElement ? element.videoWidth : element.naturalWidth;
    const height = element instanceof HTMLVideoElement ? element.videoHeight : element.naturalHeight;
    checkMediaDimensions(width, height, element instanceof HTMLVideoElement ? element.duration : undefined);
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1920 / width, 1080 / height);
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image preview is unavailable in this browser.');
    context.drawImage(element, 0, 0, canvas.width, canvas.height);
    const poster = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not prepare a static preview.')), 'image/png'));
    return { blob: file, poster, name: file.name.slice(0, 180), kind };
  } finally {
    if (element instanceof HTMLVideoElement) { element.pause(); element.removeAttribute('src'); element.load(); }
    else element.src = '';
    URL.revokeObjectURL(url);
  }
}
