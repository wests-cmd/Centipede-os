import { Intent } from './types';
import { SearchContext } from '../search/types';

export class ContextManager {
  private activeContext: Record<string, any> = {};
  private recentIntents: Intent[] = [];
  private lastSearchContext: SearchContext | null = null;

  public updateContext(key: string, value: any): void {
    this.activeContext[key] = value;
  }

  public recordIntent(intent: Intent): void {
    this.recentIntents.unshift(intent);
    if (this.recentIntents.length > 10) {
      this.recentIntents.pop();
    }
  }

  public recordSearchContext(searchCtx: SearchContext): void {
    this.lastSearchContext = searchCtx;
  }

  public getContext(): Record<string, any> {
    return {
      ...this.activeContext,
      recentIntents: this.recentIntents.map((i) => i.type),
      searchContext: this.lastSearchContext ? {
        queryId: this.lastSearchContext.queryId,
        resultsCount: this.lastSearchContext.results.length,
        hasConflicts: this.lastSearchContext.hasConflicts,
        sources: this.lastSearchContext.accessedProtectedSources,
      } : null,
      timestamp: Date.now(),
    };
  }

  public clear(): void {
    this.activeContext = {};
    this.recentIntents = [];
    this.lastSearchContext = null;
  }
}

export const contextManager = new ContextManager();
