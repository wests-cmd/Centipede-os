import { IntegrationCapability, NormalizedIntegrationResult, WorkspaceIntegration } from './types';

export class IntegrationRegistry {
  private integrations: Map<string, WorkspaceIntegration> = new Map();

  constructor() {
    this.initDefaultIntegrations();
  }

  private initDefaultIntegrations(): void {
    // 1. Filesystem Integration
    this.registerIntegration({
      integrationId: 'int_filesystem',
      name: 'Local Filesystem',
      category: 'LOCAL',
      provider: 'System OS',
      status: 'CONNECTED',
      sanitizedMetadata: { rootPath: '/app' },
      capabilities: [
        { capabilityId: 'filesystem.read', name: 'Read Files', description: 'Read file content', riskLevel: 'LOW', operationType: 'READ', requiresHumanApproval: false },
        { capabilityId: 'filesystem.write', name: 'Write Files', description: 'Write or modify files', riskLevel: 'MEDIUM', operationType: 'WRITE', requiresHumanApproval: false },
        { capabilityId: 'filesystem.delete', name: 'Delete Files', description: 'Delete files or directories', riskLevel: 'HIGH', operationType: 'DELETE', requiresHumanApproval: true },
      ],
    });

    // 2. Email Integration
    this.registerIntegration({
      integrationId: 'int_email',
      name: 'Email Provider (IMAP/SMTP)',
      category: 'COMMUNICATION',
      provider: 'Mail Integration',
      status: 'CONNECTED',
      accountName: 'user@centipede.os',
      sanitizedMetadata: { server: 'mail.centipede.os' },
      capabilities: [
        { capabilityId: 'email.search', name: 'Search Email', description: 'Search inbox messages', riskLevel: 'LOW', operationType: 'READ', requiresHumanApproval: false },
        { capabilityId: 'email.read', name: 'Read Email', description: 'Read email message body', riskLevel: 'LOW', operationType: 'READ', requiresHumanApproval: false },
        { capabilityId: 'email.draft', name: 'Draft Email', description: 'Create email draft', riskLevel: 'LOW', operationType: 'CREATE', requiresHumanApproval: false },
        { capabilityId: 'email.send', name: 'Send Email', description: 'Send email to recipient', riskLevel: 'HIGH', operationType: 'EXECUTE', requiresHumanApproval: true },
      ],
    });

    // 3. Calendar Integration
    this.registerIntegration({
      integrationId: 'int_calendar',
      name: 'Personal Calendar',
      category: 'PRODUCTIVITY',
      provider: 'CalDAV / iCal',
      status: 'CONNECTED',
      accountName: 'user@centipede.os',
      sanitizedMetadata: { calendarName: 'Personal Schedule' },
      capabilities: [
        { capabilityId: 'calendar.read', name: 'Read Calendar', description: 'Read schedule events', riskLevel: 'LOW', operationType: 'READ', requiresHumanApproval: false },
        { capabilityId: 'calendar.create', name: 'Create Event', description: 'Schedule new event', riskLevel: 'MEDIUM', operationType: 'CREATE', requiresHumanApproval: false },
        { capabilityId: 'calendar.delete', name: 'Delete Event', description: 'Cancel calendar event', riskLevel: 'HIGH', operationType: 'DELETE', requiresHumanApproval: true },
      ],
    });

    // 4. GitHub Integration
    this.registerIntegration({
      integrationId: 'int_github',
      name: 'GitHub Development Workspace',
      category: 'DEVELOPMENT',
      provider: 'GitHub API v3',
      status: 'CONNECTED',
      accountName: 'centipede-developer',
      sanitizedMetadata: { scopes: 'repo,issue' },
      capabilities: [
        { capabilityId: 'github.repo.read', name: 'Read Repositories', description: 'Read repository issues and code', riskLevel: 'LOW', operationType: 'READ', requiresHumanApproval: false },
        { capabilityId: 'github.issue.create', name: 'Create Issue', description: 'Open new repository issue', riskLevel: 'MEDIUM', operationType: 'CREATE', requiresHumanApproval: false },
        { capabilityId: 'github.code.push', name: 'Push Code', description: 'Push commits to remote repository', riskLevel: 'HIGH', operationType: 'EXECUTE', requiresHumanApproval: true },
      ],
    });
  }

  public registerIntegration(integration: WorkspaceIntegration): void {
    this.integrations.set(integration.integrationId, { ...integration });
  }

  public getIntegration(integrationId: string): WorkspaceIntegration | undefined {
    const found = this.integrations.get(integrationId);
    return found ? JSON.parse(JSON.stringify(found)) : undefined;
  }

  public listIntegrations(): WorkspaceIntegration[] {
    return Array.from(this.integrations.values()).map((i) => JSON.parse(JSON.stringify(i)));
  }

  public executeCapability(
    integrationId: string,
    capabilityId: string,
    parameters: any
  ): NormalizedIntegrationResult {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      return {
        integrationId,
        capabilityId,
        status: 'BLOCKED',
        data: null,
        error: `INTEGRATION_NOT_FOUND: Integration "${integrationId}" is not registered.`,
        provenance: { timestamp: Date.now(), source: integrationId, trustClassification: 'UNTRUSTED_EXTERNAL_DATA' },
      };
    }

    const cap = integration.capabilities.find((c) => c.capabilityId === capabilityId);
    if (!cap) {
      return {
        integrationId,
        capabilityId,
        status: 'BLOCKED',
        data: null,
        error: `CAPABILITY_NOT_FOUND: Capability "${capabilityId}" is not provided by integration "${integrationId}".`,
        provenance: { timestamp: Date.now(), source: integration.name, trustClassification: 'UNTRUSTED_EXTERNAL_DATA' },
      };
    }

    if (cap.requiresHumanApproval) {
      return {
        integrationId,
        capabilityId,
        status: 'APPROVAL_REQUIRED',
        data: { capability: cap, parameters },
        error: `ZeroTrust Policy: Capability "${capabilityId}" requires human approval before execution.`,
        provenance: { timestamp: Date.now(), source: integration.name, trustClassification: 'UNTRUSTED_EXTERNAL_DATA' },
      };
    }

    return {
      integrationId,
      capabilityId,
      status: 'SUCCESS',
      data: { result: `Executed ${cap.name} successfully`, parameters },
      provenance: { timestamp: Date.now(), source: integration.name, trustClassification: 'UNTRUSTED_EXTERNAL_DATA' },
    };
  }
}

export const integrationRegistry = new IntegrationRegistry();
