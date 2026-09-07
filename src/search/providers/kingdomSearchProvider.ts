import { KingdomAdapter, kingdomAdapter } from '../../api/kingdomAdapter';
import { SearchProviderInterface, SearchQuery, SearchResultItem } from '../types';

export class KingdomSearchProvider implements SearchProviderInterface {
  public providerId = 'provider.kingdom';
  public sourceType = 'KINGDOM' as const;
  private adapter: KingdomAdapter;

  constructor(adapter: KingdomAdapter = kingdomAdapter) {
    this.adapter = adapter;
  }

  public async search(query: SearchQuery): Promise<SearchResultItem[]> {
    const q = query.text.toLowerCase().trim();
    const timestamp = Date.now();

    if (this.adapter.getConnectionState() !== 'CONNECTED') {
      return [];
    }

    try {
      const tasks = await this.adapter.list_tasks();
      const matches = tasks.filter(
        (t) => t.prompt.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || t.status.toLowerCase().includes(q)
      );

      return matches.map((t) => ({
        resultId: `res_kingdom_task_${t.id}`,
        provider: 'KINGDOM',
        title: `Kingdom Task: ${t.prompt.substring(0, 40)}...`,
        summary: `Status: ${t.status.toUpperCase()} • ID: ${t.id}`,
        source: `kingdom://tasks/${t.id}`,
        metadata: { taskId: t.id, status: t.status },
        timestamp,
        confidence: 0.9,
        isUntrustedData: false,
      }));
    } catch (err) {
      return [];
    }
  }
}

export const kingdomSearchProvider = new KingdomSearchProvider();
