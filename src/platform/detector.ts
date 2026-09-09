import { OSPlatform, PlatformCapabilities, RuntimeInfo, StorageBreakdownMetrics, StoragePressureState } from './types';

export class PlatformDetector {
  private overrideStorageFreeGb: number | null = null;

  public setStorageFreeOverrideGb(freeGb: number | null): void {
    this.overrideStorageFreeGb = freeGb;
  }

  public calculateStorageMetrics(totalGb = 512, freeGb = 256): StorageBreakdownMetrics {
    const effectiveFreeGb = this.overrideStorageFreeGb !== null ? this.overrideStorageFreeGb : freeGb;
    const diskUsedGb = totalGb - effectiveFreeGb;
    const freeSpacePercent = Math.round((effectiveFreeGb / totalGb) * 100);

    let storagePressure: StoragePressureState = 'NORMAL';
    if (freeSpacePercent < 5) {
      storagePressure = 'EMERGENCY';
    } else if (freeSpacePercent < 10) {
      storagePressure = 'CRITICAL';
    } else if (freeSpacePercent < 20) {
      storagePressure = 'WARNING';
    } else if (freeSpacePercent <= 30) {
      storagePressure = 'INFORMATIONAL_WARNING';
    }

    return {
      diskTotalGb: totalGb,
      diskUsedGb,
      diskFreeGb: effectiveFreeGb,
      freeSpacePercent,
      systemUsedGb: 31,
      kingdomUsedGb: 4,
      dockerUsedGb: 28,
      vmUsedGb: 52,
      modelsUsedGb: 21,
      skillsUsedGb: 7,
      logsUsedGb: 2,
      userUsedGb: 22,
      storagePressure,
    };
  }

  public async detectRuntimeInfo(): Promise<RuntimeInfo> {
    const isContainer = this.detectContainerEnvironment();
    const os = this.detectOS(isContainer);

    // Capability verification
    const capabilities: PlatformCapabilities = {
      filesystemAccess: true,
      microphoneAccess: typeof window !== 'undefined' && 'navigator' in window && 'mediaDevices' in navigator,
      speakerAccess: typeof window !== 'undefined' && 'AudioContext' in window,
      cameraAccess: typeof window !== 'undefined' && 'navigator' in window && 'mediaDevices' in navigator,
      notificationsSupported: typeof window !== 'undefined' && 'Notification' in window,
      networkInterfacesAvailable: typeof window !== 'undefined' && 'navigator' in window && navigator.onLine,
      dockerSocketMounted: false, // Security Directive: Docker socket mounting is prohibited!
    };

    const storageBreakdown = this.calculateStorageMetrics(512, 256);

    return {
      centipedeVersion: '1.0.0',
      platform: {
        os,
        architecture: typeof process !== 'undefined' ? process.arch || 'x64' : 'x64',
        osRelease: typeof process !== 'undefined' ? process.platform || 'browser' : 'browser',
      },
      hardware: {
        cpuCores: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 8 : 8,
        totalMemoryMb: 16384,
        availableMemoryMb: 8192,
        storageTotalGb: 512,
        storageAvailableGb: storageBreakdown.diskFreeGb,
        gpuAvailable: false,
        storageBreakdown,
      },
      environment: {
        isContainerized: isContainer,
        isDockerAvailable: false,
        nodeEnv: typeof process !== 'undefined' && process.env ? process.env.NODE_ENV || 'production' : 'production',
        isDevelopment: false,
      },
      capabilities,
      services: {
        centipede: { status: 'HEALTHY', endpoint: 'http://localhost:3000', version: '1.0.0', latencyMs: 2 },
        kingdom: { status: 'STOPPED', endpoint: 'http://localhost:8000' },
        aiModel: { status: 'STOPPED', endpoint: 'http://localhost:11434' },
      },
      timestamp: Date.now(),
    };
  }

  private detectContainerEnvironment(): boolean {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.DOCKER_CONTAINER || process.env.KUBERNETES_SERVICE_HOST) {
        return true;
      }
    }
    return false;
  }

  private detectOS(isContainer: boolean): OSPlatform {
    if (isContainer) return 'CONTAINER_LINUX';
    if (typeof process !== 'undefined' && process.platform) {
      if (process.platform === 'win32') return 'WINDOWS';
      if (process.platform === 'darwin') return 'MACOS';
      if (process.platform === 'linux') return 'LINUX';
    }
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('win')) return 'WINDOWS';
      if (ua.includes('mac')) return 'MACOS';
      if (ua.includes('linux')) return 'LINUX';
    }
    return 'UNKNOWN';
  }
}

export const platformDetector = new PlatformDetector();
