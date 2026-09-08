export interface SkillManifest {
  skillId: string;
  name: string;
  version: string;
  description: string;
  author: string;
  publisher: string;
  checksum: string;
  requiredCapabilities: string[];
  dependencies: { skillId: string; minVersion: string }[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  trustState: 'UNTRUSTED' | 'REVIEW_REQUIRED' | 'APPROVED' | 'ACTIVE' | 'REVOKED';
  outputSchemaJson?: string;
  createdAt: number;
}
