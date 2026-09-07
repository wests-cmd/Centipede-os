export type SearchSourceType =
  | 'USER'
  | 'KINGDOM'
  | 'MEMORY'
  | 'FILE'
  | 'APPLICATION'
  | 'AI_MAP'
  | 'WEB';

export interface SearchQuery {
  id: string;
  text: string;
  sourcePermissions: SearchSourceType[];
  limit?: number;
  timeoutMs?: number;
}

export interface SearchResultItem {
  resultId: string;
  provider: SearchSourceType;
  title: string;
  summary: string;
  source: string;
  metadata?: Record<string, any>;
  timestamp: number;
  confidence: number;
  isUntrustedData: boolean;
}

export interface SearchContext {
  queryId: string;
  results: SearchResultItem[];
  hasConflicts: boolean;
  accessedProtectedSources: string[];
}

export interface SearchProviderInterface {
  providerId: string;
  sourceType: SearchSourceType;
  search(query: SearchQuery): Promise<SearchResultItem[]>;
}

export interface SearchPolicy {
  allowedSources: SearchSourceType[];
  maxResultsPerProvider: number;
  globalTimeoutMs: number;
}
