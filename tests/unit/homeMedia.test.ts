import { describe, expect, test } from 'vitest';
import { checkMediaDimensions, isSavedHomeMedia, mediaKind, MAX_MEDIA_BYTES } from '../../src/platform/homeMedia';

const header = (value: string) => new TextEncoder().encode(value);
describe('local background validation', () => {
  test('rejects damaged stored records instead of crashing the scene', () => {
    const valid = { blob: new Blob(['GIF89a'], { type: 'image/gif' }), poster: new Blob(['png'], { type: 'image/png' }), name: 'local.gif', kind: 'image' };
    expect(isSavedHomeMedia(valid)).toBe(true);
    for (const bad of [null, {}, { ...valid, blob: 'https://example.com/a.gif' }, { ...valid, poster: null }, { ...valid, kind: 'script' }, { ...valid, name: 'x'.repeat(181) }])
      expect(isSavedHomeMedia(bad)).toBe(false);
  });
  test('recognizes supported formats using MIME and signature together', () => {
    expect(mediaKind('image/gif', 40, header('GIF89a'))).toBe('image');
    expect(mediaKind('image/webp', 40, header('RIFF1234WEBP'))).toBe('image');
    expect(mediaKind('image/jpeg', 40, new Uint8Array([255, 216, 255]))).toBe('image');
    expect(mediaKind('image/png', 40, new Uint8Array([137, 80, 78, 71]))).toBe('image');
    expect(mediaKind('video/mp4', 40, header('1234ftyp'))).toBe('video');
    expect(mediaKind('video/webm', 40, new Uint8Array([26, 69, 223, 163]))).toBe('video');
  });
  test('rejects executable and mismatched content and unsupported remote references', () => {
    for (const type of ['image/svg+xml', 'text/html', 'text/javascript', 'application/octet-stream', ''])
      expect(() => mediaKind(type, 40, header('<script>'))).toThrow();
    expect(() => mediaKind('image/gif', 40, header('<svg/>'))).toThrow();
    expect(() => mediaKind('image/png', 40, header('https://example.com'))).toThrow();
  });
  test('caps file size, dimensions and finite video duration', () => {
    expect(() => mediaKind('image/gif', MAX_MEDIA_BYTES + 1, header('GIF89a'))).toThrow();
    expect(() => mediaKind('image/gif', 0, header('GIF89a'))).toThrow();
    expect(() => checkMediaDimensions(1920, 1080, 120)).not.toThrow();
    for (const [w, h, duration] of [[4097, 1, 1], [1, 4097, 1], [0, 1, 1], [NaN, 1, 1], [1, 1, Infinity], [1, 1, 121], [1, 1, 0]])
      expect(() => checkMediaDimensions(w, h, duration)).toThrow();
  });
});
