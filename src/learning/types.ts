import { RiskLevel } from '../ai/types';
export type { RiskLevel };

export type MemoryCategory =
  | 'EPISODIC'
  | 'SEMANTIC'
  | 'PREFERENCE'
  | 'PROCEDURAL'
  | 'CONTEXTUAL'
  | 'SYSTEM'
  | 'OBSERVATION';

export type TrustLevel =
  | 'SYSTEM_AUTHORITY'
  | 'KINGDOM_AUTHORITY'
  | 'USER_CONFIRMED'
  | 'USER_PROVIDED'
  | 'VERIFIED_TOOL_RESULT'
  | 'MODEL_INFERENCE'
  | 'EXTERNAL_SOURCE'
  | 'UNVERIFIED';

export type MemoryScope = 'SESSION' | 'TASK' | 'PROJECT' | 'USER' | 'KINGDOM' | 'SYSTEM';

export type MemoryLifecycle = 'CREATED' | 'ACTIVE' | 'STALE' | 'SUPERSEDED' | 'EXPIRED' | 'DELETED';

export interface MemoryProvenance {
  source: string;
  sourceId: string;
  timestamp: number;
}

export type MemoryItem = MemoryEntry;

export interface MemoryEntry {
  memoryId: string;
  type: MemoryCategory;
  trustLevel: TrustLevel;
  content: string;
  provenance: MemoryProvenance;
  confidence: number;
  scope: MemoryScope;
  projectId?: string;
  lifecycle: MemoryLifecycle;
  expiration?: number;
  version: number;
}

export type LearningSignalType =
  | 'SUCCESS'
  | 'FAILURE'
  | 'USER_CORRECTION'
  | 'USER_APPROVAL'
  | 'USER_DENIAL'
  | 'TIMEOUT'
  | 'TASK_COMPLETION';

export interface LearningSignal {
  id: string;
  type: LearningSignalType;
  intentType: string;
  capability: string;
  resultStatus: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export type SkillStatus =
  | 'DRAFT'
  | 'CANDIDATE'
  | 'EVALUATING'
  | 'APPROVED'
  | 'ACTIVE'
  | 'DEPRECATED'
  | 'REJECTED'
  | 'ROLLED_BACK';

export interface SkillDefinition {
  skillId: string;
  name: string;
  description: string;
  version: string;
  workflow: string[];
  requiredCapabilities: string[];
  risk: RiskLevel;
  status: SkillStatus;
  evaluationMetrics?: {
    successRate: number;
    securityViolations: number;
    avgLatencyMs: number;
  };
  createdTime: number;
  updatedTime: number;
}

export interface CapabilityDiff {
  added: string[];
  removed: string[];
  unchanged: string[];
  isExpansion: boolean;
}
