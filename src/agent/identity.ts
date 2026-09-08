export interface AgentIdentity {
  agentId: string;
  agentName: string;
  agentVersion: string;
  userId: string;
  deviceId: string;
  sessionId: string;
  trustState: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  issuedAt: number;
  expiresAt: number;
}

export class AgentIdentityManager {
  private activeAgentIdentities: Map<string, AgentIdentity> = new Map();

  public createIdentity(
    agentName: string,
    userId = 'desktop_user',
    deviceId = 'desktop_device',
    sessionId = 'session_default',
    ttlMs = 3600000 // 1 hour
  ): AgentIdentity {
    const agentId = `agent_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const identity: AgentIdentity = {
      agentId,
      agentName,
      agentVersion: '1.0.0',
      userId,
      deviceId,
      sessionId,
      trustState: 'ACTIVE',
      issuedAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };

    this.activeAgentIdentities.set(agentId, identity);
    return identity;
  }

  public validateIdentity(agentId: string): { valid: boolean; identity?: AgentIdentity; error?: string } {
    const identity = this.activeAgentIdentities.get(agentId);
    if (!identity) {
      return { valid: false, error: 'AGENT_NOT_FOUND: Unregistered or invalid agent identity.' };
    }

    if (identity.trustState === 'REVOKED') {
      return { valid: false, error: 'AGENT_REVOKED: Agent identity has been revoked by security policy.' };
    }

    if (identity.expiresAt < Date.now()) {
      return { valid: false, error: 'AGENT_EXPIRED: Agent identity context has expired.' };
    }

    return { valid: true, identity };
  }

  public revokeIdentity(agentId: string): boolean {
    const identity = this.activeAgentIdentities.get(agentId);
    if (!identity) return false;
    identity.trustState = 'REVOKED';
    return true;
  }
}

export const agentIdentityManager = new AgentIdentityManager();
