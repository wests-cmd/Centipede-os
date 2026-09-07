import { KingdomAdapter, kingdomAdapter } from '../../api/kingdomAdapter';
import { SearchProviderInterface, SearchQuery, SearchResultItem } from '../types';

export class AIMapSearchProvider implements SearchProviderInterface {
  public providerId = 'provider.aimaps';
  public sourceType = 'AI_MAP' as const;
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
      const maps = await this.adapter.get_maps();
      const matches = maps.filter((m) => m.toLowerCase().includes(q));

      return matches.map((mapName) => ({
        resultId: `res_aimap_${mapName}`,
        provider: 'AI_MAP',
        title: `AI Intelligence Map: ${mapName}`,
        summary: `Swarm intelligence map graph definition "${mapName}"`,
        source: `kingdom://maps/${mapName}`,
        metadata: { mapName },
        timestamp,
        confidence: 0.85,
        isUntrustedData: false,
      }));
    } catch (err) {
      return [];
    }
  }
}

export const aiMapSearchProvider = new AIMapSearchProvider();
