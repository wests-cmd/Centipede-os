import {
  SearchContext,
  SearchPolicy,
  SearchProviderInterface,
  SearchQuery,
  SearchResultItem,
  SearchSourceType,
} from './types';
import { applicationSearchProvider } from './providers/applicationSearchProvider';
import { fileSearchProvider } from './providers/fileSearchProvider';
import { kingdomSearchProvider } from './providers/kingdomSearchProvider';
import { memorySearchProvider } from './providers/memorySearchProvider';
import { aiMapSearchProvider } from './providers/aiMapSearchProvider';
import { webSearchProvider } from './providers/webSearchProvider';

export class SearchAggregator {
  private providers: SearchProviderInterface[] = [
    applicationSearchProvider,
    fileSearchProvider,
    kingdomSearchProvider,
    memorySearchProvider,
    aiMapSearchProvider,
    webSearchProvider,
  ];

  private defaultPolicy: SearchPolicy = {
    allowedSources: ['APPLICATION', 'FILE', 'KINGDOM', 'MEMORY', 'AI_MAP', 'WEB'],
    maxResultsPerProvider: 5,
    globalTimeoutMs: 5000,
  };

  public async search(
    queryText: string,
    allowedSources?: SearchSourceType[],
    policy: Partial<SearchPolicy> = {}
  ): Promise<SearchContext> {
    const queryId = `search_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const effectivePolicy: SearchPolicy = { ...this.defaultPolicy, ...policy };
    const permissions = allowedSources || effectivePolicy.allowedSources;

    const query: SearchQuery = {
      id: queryId,
      text: queryText,
      sourcePermissions: permissions,
      limit: effectivePolicy.maxResultsPerProvider,
      timeoutMs: 3000,
    };

    // Filter providers by allowed source permissions
    const activeProviders = this.providers.filter((p) => permissions.includes(p.sourceType));

    const accessedProtectedSources: string[] = [];
    const aggregatedResults: SearchResultItem[] = [];

    // Execute provider searches in parallel with timeouts using Promise.allSettled
    const searchPromises = activeProviders.map(async (provider) => {
      let timer: any = null;
      try {
        const timeoutPromise = new Promise<SearchResultItem[]>((resolve) => {
          timer = setTimeout(() => resolve([]), query.timeoutMs);
        });

        const results = await Promise.race([provider.search(query), timeoutPromise]);
        if (timer) clearTimeout(timer);

        accessedProtectedSources.push(provider.sourceType);
        return results.slice(0, effectivePolicy.maxResultsPerProvider);
      } catch (err) {
        if (timer) clearTimeout(timer);
        return [];
      }
    });

    let globalTimer: any = null;
    const globalTimeout = new Promise<SearchResultItem[][]>((resolve) => {
      globalTimer = setTimeout(() => resolve([]), effectivePolicy.globalTimeoutMs);
    });

    const providerResultsSettled = await Promise.race([
      Promise.allSettled(searchPromises).then((settled) =>
        settled.map((s) => (s.status === 'fulfilled' ? s.value : []))
      ),
      globalTimeout,
    ]);

    if (globalTimer) clearTimeout(globalTimer);

    for (const resList of providerResultsSettled) {
      if (Array.isArray(resList)) {
        aggregatedResults.push(...resList);
      }
    }

    // Enforce total context size cap
    const finalResults = aggregatedResults.slice(0, 20);

    // Fast O(N) Conflict detection across sources using a Set
    let hasConflicts = false;
    const seenTitles = new Set<string>();
    for (let i = 0; i < finalResults.length; i++) {
      const lowerTitle = finalResults[i].title.toLowerCase();
      if (seenTitles.has(lowerTitle)) {
        hasConflicts = true;
        break;
      }
      seenTitles.add(lowerTitle);
    }

    return {
      queryId,
      results: finalResults,
      hasConflicts,
      accessedProtectedSources,
    };
  }
}

export const searchAggregator = new SearchAggregator();
