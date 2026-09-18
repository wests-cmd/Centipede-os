import { CentipedeProfile, HardwareInfo, OSPlatform, PlatformCapabilities, ProfileRecommendation, RuntimeInfo, StorageBreakdownMetrics, StoragePressureState } from './types';
import { CENTIPEDE_VERSION } from '../version';

export class PlatformDetector {
  public getProfileRecommendation(hardware: HardwareInfo): ProfileRecommendation {
    const cores = hardware.cpuCores || 4;
    const ramGb = Math.round((hardware.totalMemoryMb || 8192) / 1024);
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
      hardwareSummary: `${cores} CPU Cores • ${ramGb} GB RAM • ${diskGb} GB Storage`,
    };
  }
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

    // Dynamic memory & hardware detection using navigator / node os module
    let cpuCores = 4;
    let totalMemoryMb = 8192;
    let availableMemoryMb = 4096;

    if (typeof navigator !== 'undefined') {
      cpuCores = navigator.hardwareConcurrency || 4;
      if ('deviceMemory' in navigator) {
        totalMemoryMb = ((navigator as any).deviceMemory || 8) * 1024;
        availableMemoryMb = Math.round(totalMemoryMb * 0.5);
      }
    }

    let storageTotalGb = 128;
    let storageAvailableGb = 64;

    if (typeof navigator !== 'undefined' && 'storage' in navigator && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        if (estimate.quota && estimate.usage !== undefined) {
          storageTotalGb = Math.round(estimate.quota / (1024 * 1024 * 1024));
          storageAvailableGb = Math.round((estimate.quota - estimate.usage) / (1024 * 1024 * 1024));
        }
      } catch (_) {
        // Fallback estimate if storage API is restricted
      }
    }

    const storageBreakdown = this.calculateStorageMetrics(storageTotalGb, storageAvailableGb);

    return {
      centipedeVersion: CENTIPEDE_VERSION,
      platform: {
        os,
        architecture: typeof process !== 'undefined' ? process.arch || 'x64' : 'x64',
        osRelease: typeof process !== 'undefined' ? process.platform || 'browser' : 'browser',
      },
      hardware: {
        cpuCores,
        totalMemoryMb,
        availableMemoryMb,
        storageTotalGb,
        storageAvailableGb,
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
