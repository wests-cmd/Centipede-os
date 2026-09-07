import { KingdomAdapter, kingdomAdapter } from '../../api/kingdomAdapter';
import { SearchProviderInterface, SearchQuery, SearchResultItem } from '../types';

export class MemorySearchProvider implements SearchProviderInterface {
  public providerId = 'provider.memory';
  public sourceType = 'MEMORY' as const;
  private adapter: KingdomAdapter;

  constructor(adapter: KingdomAdapter = kingdomAdapter) {
    this.adapter = adapter;
  }

  public async search(query: SearchQuery): Promise<SearchResultItem[]> {
    const timestamp = Date.now();

    if (this.adapter.getConnectionState() !== 'CONNECTED') {
      return [];
    }

    try {
      const results = await this.adapter.search_memory(query.text, query.limit || 5);

      return results.map((m: any, idx: number) => ({
        resultId: `res_mem_${m.id || idx}`,
        provider: 'MEMORY',
        title: `Memory Entry: ${m.content ? m.content.substring(0, 35) + '...' : 'Recorded Entry'}`,
        summary: m.content || JSON.stringify(m),
        source: `kingdom://memory/${m.id || idx}`,
        metadata: { weight: m.weight || 1.0 },
        timestamp,
        confidence: 0.88,
        isUntrustedData: false,
      }));
    } catch (err) {
      return [];
    }
  }
}

export const memorySearchProvider = new MemorySearchProvider();
