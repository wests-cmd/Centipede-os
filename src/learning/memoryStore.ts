import { KingdomAdapter, kingdomAdapter } from '../api/kingdomAdapter';
import { MemoryEntry, MemoryScope, TrustLevel } from './types';

export class MemoryStore {
  private localEntries: Map<string, MemoryEntry> = new Map();
  private adapter: KingdomAdapter;

  private trustRanks: Record<TrustLevel, number> = {
    SYSTEM_AUTHORITY: 100,
    KINGDOM_AUTHORITY: 90,
    USER_CONFIRMED: 80,
    USER_PROVIDED: 70,
    VERIFIED_TOOL_RESULT: 60,
    MODEL_INFERENCE: 40,
    EXTERNAL_SOURCE: 20,
    UNVERIFIED: 10,
  };

  constructor(adapter: KingdomAdapter = kingdomAdapter) {
    this.adapter = adapter;
  }

  public async recordMemory(entry: Omit<MemoryEntry, 'memoryId' | 'version' | 'lifecycle'> & { memoryId?: string }): Promise<MemoryEntry> {
    const memoryId = entry.memoryId || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullEntry: MemoryEntry = {
      ...entry,
      memoryId,
      version: 1,
      lifecycle: 'ACTIVE',
    };

    // Check if an entry with this ID exists and enforce Trust Level Hierarchy
    const existing = this.localEntries.get(memoryId);
    if (existing) {
      const existingRank = this.trustRanks[existing.trustLevel] || 0;
      const newRank = this.trustRanks[entry.trustLevel] || 0;

      if (newRank < existingRank) {
        throw new Error(`Trust level hierarchy violation: Memory write with lower rank "${entry.trustLevel}" cannot overwrite higher rank "${existing.trustLevel}".`);
      }
      fullEntry.version = existing.version + 1;
    }

    this.localEntries.set(memoryId, fullEntry);

    // Sync with Kingdom memory if online
    if (this.adapter.getConnectionState() === 'CONNECTED' && entry.trustLevel !== 'EXTERNAL_SOURCE') {
      try {
        await this.adapter.add_memory(entry.content, {
          memoryId,
          type: entry.type,
          trustLevel: entry.trustLevel,
          scope: entry.scope,
          projectId: entry.projectId,
        });
      } catch (e) {
        // Kingdom sync optional
      }
    }

    return fullEntry;
  }

  public deleteMemory(memoryId: string): boolean {
    const entry = this.localEntries.get(memoryId);
    if (entry) {
      entry.lifecycle = 'DELETED';
      return true;
    }
    return false;
  }

  public supersedeMemory(oldMemoryId: string, newEntry: Omit<MemoryEntry, 'memoryId' | 'version' | 'lifecycle'> & { memoryId?: string }): Promise<MemoryEntry> {
    const old = this.localEntries.get(oldMemoryId);
    if (old) {
      old.lifecycle = 'SUPERSEDED';
    }
    return this.recordMemory(newEntry);
  }

  public getMemoriesByScope(scope: MemoryScope, projectId?: string): MemoryEntry[] {
    return this.getMemories(scope, projectId);
  }

  public getMemories(scope?: MemoryScope, projectId?: string): MemoryEntry[] {
    const active = Array.from(this.localEntries.values()).filter(
      (e) => e.lifecycle === 'ACTIVE'
    );

    if (!scope && !projectId) {
      return active;
    }

    return active.filter((e) => {
      if (scope && e.scope !== scope) return false;
      if (projectId && e.projectId !== projectId) return false;
      return true;
    });
  }

  public getMemory(memoryId: string): MemoryEntry | undefined {
    const entry = this.localEntries.get(memoryId);
    return entry && entry.lifecycle === 'ACTIVE' ? { ...entry } : undefined;
  }
}

export const memoryStore = new MemoryStore();
