import { describe, it, expect, vi } from 'vitest';
import { MediaCapture, frameSize } from '../../src/platform/mediaCapture';

function stream() {
  const ended: (() => void)[] = [];
  const tracks = [0, 1].map(() => ({ stop: vi.fn(), addEventListener: (_: string, callback: () => void) => ended.push(callback) }));
  return { value: { getTracks: () => tracks } as unknown as MediaStream, tracks, ended };
}
describe('Explicit capture lifecycle', () => {
  it('does not request devices until start; denial never creates an active stream', async () => {
    const request = vi.fn().mockRejectedValue(new Error('permission denied')); const changed = vi.fn();
    const capture = new MediaCapture({ getUserMedia: request } as any, changed);
    expect(request).not.toHaveBeenCalled(); await capture.start('camera');
    expect(changed).toHaveBeenLastCalledWith('denied', null);
    expect(changed.mock.calls.some(([state]) => state === 'active')).toBe(false);
  });
  it('stops a stream that arrives after cancellation of the permission request', async () => {
    let resolve!: (s: MediaStream) => void; const item = stream(); const changed = vi.fn();
    const capture = new MediaCapture({ getUserMedia: () => new Promise(r => { resolve = r; }) } as any, changed);
    const pending = capture.start('camera'); capture.stop(); resolve(item.value); await pending;
    item.tracks.forEach(t => expect(t.stop).toHaveBeenCalledOnce());
    expect(changed.mock.calls.some(([state]) => state === 'active')).toBe(false);
  });
  it('stops every track on revocation, source change and disposal', async () => {
    const first = stream(), second = stream(), changed = vi.fn();
    const capture = new MediaCapture({ getUserMedia: vi.fn().mockResolvedValueOnce(first.value).mockResolvedValueOnce(second.value) } as any, changed);
    await capture.start('camera'); await capture.start('microphone');
    first.tracks.forEach(t => expect(t.stop).toHaveBeenCalledOnce());
    second.ended[0](); second.tracks.forEach(t => expect(t.stop).toHaveBeenCalledOnce());
    expect(changed).toHaveBeenLastCalledWith('idle', null); capture.dispose();
  });
  it('requires a fresh screen chooser and never requests screen audio', async () => {
    const request = vi.fn().mockImplementation(async () => stream().value);
    const capture = new MediaCapture({ getDisplayMedia: request } as any, vi.fn());
    await capture.start('screen'); capture.stop(); await capture.start('screen'); capture.dispose();
    expect(request).toHaveBeenCalledTimes(2); expect(request.mock.calls[0][0].audio).toBe(false);
  });
  it('does not activate or notify after unmount while permission was pending', async () => {
    let resolve!: (s: MediaStream) => void; const item = stream(), changed = vi.fn();
    const capture = new MediaCapture({ getUserMedia: () => new Promise(r => { resolve = r; }) } as any, changed);
    const pending = capture.start('camera'); capture.dispose(); const calls = changed.mock.calls.length;
    resolve(item.value); await pending; expect(changed).toHaveBeenCalledTimes(calls);
    item.tracks.forEach(t => expect(t.stop).toHaveBeenCalledOnce());
  });
  it('reports unsupported APIs without inference and bounds large image frames', async () => {
    const changed = vi.fn(); await new MediaCapture(undefined, changed).start('camera');
    expect(changed).toHaveBeenLastCalledWith('unsupported', null);
    expect(frameSize(7680, 4320)).toEqual({ width: 640, height: 360 });
    for (const value of [0, -1, NaN, Infinity]) expect(() => frameSize(value, 480)).toThrow();
  });
});
