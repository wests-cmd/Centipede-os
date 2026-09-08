export type IntegrationCategory = 'LOCAL' | 'COMMUNICATION' | 'PRODUCTIVITY' | 'DEVELOPMENT' | 'WEB';
export type IntegrationStatus = 'CONNECTED' | 'DISCONNECTED' | 'NEEDS_AUTH' | 'RESTRICTED' | 'ERROR';

export interface IntegrationCapability {
  capabilityId: string;
  name: string;
  description: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  operationType: 'READ' | 'WRITE' | 'CREATE' | 'DELETE' | 'EXECUTE';
  requiresHumanApproval: boolean;
}

export interface WorkspaceIntegration {
  integrationId: string;
  name: string;
  category: IntegrationCategory;
  provider: string;
  status: IntegrationStatus;
  capabilities: IntegrationCapability[];
  lastSynchronizedAt?: number;
  accountName?: string;
  sanitizedMetadata: Record<string, string>;
}

export interface NormalizedIntegrationResult {
  integrationId: string;
  capabilityId: string;
  status: 'SUCCESS' | 'FAILED' | 'APPROVAL_REQUIRED' | 'BLOCKED';
  data: any;
  error?: string;
  provenance: {
    timestamp: number;
    source: string;
    trustClassification: 'UNTRUSTED_EXTERNAL_DATA';
  };
}
