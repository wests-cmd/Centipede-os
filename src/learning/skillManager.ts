import { CapabilityDiff, SkillDefinition, SkillStatus } from './types';

export class SkillManager {
  private skills: Map<string, SkillDefinition[]> = new Map();

  public registerSkill(skill: SkillDefinition): void {
    const versions = this.skills.get(skill.skillId) || [];

    // Ensure active versions are immutable
    const existingActive = versions.find((s) => s.status === 'ACTIVE' && s.version === skill.version);
    if (existingActive) {
      throw new Error(`Active skill "${skill.skillId}" version v${skill.version} is immutable and cannot be overwritten.`);
    }

    versions.push({ ...skill });
    this.skills.set(skill.skillId, versions);
  }

  public getActiveSkill(skillId: string): SkillDefinition | undefined {
    const versions = this.skills.get(skillId) || [];
    const active = versions.find((s) => s.status === 'ACTIVE');
    return active ? { ...active } : undefined;
  }

  public calculateCapabilityDiff(oldSkill: SkillDefinition, newSkill: SkillDefinition): CapabilityDiff {
    const oldCaps = new Set(oldSkill.requiredCapabilities);
    const newCaps = new Set(newSkill.requiredCapabilities);

    const added = Array.from(newCaps).filter((c) => !oldCaps.has(c));
    const removed = Array.from(oldCaps).filter((c) => !newCaps.has(c));
    const unchanged = Array.from(newCaps).filter((c) => oldCaps.has(c));

    return {
      added,
      removed,
      unchanged,
      isExpansion: added.length > 0,
    };
  }

  public proposeCandidateVersion(baseSkillId: string, workflow: string[], newCapabilities: string[]): SkillDefinition {
    const versions = this.skills.get(baseSkillId) || [];
    const currentActive = versions.find((s) => s.status === 'ACTIVE');

    if (!currentActive) {
      throw new Error(`Base skill "${baseSkillId}" has no active version.`);
    }

    const versionParts = currentActive.version.split('.').map((p) => parseInt(p, 10) || 0);
    const newVersion = `${versionParts[0]}.${(versionParts[1] || 0) + 1}.0`;

    const candidate: SkillDefinition = {
      skillId: currentActive.skillId,
      name: currentActive.name,
      description: currentActive.description,
      version: newVersion,
      workflow,
      requiredCapabilities: newCapabilities,
      risk: currentActive.risk,
      status: 'CANDIDATE',
      createdTime: Date.now(),
      updatedTime: Date.now(),
    };

    versions.push(candidate);
    this.skills.set(baseSkillId, versions);

    return candidate;
  }

  public promoteCandidate(skillId: string, version: string): { skill: SkillDefinition; diff: CapabilityDiff } {
    const versions = this.skills.get(skillId) || [];
    const target = versions.find((s) => s.version === version);

    if (!target) {
      throw new Error(`Skill "${skillId}" version v${version} not found.`);
    }

    const currentActive = versions.find((s) => s.status === 'ACTIVE');
    const diff = currentActive
      ? this.calculateCapabilityDiff(currentActive, target)
      : { added: target.requiredCapabilities, removed: [], unchanged: [], isExpansion: target.requiredCapabilities.length > 0 };

    if (currentActive) {
      currentActive.status = 'DEPRECATED';
    }

    target.status = 'ACTIVE';
    target.updatedTime = Date.now();

    return { skill: { ...target }, diff };
  }

  public rollbackSkill(skillId: string): SkillDefinition {
    const versions = this.skills.get(skillId) || [];
    const currentActiveIndex = versions.findIndex((s) => s.status === 'ACTIVE');

    if (currentActiveIndex === -1) {
      throw new Error(`Skill "${skillId}" has no active version to rollback.`);
    }

    const currentActive = versions[currentActiveIndex];
    currentActive.status = 'ROLLED_BACK';

    // Find previous non-deprecated/historical version
    const previous = versions
      .slice(0, currentActiveIndex)
      .reverse()
      .find((s) => s.status === 'DEPRECATED' || s.status === 'APPROVED');

    if (!previous) {
      throw new Error(`Skill "${skillId}" has no historical version to restore.`);
    }

    previous.status = 'ACTIVE';
    previous.updatedTime = Date.now();

    return { ...previous };
  }
}

export const skillManager = new SkillManager();
