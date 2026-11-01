import { generateSecureRandomHex } from '../security/cryptoUtils';
import { kingdomAdapter } from '../api/kingdomAdapter';
import { capabilityGrantEngine } from './grants';

export interface SecurityIncident {
  incidentId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  sourceComponent: string;
  agentId?: string;
  eventType: string;
  description: string;
  timestamp: number;
  actionTaken: 'LOG' | 'BLOCK' | 'REVOKE_AGENT' | 'KILL_SWITCH_ENGAGED' | 'SELF_HEALING';
}

export interface SelfHealingResult {
  resolved: boolean;
  actionTaken: string;
  incidentId: string;
  timestamp: number;
}

export class IncidentManager {
  private incidents: SecurityIncident[] = [];
  private healingLog: SelfHealingResult[] = [];

  public recordIncident(
    severity: SecurityIncident['severity'],
    sourceComponent: string,
    eventType: string,
    description: string,
    actionTaken: SecurityIncident['actionTaken'],
    agentId?: string
  ): SecurityIncident {
    const incidentId = `inc_${Date.now()}_${generateSecureRandomHex(4)}`;
    const incident: SecurityIncident = {
      incidentId,
      severity,
      sourceComponent,
      agentId,
      eventType,
      description,
      timestamp: Date.now(),
      actionTaken,
    };

    this.incidents.push(incident);
    return incident;
  }

  public async attemptSelfHealing(incident: SecurityIncident): Promise<SelfHealingResult> {
    let resolved = false;
    let actionTaken = 'NO_REMEDIATION_AVAILABLE';

    const descUpper = (incident.description || '').toUpperCase();
    const typeUpper = (incident.eventType || '').toUpperCase();

    if (descUpper.includes('OFFLINE') || descUpper.includes('DISCONNECTED') || typeUpper.includes('KINGDOM_OFFLINE') || typeUpper.includes('TIMEOUT')) {
      actionTaken = 'RECONNECT_KINGDOM_BACKEND';
      try {
        resolved = await kingdomAdapter.reconnect();
      } catch {
        resolved = false;
      }
    } else if (descUpper.includes('STORAGE') || descUpper.includes('CAPABILITY_GRANT') || typeUpper.includes('GRANT_EXPIRED')) {
      actionTaken = 'PURGE_EXPIRED_GRANTS_AND_CACHE';
      try {
        const purgedCount = capabilityGrantEngine.purgeExpiredGrants(true);
        kingdomAdapter.clearEndpointRegexCache();
        resolved = true;
        actionTaken = `PURGE_EXPIRED_GRANTS_AND_CACHE (Purged ${purgedCount} grants)`;
      } catch {
        resolved = false;
      }
    } else if (descUpper.includes('DEGRADED') || typeUpper.includes('DEGRADED')) {
      actionTaken = 'RESET_STATE_AND_RENEGOTIATE_CAPABILITIES';
      try {
        kingdomAdapter.clearEndpointRegexCache();
        resolved = await kingdomAdapter.reconnect();
      } catch {
        resolved = false;
      }
    } else if (incident.severity === 'LOW' || incident.severity === 'MEDIUM') {
      actionTaken = 'RESET_TRANSIENT_COMPONENT_STATE';
      resolved = true;
    }

    const result: SelfHealingResult = {
      resolved,
      actionTaken,
      incidentId: incident.incidentId,
      timestamp: Date.now(),
    };

    this.healingLog.push(result);
    return result;
  }

  public getIncidents(): SecurityIncident[] {
    return [...this.incidents];
  }

  public getHealingLog(): SelfHealingResult[] {
    return [...this.healingLog];
  }
}

export const incidentManager = new IncidentManager();
