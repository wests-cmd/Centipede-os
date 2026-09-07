export interface UserConfiguration {
  theme: 'dark' | 'light' | 'system';
  voiceEnabled: boolean;
  selectedAiProvider: 'ollama' | 'openai_compatible' | 'local_fallback';
  kingdomApiUrl: string;
  notificationsEnabled: boolean;
}

export interface RuntimeConfiguration {
  bindAddress: string;
  port: number;
  storageDir: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  kingdomApiUrl: string;
  ollamaApiUrl: string;
}

export interface SecurityConfiguration {
  zeroTrustEnabled: boolean;
  mobilePairingAllowed: boolean;
  sessionTimeoutMinutes: number;
  maxUploadSizeBytes: number;
  blockedFileExtensions: string[];
}

export interface CentipedeConfig {
  user: UserConfiguration;
  runtime: RuntimeConfiguration;
  security: SecurityConfiguration;
}

export class ConfigManager {
  private config: CentipedeConfig;

  constructor() {
    const isNode = typeof process !== 'undefined' && process.env;
    const kingdomUrl = isNode && process.env.KINGDOM_API_URL ? process.env.KINGDOM_API_URL : 'http://localhost:8000';
    const ollamaUrl = isNode && process.env.OLLAMA_API_URL ? process.env.OLLAMA_API_URL : 'http://localhost:11434';
    const bindAddr = isNode && process.env.BIND_ADDRESS ? process.env.BIND_ADDRESS : '0.0.0.0';
    const portNum = isNode && process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

    this.config = {
      user: {
        theme: 'dark',
        voiceEnabled: true,
        selectedAiProvider: 'ollama',
        kingdomApiUrl: kingdomUrl,
        notificationsEnabled: true,
      },
      runtime: {
        bindAddress: bindAddr,
        port: portNum,
        storageDir: isNode && process.env.STORAGE_DIR ? process.env.STORAGE_DIR : './data',
        logLevel: 'info',
        kingdomApiUrl: kingdomUrl,
        ollamaApiUrl: ollamaUrl,
      },
      security: {
        zeroTrustEnabled: true,
        mobilePairingAllowed: true,
        sessionTimeoutMinutes: 60,
        maxUploadSizeBytes: 10 * 1024 * 1024, // 10MB
        blockedFileExtensions: ['.exe', '.bat', '.sh', '.cmd', '.dll', '.so', '.dylib'],
      },
    };
  }

  public getConfig(): CentipedeConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  public validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.runtime.kingdomApiUrl.startsWith('http://') && !this.config.runtime.kingdomApiUrl.startsWith('https://')) {
      errors.push('Invalid kingdomApiUrl: Must start with http:// or https://');
    }

    if (this.config.runtime.port <= 0 || this.config.runtime.port > 65535) {
      errors.push('Invalid port: Must be between 1 and 65535.');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const configManager = new ConfigManager();
