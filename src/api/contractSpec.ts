export interface KingdomEndpointSpec {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  requiredParams?: string[];
  requiredResponseFields?: string[];
}

export interface KingdomContractSpecification {
  contractVersion: string;
  minSupportedKingdomVersion: string;
  maxTestedKingdomVersion: string;
  requiredCapabilities: string[];
  endpoints: Record<string, KingdomEndpointSpec>;
}

export const KINGDOM_CONTRACT_SPEC: KingdomContractSpecification = {
  contractVersion: '40.1.0',
  minSupportedKingdomVersion: '40.0.0',
  maxTestedKingdomVersion: '40.1.9',
  requiredCapabilities: [
    'runtime.status',
    'runtime.mode',
    'tasks.submit',
    'tasks.list',
    'knights.list',
    'models.health',
    'memory.read',
    'security.authorize',
    'security.approvals',
  ],
  endpoints: {
    '/status': { path: '/status', method: 'GET', requiredResponseFields: ['running', 'mode', 'version'] },
    '/mode': { path: '/mode', method: 'GET', requiredResponseFields: ['mode'] },
    '/start': { path: '/start', method: 'POST', requiredResponseFields: ['status'] },
    '/stop': { path: '/stop', method: 'POST', requiredResponseFields: ['status'] },
    '/tasks': { path: '/tasks', method: 'GET' },
    '/knights': { path: '/knights', method: 'GET' },
    '/models': { path: '/models', method: 'GET' },
    '/memory': { path: '/memory', method: 'GET' },
    '/security/status': { path: '/security/status', method: 'GET' },
    '/security/authorize': { path: '/security/authorize', method: 'POST', requiredParams: ['actor_id', 'capability', 'operation'] },
    '/security/approvals': { path: '/security/approvals', method: 'GET' },
  },
};
