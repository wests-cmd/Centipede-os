export type CaptureKind = 'camera' | 'screen' | 'microphone';
export type CaptureState = 'idle' | 'requesting' | 'active' | 'denied' | 'unsupported';

/** API support is not permission. Capture begins only from an explicit UI action. */
export class MediaCapture {
  private stream: MediaStream | null = null;
  private generation = 0;
  private disposed = false;
  constructor(private devices: Pick<MediaDevices, 'getUserMedia' | 'getDisplayMedia'> | undefined,
    private changed: (state: CaptureState, stream: MediaStream | null) => void) {}

  async start(kind: CaptureKind): Promise<void> {
    if (this.disposed) return;
    this.stop();
    const generation = this.generation;
    if (!this.devices || (kind === 'screen' ? typeof this.devices.getDisplayMedia !== 'function'
      : typeof this.devices.getUserMedia !== 'function')) {
      this.changed('unsupported', null); return;
    }
    this.changed('requesting', null);
    try {
      const stream = kind === 'screen'
        ? await this.devices.getDisplayMedia({ video: { frameRate: 5 }, audio: false })
        : await this.devices.getUserMedia(kind === 'camera'
          ? { video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 5, max: 10 } }, audio: false }
          : { audio: true, video: false });
      if (this.disposed || generation !== this.generation) {
        stream.getTracks().forEach(track => track.stop()); return;
      }
      this.stream = stream;
      stream.getTracks().forEach(track => track.addEventListener('ended', () => {
        if (this.stream === stream) this.stop();
      }, { once: true }));
      this.changed('active', stream);
    } catch {
      if (generation === this.generation && !this.disposed) this.changed('denied', null);
    }
  }

  stop(): void {
    this.generation++;
    const previous = this.stream; this.stream = null;
    previous?.getTracks().forEach(track => track.stop());
    if (!this.disposed) this.changed('idle', null);
  }

  dispose(): void { this.disposed = true; this.stop(); }
}

export function frameSize(width: number, height: number): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new Error('Frame unavailable');
  const scale = Math.min(1, 640 / width, 480 / height);
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)) };
}

/** Normalized selection on a frozen local frame. Bounds are clamped and validated. */
export type FrameRegion = { x:number; y:number; width:number; height:number };
export function regionPixels(region:FrameRegion,width:number,height:number):FrameRegion {
  if (!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||
      ![region.x,region.y,region.width,region.height].every(Number.isFinite)||
      region.x<0||region.y<0||region.width<=0||region.height<=0||
      region.x+region.width>1.000001||region.y+region.height>1.000001) throw new Error('Invalid selection.');
  const x=Math.min(width-1,Math.floor(region.x*width));
  const y=Math.min(height-1,Math.floor(region.y*height));
  return {x,y,width:Math.max(1,Math.min(width-x,Math.ceil(region.width*width))),height:Math.max(1,Math.min(height-y,Math.ceil(region.height*height)))};
}
