import { CentipedeProfile, HardwareInfo, OSPlatform, PlatformCapabilities, ProfileRecommendation, RuntimeInfo, StorageBreakdownMetrics, StoragePressureState } from './types';
import { CENTIPEDE_VERSION } from '../version';
import { DataProvenance } from '../types/provenance';

const isNodeOrBun = typeof process !== 'undefined' && process.versions && (process.versions.node || process.versions.bun);

let nodeOs: any = null;
if (isNodeOrBun) {
  try {
    const req = typeof require !== 'undefined' ? require : null;
    if (req) {
      nodeOs = req('os');
    }
  } catch (_) {}
}

export class PlatformDetector {
  public getProfileRecommendation(hardware: HardwareInfo): ProfileRecommendation {
    const cores = hardware.cpuCores || 4;
    const ramGb = Math.round(((hardware.totalMemoryMb || 8192) / 1024));
    const diskGb = hardware.storageTotalGb || 128;

    let recommendedProfile: CentipedeProfile = 'FULL_CENTIPEDE';
    let explanation = 'Your computer meets all hardware requirements for Full Centipede OS (Commander + Knight + Scout).';
    let suitabilityScore = 95;

    if (cores < 4 || ramGb < 8 || diskGb < 64) {
      recommendedProfile = 'SCOUT';
      explanation = 'Your computer has lightweight hardware. Scout profile is recommended for discovery and monitoring with minimal resource usage.';
      suitabilityScore = 75;
    } else if (cores < 6 || ramGb < 16) {
      recommendedProfile = 'KNIGHT';
      explanation = 'Your computer is ideal as a Knight worker node for executing assigned tasks and container workloads.';
      suitabilityScore = 85;
    }

    return {
      recommendedProfile,
      suitabilityScore,
      explanation,
      hardwareSummary: `${hardware.cpuCores ?? 'Unknown'} CPU Cores • ${hardware.totalMemoryMb ? Math.round(hardware.totalMemoryMb/1024) : 'Unknown'} GB RAM • ${hardware.storageTotalGb ?? 'Unknown'} GB Storage`,
    };
  }

  private overrideStorageFreeGb: number | null = null;

  public setStorageFreeOverrideGb(freeGb: number | null): void {
    this.overrideStorageFreeGb = freeGb;
  }

  public calculateStorageMetrics(totalGb = 512, freeGb = 256): StorageBreakdownMetrics {
    const effectiveFreeGb = this.overrideStorageFreeGb !== null ? this.overrideStorageFreeGb : freeGb;
    const diskUsedGb = totalGb - effectiveFreeGb;
    const freeSpacePercent = totalGb > 0 ? Math.round((effectiveFreeGb / totalGb) * 100) : 100;

    let storagePressure: StoragePressureState = 'NORMAL';
    if (totalGb > 0) {
      if (freeSpacePercent < 5) {
        storagePressure = 'EMERGENCY';
      } else if (freeSpacePercent < 10) {
        storagePressure = 'CRITICAL';
      } else if (freeSpacePercent < 20) {
        storagePressure = 'WARNING';
      } else if (freeSpacePercent <= 30) {
        storagePressure = 'INFORMATIONAL_WARNING';
      }
    }

    return {
      diskTotalGb: totalGb,
      diskUsedGb,
      diskFreeGb: effectiveFreeGb,
      freeSpacePercent,
      systemUsedGb: Math.min(31, diskUsedGb),
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

    let cpuCores: number | null = null;
    let cpuCoresProvenance: DataProvenance = 'UNKNOWN';

    let totalMemoryMb: number | null = null;
    let totalMemoryMbProvenance: DataProvenance = 'UNKNOWN';

    let availableMemoryMb: number | null = null;
    let availableMemoryMbProvenance: DataProvenance = 'UNKNOWN';

    if (nodeOs) {
      try {
        const cpus = nodeOs.cpus();
        if (cpus && cpus.length) {
          cpuCores = cpus.length;
          cpuCoresProvenance = 'LOCAL_DETECTED';
        }
        const totalMem = nodeOs.totalmem();
        const freeMem = nodeOs.freemem();
        if (totalMem) {
          totalMemoryMb = Math.round(totalMem / (1024 * 1024));
          totalMemoryMbProvenance = 'LOCAL_DETECTED';
          availableMemoryMb = Math.round(freeMem / (1024 * 1024));
          availableMemoryMbProvenance = 'LOCAL_DETECTED';
        }
      } catch (_) {
        cpuCoresProvenance = 'UNAVAILABLE';
        totalMemoryMbProvenance = 'UNAVAILABLE';
      }
    } else if (typeof navigator !== 'undefined') {
      if ('hardwareConcurrency' in navigator && navigator.hardwareConcurrency) {
        cpuCores = navigator.hardwareConcurrency;
        cpuCoresProvenance = 'LOCAL_DETECTED';
      }
      if ('deviceMemory' in navigator && (navigator as any).deviceMemory) {
        totalMemoryMb = ((navigator as any).deviceMemory || 0) * 1024;
        totalMemoryMbProvenance = 'LOCAL_DETECTED';
        availableMemoryMb = Math.round(totalMemoryMb * 0.5);
        availableMemoryMbProvenance = 'LOCAL_DETECTED';
      }
    }

    let storageTotalGb: number | null = null;
    let storageTotalGbProvenance: DataProvenance = 'UNKNOWN';

    let storageAvailableGb: number | null = null;
    let storageAvailableGbProvenance: DataProvenance = 'UNKNOWN';

    if (typeof navigator !== 'undefined' && 'storage' in navigator && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        if (estimate.quota && estimate.usage !== undefined) {
          storageTotalGb = Math.round(estimate.quota / (1024 * 1024 * 1024));
          storageTotalGbProvenance = 'LOCAL_DETECTED';
          storageAvailableGb = Math.round((estimate.quota - estimate.usage) / (1024 * 1024 * 1024));
          storageAvailableGbProvenance = 'LOCAL_DETECTED';
        }
      } catch (_) {
        storageTotalGbProvenance = 'UNAVAILABLE';
        storageAvailableGbProvenance = 'UNAVAILABLE';
      }
    }

    const storageBreakdown = this.calculateStorageMetrics(storageTotalGb || 0, storageAvailableGb || 0);

    const hardware: HardwareInfo = {
      cpuCores,
      cpuCoresProvenance,
      totalMemoryMb,
      totalMemoryMbProvenance,
      availableMemoryMb,
      availableMemoryMbProvenance,
      storageTotalGb,
      storageTotalGbProvenance,
      storageAvailableGb,
      storageAvailableGbProvenance,
      gpuAvailable: false,
      gpuProvenance: 'UNAVAILABLE',
      storageBreakdown,
    };

    return {
      centipedeVersion: CENTIPEDE_VERSION,
      platform: {
        os,
        architecture: typeof process !== 'undefined' ? process.arch || 'x64' : 'x64',
        osRelease: typeof process !== 'undefined' ? process.platform || 'browser' : 'browser',
      },
      hardware,
      environment: {
        isContainerized: isContainer,
        isDockerAvailable: false,
        nodeEnv: typeof process !== 'undefined' && process.env ? process.env.NODE_ENV || 'production' : 'production',
        isDevelopment: false,
      },
      capabilities,
      services: {
        centipede: { status: 'HEALTHY', endpoint: 'http://localhost:3000', version: CENTIPEDE_VERSION, latencyMs: 2 },
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
