import { SearchProviderInterface, SearchQuery, SearchResultItem } from '../types';

export class ApplicationSearchProvider implements SearchProviderInterface {
  public providerId = 'provider.apps';
  public sourceType = 'APPLICATION' as const;

  private apps = [
    { id: 'ai', name: 'Centipede AI', desc: 'Governed AI Core Pipeline & Prompt Assistant' },
    { id: 'status', name: 'Kingdom Status', desc: 'Kingdom Engine Runtime Health, Modes & Swarm Knights' },
    { id: 'tasks', name: 'Activity & Tasks', desc: 'Task Execution Pipeline & Live Event Stream' },
    { id: 'security', name: 'Permissions & Approvals', desc: 'ZeroTrust Security, Approvals & Immutable Audit Trail' },
    { id: 'search', name: 'Universal Search', desc: 'Multi-Source Provider Search Engine' },
    { id: 'files', name: 'File Manager', desc: 'System Filesystem Explorer & Virtual Storage Inspector' },
    { id: 'terminal', name: 'Terminal', desc: 'Centipede OS Interactive CLI Entry Point' },
    { id: 'settings', name: 'Settings', desc: 'API Base URL, Polling Heartbeat & Theme Settings' },
  ];

  public async search(query: SearchQuery): Promise<SearchResultItem[]> {
    const q = query.text.toLowerCase().trim();
    const timestamp = Date.now();

    const matches = this.apps.filter(
      (app) => app.name.toLowerCase().includes(q) || app.desc.toLowerCase().includes(q)
    );

    return matches.map((app) => ({
      resultId: `res_app_${app.id}`,
      provider: 'APPLICATION',
      title: app.name,
      summary: app.desc,
      source: `centipede://apps/${app.id}`,
      metadata: { appId: app.id },
      timestamp,
      confidence: 0.9,
      isUntrustedData: false,
    }));
  }
}

export const applicationSearchProvider = new ApplicationSearchProvider();
