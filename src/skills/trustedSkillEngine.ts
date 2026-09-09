import { createHash } from 'node:crypto';
import { SkillManifest } from './manifest';

function compareSemver(v1: string, v2: string): number {
  const clean1 = (v1 || '0.0.0').replace(/^v/i, '').split('.').map((p) => parseInt(p, 10) || 0);
  const clean2 = (v2 || '0.0.0').replace(/^v/i, '').split('.').map((p) => parseInt(p, 10) || 0);

  for (let i = 0; i < 3; i++) {
    const p1 = clean1[i] || 0;
    const p2 = clean2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

export class TrustedSkillEngine {
  private skills: Map<string, SkillManifest[]> = new Map();

  public calculateArtifactChecksum(content: any): string {
    const raw = typeof content === 'string' ? content : JSON.stringify(content || {});
    return createHash('sha256').update(raw).digest('hex');
  }

  public registerSkillManifest(manifest: SkillManifest, isAuthoritativeTrust = false): SkillManifest {
    const versions = this.skills.get(manifest.skillId) || [];

    // Security Rule: Active skills are immutable
    const activeExisting = versions.find((s) => s.trustState === 'ACTIVE' && s.version === manifest.version);
    if (activeExisting) {
      throw new Error(`SKILL_IMMUTABLE: Active skill "${manifest.skillId}" v${manifest.version} is immutable.`);
    }

    // Default imported or untrusted skills to UNTRUSTED unless established by authoritative admin operation
    const copy = { ...manifest };
    if (!isAuthoritativeTrust) {
      copy.trustState = 'UNTRUSTED';
    } else if (!copy.trustState) {
      copy.trustState = 'UNTRUSTED';
    }

    versions.push(copy);
    this.skills.set(manifest.skillId, versions);
    return copy;
  }

  public setSkillTrustState(skillId: string, version: string, trustState: SkillManifest['trustState']): SkillManifest {
    const versions = this.skills.get(skillId) || [];
    const target = versions.find((s) => s.version === version);
    if (!target) {
      throw new Error(`SKILL_NOT_FOUND: Skill "${skillId}" v${version} not found.`);
    }
    target.trustState = trustState;
    return target;
  }

  public validateSkillExecution(
    skillId: string,
    version: string,
    artifactContent?: any
  ): { valid: boolean; skill?: SkillManifest; error?: string } {
    const versions = this.skills.get(skillId) || [];
    const target = versions.find((s) => s.version === version);

    if (!target) {
      return { valid: false, error: `SKILL_NOT_FOUND: Skill "${skillId}" v${version} not found.` };
    }

    if (target.trustState === 'UNTRUSTED' || target.trustState === 'REVIEW_REQUIRED') {
      return { valid: false, error: `UNTRUSTED_SKILL: Skill "${target.name}" is in state "${target.trustState}". Human security review required before execution!` };
    }

    if (target.trustState === 'REVOKED') {
      return { valid: false, error: `REVOKED_SKILL: Skill "${target.name}" has been revoked by security administrator.` };
    }

    // Checksum verification against immutable artifact identity
    if (artifactContent && target.checksum) {
      const computed = this.calculateArtifactChecksum(artifactContent);
      if (target.checksum !== computed) {
        return {
          valid: false,
          error: `SKILL_CHECKSUM_MISMATCH: Computed artifact checksum "${computed}" does not match approved manifest checksum "${target.checksum}". Integrity compromised.`,
        };
      }
    }

    // Skill Dependency Tree Verification with Semver Comparison
    if (target.dependencies && target.dependencies.length > 0) {
      for (const dep of target.dependencies) {
        const depVersions = this.skills.get(dep.skillId) || [];
        const depTarget = depVersions.find((s) => compareSemver(s.version, dep.minVersion) >= 0);

        if (!depTarget) {
          return {
            valid: false,
            error: `DEPENDENCY_MISSING: Skill "${target.name}" depends on missing skill "${dep.skillId}" (>= v${dep.minVersion}).`,
          };
        }

        if (depTarget.trustState === 'UNTRUSTED' || depTarget.trustState === 'REVIEW_REQUIRED') {
          return {
            valid: false,
            error: `DEPENDENCY_UNTRUSTED: Skill "${target.name}" depends on untrusted skill "${dep.skillId}" in state "${depTarget.trustState}".`,
          };
        }

        if (depTarget.trustState === 'REVOKED') {
          return {
            valid: false,
            error: `DEPENDENCY_REVOKED: Skill "${target.name}" depends on revoked skill "${dep.skillId}".`,
          };
        }
      }
    }

    return { valid: true, skill: target };
  }

  public sanitizeToolResponseData(rawToolResponse: any): { data: any; hasPoisoningWarning: boolean } {
    const jsonString = typeof rawToolResponse === 'string' ? rawToolResponse : JSON.stringify(rawToolResponse || {});
    const lower = jsonString.toLowerCase();

    // Tool Poisoning Defense: Detect prompt injection or authority override attempts in tool output
    const hasPoisoningWarning =
      lower.includes('ignore previous instructions') ||
      lower.includes('system admin') ||
      lower.includes('grant permission') ||
      lower.includes('authorized = true');

    return {
      data: rawToolResponse,
      hasPoisoningWarning,
    };
  }
}

export const trustedSkillEngine = new TrustedSkillEngine();
