export type OSPlatform = 'WINDOWS' | 'LINUX' | 'MACOS' | 'CONTAINER_LINUX' | 'UNKNOWN';

export type CentipedeProfile = 'COMMANDER' | 'KNIGHT' | 'SCOUT' | 'FULL_CENTIPEDE' | 'SEGMENTOR_RECOMMENDATION';

export interface ProfileRecommendation {
  recommendedProfile: CentipedeProfile;
  suitabilityScore: number;
  explanation: string;
  hardwareSummary: string;
}

export type StoragePressureState = 'NORMAL' | 'INFORMATIONAL_WARNING' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';

export interface StorageBreakdownMetrics {
  diskTotalGb: number;
  diskUsedGb: number;
  diskFreeGb: number;
  freeSpacePercent: number;
  systemUsedGb: number;
  kingdomUsedGb: number;
  dockerUsedGb: number;
  vmUsedGb: number;
  modelsUsedGb: number;
  skillsUsedGb: number;
  logsUsedGb: number;
  userUsedGb: number;
  storagePressure: StoragePressureState;
}

import { DataProvenance } from '../types/provenance';

export interface HardwareInfo {
  cpuCores: number | null;
  cpuCoresProvenance: DataProvenance;
  totalMemoryMb: number | null;
  totalMemoryMbProvenance: DataProvenance;
  availableMemoryMb: number | null;
  availableMemoryMbProvenance: DataProvenance;
  storageTotalGb: number | null;
  storageTotalGbProvenance: DataProvenance;
  storageAvailableGb: number | null;
  storageAvailableGbProvenance: DataProvenance;
  gpuAvailable: boolean;
  gpuProvenance: DataProvenance;
  gpuName?: string;
  storageBreakdown?: StorageBreakdownMetrics;
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

export type NodeState = 'DISCOVERED' | 'PAIRING' | 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'QUARANTINED' | 'DRAINING' | 'RETIRED';

export type CentipedeEventType =
  | 'MISSION_CREATED'
  | 'MISSION_PLANNED'
  | 'APPROVAL_REQUIRED'
  | 'APPROVAL_APPROVED'
  | 'APPROVAL_DENIED'
  | 'TASK_QUEUED'
  | 'TASK_DISPATCHED'
  | 'TASK_STARTED'
  | 'TASK_SUCCEEDED'
  | 'TASK_FAILED'
  | 'NODE_ONLINE'
  | 'NODE_OFFLINE'
  | 'NODE_DEGRADED'
  | 'KINGDOM_CONNECTED'
  | 'KINGDOM_DISCONNECTED'
  | 'CONTRACT_DRIFT'
  | 'SECURITY_BLOCK';

export interface CentipedeEvent {
  eventId: string;
  eventType: CentipedeEventType;
  timestamp: number;
  source: string;
  missionId?: string;
  taskId?: string;
  nodeId?: string;
  correlationId: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  payload: Record<string, any>;
  schemaVersion: string;
}

export interface NodeInformation {
  nodeId: string;
  role: CentipedeProfile;
  version: string;
  capabilities: string[];
  platform: OSPlatform;
  architecture: string;
  health: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  trustState: 'TRUSTED' | 'UNTRUSTED' | 'QUARANTINED';
  nodeState: NodeState;
  lastHeartbeat: number;
  supportedProtocols: string[];
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
