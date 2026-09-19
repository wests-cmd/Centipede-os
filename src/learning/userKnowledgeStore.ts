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

  public addConfirmedFact(memoryId: string, content: string, scope = 'SYSTEM'): MemoryItem {
    const item: MemoryItem = {
      memoryId,
      type: 'SEMANTIC',
      content,
      trustLevel: 'USER_CONFIRMED',
      confidence: 1.0,
      version: 1,
      scope: 'SYSTEM',
      provenance: {
        source: 'USER_INPUT',
        sourceId: 'user_knowledge_store',
        timestamp: Date.now(),
      },
      lifecycle: 'ACTIVE',
    };
    this.memories.set(memoryId, item);
    return item;
  }

  public correctFact(memoryId: string, newContent: string, reason = 'User correction'): MemoryItem {
    const existing = this.memories.get(memoryId);

    // Conflict resolution: New user-confirmed correction supersedes old fact
    const updated: MemoryItem = {
      memoryId,
      type: 'SEMANTIC',
      content: newContent,
      trustLevel: 'USER_CONFIRMED',
      confidence: 1.0,
      version: existing ? existing.version + 1 : 1,
      scope: existing ? existing.scope : 'SYSTEM',
      provenance: {
        source: 'USER_INPUT',
        sourceId: 'user_knowledge_store_correction',
        timestamp: Date.now(),
      },
      lifecycle: 'ACTIVE',
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
    const items = new Array(this.memories.size);
    let i = 0;
    for (const value of this.memories.values()) {
      items[i++] = value;
    }
    return JSON.stringify(items);
  }

  public restoreKnowledgeBackup(backupJson: string): number {
    try {
      const items: MemoryItem[] = JSON.parse(backupJson);
      if (!Array.isArray(items)) {
        throw new Error('Backup payload is not an array.');
      }
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item && item.memoryId) {
          this.memories.set(item.memoryId, item);
        }
      }
      return items.length;
    } catch (e) {
      throw new Error('Invalid knowledge backup JSON format.');
    }
  }
}

export const userKnowledgeStore = new UserKnowledgeStore();
