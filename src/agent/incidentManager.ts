export interface SecurityIncident {
  incidentId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  sourceComponent: string;
  agentId?: string;
  eventType: string;
  description: string;
  timestamp: number;
  actionTaken: 'LOG' | 'BLOCK' | 'REVOKE_AGENT' | 'KILL_SWITCH_ENGAGED';
}

export class IncidentManager {
  private incidents: SecurityIncident[] = [];

  public recordIncident(
    severity: SecurityIncident['severity'],
    sourceComponent: string,
    eventType: string,
    description: string,
    actionTaken: SecurityIncident['actionTaken'],
    agentId?: string
  ): SecurityIncident {
    const incidentId = `inc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
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

  public getIncidents(): SecurityIncident[] {
    return [...this.incidents];
  }
}

export const incidentManager = new IncidentManager();
