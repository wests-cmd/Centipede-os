import { SearchProviderInterface, SearchQuery, SearchResultItem } from '../types';

export class WebSearchProvider implements SearchProviderInterface {
  public providerId = 'provider.web';
  public sourceType = 'WEB' as const;

  public async search(query: SearchQuery): Promise<SearchResultItem[]> {
    const timestamp = Date.now();

    // Simulated web search result returning untrusted external content
    return [
      {
        resultId: `res_web_${timestamp}_1`,
        provider: 'WEB',
        title: `Web Result for "${query.text}"`,
        summary: `External webpage summary referencing ${query.text}. Note: Web content is classified as untrusted external data.`,
        source: `https://external-search.org/search?q=${encodeURIComponent(query.text)}`,
        metadata: { classification: 'UNTRUSTED_EXTERNAL_CONTENT' },
        timestamp,
        confidence: 0.7,
        isUntrustedData: true, // MUST be true for all external web content
      },
    ];
  }
}

export const webSearchProvider = new WebSearchProvider();
