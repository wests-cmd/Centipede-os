import { CentipedeProfile, HardwareInfo, OSPlatform, PlatformCapabilities, ProfileRecommendation, RuntimeInfo } from './types';
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
    const cores = hardware.cpuCores;
    const ramGb = hardware.totalMemoryMb === null ? null : Math.round(hardware.totalMemoryMb / 1024);
    const hasCpuAndMemory = cores !== null && ramGb !== null;

    if (!hasCpuAndMemory) {
      return {
        recommendedProfile: 'SEGMENTOR_RECOMMENDATION',
        suitabilityScore: null,
        explanation: 'A profile recommendation is unavailable because the browser did not report both CPU cores and memory. Choose a profile manually or run Centipede on a platform that can report these values.',
        hardwareSummary: `${cores ?? 'Unknown'} CPU cores • ${ramGb === null ? 'Unknown' : `${ramGb} GB`} memory • Host disk unavailable`,
      };
    }

    let recommendedProfile: CentipedeProfile = 'FULL_CENTIPEDE';
    let explanation = 'Reported CPU and memory meet the current heuristic for Full Centipede. This is not a compatibility test.';
    let suitabilityScore = 95;

    if (cores < 4 || ramGb < 8) {
      recommendedProfile = 'SCOUT';
      explanation = 'Reported CPU or memory is limited. Scout is suggested for lighter workloads; this estimate does not account for GPU, storage, or workload.';
      suitabilityScore = 75;
    } else if (cores < 6 || ramGb < 16) {
      recommendedProfile = 'KNIGHT';
      explanation = 'Reported CPU or memory is moderate. Knight is suggested for lighter assigned workloads; this estimate does not account for GPU, storage, or workload.';
      suitabilityScore = 85;
    }

    return {
      recommendedProfile,
      suitabilityScore,
      explanation,
      hardwareSummary: `${cores} reported CPU cores • ${ramGb} GB reported memory • Host disk unavailable`,
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
          storageTotalGbProvenance = 'BROWSER_QUOTA';
          storageAvailableGb = Math.round((estimate.quota - estimate.usage) / (1024 * 1024 * 1024));
          storageAvailableGbProvenance = 'BROWSER_QUOTA';
        }
      } catch (_) {
        storageTotalGbProvenance = 'UNAVAILABLE';
        storageAvailableGbProvenance = 'UNAVAILABLE';
      }
    }

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
    };

    return {
      centipedeVersion: CENTIPEDE_VERSION,
      platform: {
        os,
        architecture: typeof process !== 'undefined' ? process.arch || 'UNKNOWN' : 'UNKNOWN',
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
        // Runtime detection reports host facts only. It does not probe these
        // services, so it must not claim they are healthy, stopped, or fast.
        centipede: { status: 'UNKNOWN', endpoint: 'Not probed', version: CENTIPEDE_VERSION },
        kingdom: { status: 'UNKNOWN', endpoint: 'Configured in Kingdom connection settings' },
        aiModel: { status: 'UNKNOWN', endpoint: 'Not probed' },
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
