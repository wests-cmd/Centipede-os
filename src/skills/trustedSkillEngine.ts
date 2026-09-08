import { SkillManifest } from './manifest';

export class TrustedSkillEngine {
  private skills: Map<string, SkillManifest[]> = new Map();

  public registerSkillManifest(manifest: SkillManifest): SkillManifest {
    const versions = this.skills.get(manifest.skillId) || [];

    // Security Rule: Active skills are immutable
    const activeExisting = versions.find((s) => s.trustState === 'ACTIVE' && s.version === manifest.version);
    if (activeExisting) {
      throw new Error(`SKILL_IMMUTABLE: Active skill "${manifest.skillId}" v${manifest.version} is immutable.`);
    }

    // Default imported or untrusted skills to UNTRUSTED
    const copy = { ...manifest };
    if (!copy.trustState) {
      copy.trustState = 'UNTRUSTED';
    }

    versions.push(copy);
    this.skills.set(manifest.skillId, versions);
    return copy;
  }

  public validateSkillExecution(skillId: string, version: string): { valid: boolean; skill?: SkillManifest; error?: string } {
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
