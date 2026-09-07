import { SearchProviderInterface, SearchQuery, SearchResultItem } from '../types';

export class FileSearchProvider implements SearchProviderInterface {
  public providerId = 'provider.files';
  public sourceType = 'FILE' as const;

  private files = [
    { name: 'KINGDOM_CENTIPEDE_API_CONTRACT.md', size: '15.2 KB', desc: 'Formal Kingdom ↔ Centipede OS API Contract v1.0.0 Specification' },
    { name: 'KINGDOM_INTEGRATION.md', size: '6.4 KB', desc: 'Kingdom integration architecture and endpoint coverage matrix' },
    { name: 'README.md', size: '3.1 KB', desc: 'Centipede OS overview and quick start guide' },
    { name: 'configs/runtime.yaml', size: '1.1 KB', desc: 'Runtime configuration' },
    { name: 'logs/audit.log', size: '12.4 KB', desc: 'ZeroTrust Security audit log' },
  ];

  public async search(query: SearchQuery): Promise<SearchResultItem[]> {
    const q = query.text.toLowerCase().trim();
    const timestamp = Date.now();

    // Security Check: Path Traversal Defense
    if (q.includes('..') || q.includes('/etc') || q.includes('/root') || q.includes('/proc') || q.includes('/sys')) {
      console.warn(`FileSearchProvider: Path traversal attack blocked for query: "${query.text}"`);
      return [
        {
          resultId: `res_file_blocked_${timestamp}`,
          provider: 'FILE',
          title: 'Path Traversal Attack Blocked',
          summary: `Access to path "${query.text}" is restricted by filesystem security scope policy.`,
          source: 'security://filesystem/scope_protection',
          metadata: { securityEvent: 'PATH_TRAVERSAL_BLOCKED' },
          timestamp,
          confidence: 0.0,
          isUntrustedData: true,
        },
      ];
    }

    const matches = this.files.filter(
      (f) => f.name.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q)
    );

    return matches.map((f) => ({
      resultId: `res_file_${f.name.replace(/[^a-z0-9]/gi, '_')}`,
      provider: 'FILE',
      title: f.name,
      summary: `${f.desc} (${f.size})`,
      source: `file://${f.name}`,
      metadata: { path: f.name, size: f.size },
      timestamp,
      confidence: 0.85,
      isUntrustedData: false,
    }));
  }
}

export const fileSearchProvider = new FileSearchProvider();
