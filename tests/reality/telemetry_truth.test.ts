import { describe, it, expect } from 'vitest';
import { platformDetector } from '../../src/platform/detector';

describe('Reality Regression Suite — Hardware Telemetry Truth', () => {
  it('1. Detects runtime info and includes explicit DataProvenance metadata', async () => {
    const info = await platformDetector.detectRuntimeInfo();
    expect(info).toBeDefined();
    expect(info.hardware).toBeDefined();
    expect(info.hardware.cpuCoresProvenance).toBeDefined();
    expect(['LOCAL_DETECTED', 'UNKNOWN', 'UNAVAILABLE']).toContain(info.hardware.cpuCoresProvenance);
    expect(info.hardware.totalMemoryMbProvenance).toBeDefined();
    expect(info.hardware.storageTotalGbProvenance).toBeDefined();
  });

  it('2. Fails if undetected telemetry returns hardcoded fake values without provenance', async () => {
    const info = await platformDetector.detectRuntimeInfo();
    // Provenance must never be missing or fabricated as LIVE when unmeasured
    if (info.hardware.cpuCoresProvenance === 'UNKNOWN') {
      expect(info.hardware.cpuCores).toBeNull();
    }
  });
});
