import { IngestedContent } from './pipeline';

export interface StoredKnowledgeItem {
  knowledgeId: string;
  title: string;
  content: string;
  sourceType: IngestedContent['sourceType'];
  provenance: {
    uploaderId: string;
    timestamp: number;
    userConfirmed: boolean;
  };
  trustLevel: 'USER_CONFIRMED' | 'UNTRUSTED_EXTERNAL_DATA' | 'MODEL_INFERENCE';
  tags: string[];
}

export class KnowledgeManager {
  private knowledgeStore: Map<string, StoredKnowledgeItem> = new Map();

  public addKnowledge(
    title: string,
    content: string,
    sourceType: IngestedContent['sourceType'],
    uploaderId = 'desktop_user',
    userConfirmed = true
  ): StoredKnowledgeItem {
    const knowledgeId = `know_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const item: StoredKnowledgeItem = {
      knowledgeId,
      title,
      content,
      sourceType,
      provenance: {
        uploaderId,
        timestamp: Date.now(),
        userConfirmed,
      },
      // Security Directive: Explicit trust hierarchy classification
      trustLevel: userConfirmed ? 'USER_CONFIRMED' : 'UNTRUSTED_EXTERNAL_DATA',
      tags: ['knowledge', sourceType.toLowerCase()],
    };

    this.knowledgeStore.set(knowledgeId, item);
    return item;
  }

  public getKnowledge(knowledgeId: string): StoredKnowledgeItem | undefined {
    return this.knowledgeStore.get(knowledgeId);
  }

  public listKnowledge(): StoredKnowledgeItem[] {
    return Array.from(this.knowledgeStore.values());
  }
}

export const knowledgeManager = new KnowledgeManager();
