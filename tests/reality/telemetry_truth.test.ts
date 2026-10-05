import { describe, it, expect } from 'vitest';
import { platformDetector } from '../../src/platform/detector';
import { HardwareInfo } from '../../src/platform/types';
import { ResultProcessor } from '../../src/ai/resultProcessor';
import { Intent } from '../../src/ai/types';

describe('Reality Regression Suite — Hardware Telemetry Truth', () => {
  it('1. Detects runtime info and includes explicit DataProvenance metadata', async () => {
    const info = await platformDetector.detectRuntimeInfo();
    expect(info).toBeDefined();
    expect(info.hardware).toBeDefined();
    expect(info.hardware.cpuCoresProvenance).toBeDefined();
    expect(['LOCAL_DETECTED', 'UNKNOWN', 'UNAVAILABLE']).toContain(info.hardware.cpuCoresProvenance);
    expect(info.hardware.totalMemoryMbProvenance).toBeDefined();
    expect(info.hardware.storageTotalGbProvenance).toBeDefined();
    expect(['BROWSER_QUOTA', 'UNKNOWN', 'UNAVAILABLE']).toContain(info.hardware.storageTotalGbProvenance);
  });

  it('2. Fails if undetected telemetry returns hardcoded fake values without provenance', async () => {
    const info = await platformDetector.detectRuntimeInfo();
    // Provenance must never be missing or fabricated as LIVE when unmeasured
    if (info.hardware.cpuCoresProvenance === 'UNKNOWN') {
      expect(info.hardware.cpuCores).toBeNull();
    }
  });

  it('3. Does not claim service health or latency without performing a service probe', async () => {
    const info = await platformDetector.detectRuntimeInfo();
    expect(info.services.centipede.status).toBe('UNKNOWN');
    expect(info.services.kingdom.status).toBe('UNKNOWN');
    expect(info.services.aiModel.status).toBe('UNKNOWN');
    expect(info.services.centipede.latencyMs).toBeUndefined();
  });

  it('4. Does not invent a profile recommendation when CPU and memory are unknown', () => {
    const hardware: HardwareInfo = {
      cpuCores: null,
      cpuCoresProvenance: 'UNKNOWN',
      totalMemoryMb: null,
      totalMemoryMbProvenance: 'UNKNOWN',
      availableMemoryMb: null,
      availableMemoryMbProvenance: 'UNKNOWN',
      storageTotalGb: null,
      storageTotalGbProvenance: 'UNKNOWN',
      storageAvailableGb: null,
      storageAvailableGbProvenance: 'UNKNOWN',
      gpuAvailable: false,
      gpuProvenance: 'UNAVAILABLE',
    };
    const recommendation = platformDetector.getProfileRecommendation(hardware);
    expect(recommendation.recommendedProfile).toBe('SEGMENTOR_RECOMMENDATION');
    expect(recommendation.hardwareSummary).toContain('Unknown CPU cores');
    expect(recommendation.explanation).toContain('unavailable');
  });

  it('5. Storage query explains that host disk telemetry is unavailable', () => {
    const processor = new ResultProcessor();
    const intent = { type: 'QUERY_STORAGE' } as Intent;
    const result = { status: 'SUCCESS' } as Parameters<typeof processor.formatUserExplanation>[1];
    const explanation = processor.formatUserExplanation(intent, result);
    expect(explanation).toContain('does not measure physical disk usage');
    expect(explanation).not.toContain('512 GB');
  });
});
