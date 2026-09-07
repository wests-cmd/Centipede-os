export type OSPlatform = 'WINDOWS' | 'LINUX' | 'MACOS' | 'CONTAINER_LINUX' | 'UNKNOWN';

export interface HardwareInfo {
  cpuCores: number;
  totalMemoryMb: number;
  availableMemoryMb: number;
  storageTotalGb: number;
  storageAvailableGb: number;
  gpuAvailable: boolean;
  gpuName?: string;
}

export interface EnvironmentInfo {
  isContainerized: boolean;
  isDockerAvailable: boolean;
  nodeEnv: string;
  isDevelopment: boolean;
}

export interface PlatformCapabilities {
  filesystemAccess: boolean;
  microphoneAccess: boolean;
  speakerAccess: boolean;
  cameraAccess: boolean;
  notificationsSupported: boolean;
  networkInterfacesAvailable: boolean;
  dockerSocketMounted: boolean;
}

export interface ServiceHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'STOPPED';
  endpoint: string;
  version?: string;
  latencyMs?: number;
}

export interface RuntimeInfo {
  centipedeVersion: string;
  platform: {
    os: OSPlatform;
    architecture: string;
    osRelease: string;
  };
  hardware: HardwareInfo;
  environment: EnvironmentInfo;
  capabilities: PlatformCapabilities;
  services: {
    centipede: ServiceHealth;
    kingdom: ServiceHealth;
    aiModel: ServiceHealth;
  };
  timestamp: number;
}
