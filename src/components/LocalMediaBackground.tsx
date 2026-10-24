import React, { useEffect, useRef, useState } from 'react';
import { HomeMedia, loadHomeMedia, MEDIA_CHANGED } from '../platform/homeMedia';

export const ART_BACKGROUND = '/backgrounds/centipede-earth.png';

export function LocalMediaBackground({ custom = false, className = '' }: { custom?: boolean; className?: string }) {
  const [media, setMedia] = useState<HomeMedia | null>(null);
  const [urls, setUrls] = useState<{ media: string; poster: string } | null>(null);
  const [error, setError] = useState('');
  const [play, setPlay] = useState(false);
  const [visible, setVisible] = useState(!document.hidden);
  const [intersecting, setIntersecting] = useState(true);
  const [reduced, setReduced] = useState(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const container = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    let disposed = false;
    const read = () => { if (!custom) return; void loadHomeMedia().then(value => {
      if (!disposed) { setMedia(value); setError(value ? '' : 'No local background saved. Choose one in Settings.'); setPlay(false); }
    }).catch(() => { if (!disposed) { setMedia(null); setError('Local background unavailable. Showing the signature artwork.'); } }); };
    read(); window.addEventListener(MEDIA_CHANGED, read);
    return () => { disposed = true; window.removeEventListener(MEDIA_CHANGED, read); };
  }, [custom]);
  useEffect(() => {
    if (!media) { setUrls(null); return; }
    const next = { media: URL.createObjectURL(media.blob), poster: URL.createObjectURL(media.poster) };
    setUrls(next);
    return () => { URL.revokeObjectURL(next.media); URL.revokeObjectURL(next.poster); };
  }, [media]);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => {
      const quiet = query.matches || document.documentElement.classList.contains('a11y-reduce-motion');
      setReduced(quiet); if (quiet) setPlay(false);
    };
    const visibility = () => setVisible(!document.hidden);
    query.addEventListener('change', change); document.addEventListener('visibilitychange', visibility);
    const observer = new IntersectionObserver(([entry]) => setIntersecting(entry.isIntersecting));
    const preferences = new MutationObserver(change);
    preferences.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    change();
    if (container.current) observer.observe(container.current);
    return () => { query.removeEventListener('change', change); document.removeEventListener('visibilitychange', visibility); observer.disconnect(); preferences.disconnect(); };
  }, []);
  const moving = !!(custom && media && urls && play && visible && intersecting && !reduced);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    let active = true;
    if (moving) void element.play().catch(() => { if (active) { setPlay(false); setError('Playback unavailable. Showing the still preview.'); } });
    else element.pause();
    // The ref becomes null when React removes the video. Capture the actual old
    // decoder here so pause, navigation and transport of a new file release it.
    return () => { active = false; element.pause(); element.removeAttribute('src'); element.load(); };
  }, [moving, urls?.media]);
  return <div ref={container} className={`absolute inset-0 overflow-hidden bg-slate-950 ${className}`}>
    {custom && media && urls ? media.kind === 'video' && moving
      ? <video key={urls.media} ref={video} src={urls.media} poster={urls.poster} muted loop playsInline className="h-full w-full object-cover" onError={() => { setPlay(false); setError('Playback failed. Showing the still preview.'); }} />
      : <img src={moving ? urls.media : urls.poster} alt={media.name} className="h-full w-full object-cover" onError={() => { setMedia(null); setError('Background failed to load. Showing the signature artwork.'); }} />
      : <img src={ART_BACKGROUND} alt="Illuminated metallic centipede curled around Earth" className="h-full w-full object-cover" />}
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/30 to-slate-950/10" />
    {custom && <div className="absolute top-3 right-3 z-20 max-w-xs rounded-lg bg-slate-950/90 p-2 text-xs text-slate-200">
      {error && <p role="status">{error}</p>}
      {media && <button type="button" disabled={reduced} onClick={() => setPlay(value => !value)} className="rounded border border-slate-500 px-3 py-2 disabled:opacity-60">{reduced ? 'Reduced motion: still preview' : play ? 'Pause background' : 'Play background'}</button>}
    </div>}
  </div>;
}
