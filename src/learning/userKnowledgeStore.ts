import { MemoryItem, TrustLevel } from './types';

export interface UserFactCorrection {
  originalMemoryId: string;
  correctedContent: string;
  correctionReason: string;
  timestamp: number;
}

export class UserKnowledgeStore {
  private memories: Map<string, MemoryItem> = new Map();
  private auditCorrections: UserFactCorrection[] = [];

  public addConfirmedFact(memoryId: string, content: string, scope = 'GLOBAL'): MemoryItem {
    const item: MemoryItem = {
      memoryId,
      type: 'FACT',
      content,
      trustLevel: 'USER_CONFIRMED',
      scope,
      timestamp: Date.now(),
    };
    this.memories.set(memoryId, item);
    return item;
  }

  public correctFact(memoryId: string, newContent: string, reason = 'User correction'): MemoryItem {
    const existing = this.memories.get(memoryId);

    // Conflict resolution: New user-confirmed correction supersedes old fact
    const updated: MemoryItem = {
      memoryId,
      type: 'FACT',
      content: newContent,
      trustLevel: 'USER_CONFIRMED',
      scope: existing ? existing.scope : 'GLOBAL',
      timestamp: Date.now(),
    };

    this.auditCorrections.push({
      originalMemoryId: memoryId,
      correctedContent: newContent,
      correctionReason: reason,
      timestamp: Date.now(),
    });

    this.memories.set(memoryId, updated);
    return updated;
  }

  public forgetMemory(memoryId: string): boolean {
    return this.memories.delete(memoryId);
  }

  public getMemory(memoryId: string): MemoryItem | undefined {
    return this.memories.get(memoryId);
  }

  public exportKnowledgeBackup(): string {
    return JSON.stringify(Array.from(this.memories.values()), null, 2);
  }

  public restoreKnowledgeBackup(backupJson: string): number {
    try {
      const items: MemoryItem[] = JSON.parse(backupJson);
      items.forEach((item) => this.memories.set(item.memoryId, item));
      return items.length;
    } catch (e) {
      throw new Error('Invalid knowledge backup JSON format.');
    }
  }
}

export const userKnowledgeStore = new UserKnowledgeStore();
