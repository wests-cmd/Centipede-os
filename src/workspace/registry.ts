import { IntegrationCapability, NormalizedIntegrationResult, WorkspaceIntegration } from './types';
import { toolExecutor } from '../tools/executor';
import { toolRegistry } from '../tools/registry';

export class IntegrationRegistry {
  private integrations: Map<string, WorkspaceIntegration> = new Map();

  constructor() {
    this.initDefaultIntegrations();
  }

  private initDefaultIntegrations(): void {
    // 1. Filesystem Integration (Local OS Sandbox)
    this.registerIntegration({
      integrationId: 'int_filesystem',
      name: 'Local Filesystem',
      category: 'LOCAL',
      provider: 'System OS Sandbox',
      status: 'CONNECTED',
      sanitizedMetadata: { rootPath: '/app' },
      capabilities: [
        { capabilityId: 'filesystem.read', name: 'Read Files', description: 'Read file content', riskLevel: 'LOW', operationType: 'READ', requiresHumanApproval: false },
        { capabilityId: 'filesystem.write', name: 'Write Files', description: 'Write or modify files', riskLevel: 'MEDIUM', operationType: 'WRITE', requiresHumanApproval: false },
        { capabilityId: 'filesystem.delete', name: 'Delete Files', description: 'Delete files or directories', riskLevel: 'HIGH', operationType: 'DELETE', requiresHumanApproval: true },
      ],
    });

    // 2. Email Integration (IMAP/SMTP - Unauthenticated)
    this.registerIntegration({
      integrationId: 'int_email',
      name: 'Email Provider (IMAP/SMTP)',
      category: 'COMMUNICATION',
      provider: 'Mail Provider',
      status: 'NEEDS_AUTH', // Realistic status: Needs user authentication credentials!
      accountName: 'Unconfigured Email Account',
      sanitizedMetadata: { server: 'mail.centipede.os' },
      capabilities: [
        { capabilityId: 'email.search', name: 'Search Email', description: 'Search inbox messages', riskLevel: 'LOW', operationType: 'READ', requiresHumanApproval: false },
        { capabilityId: 'email.read', name: 'Read Email', description: 'Read email message body', riskLevel: 'LOW', operationType: 'READ', requiresHumanApproval: false },
        { capabilityId: 'email.draft', name: 'Draft Email', description: 'Create email draft', riskLevel: 'LOW', operationType: 'CREATE', requiresHumanApproval: false },
        { capabilityId: 'email.send', name: 'Send Email', description: 'Send email to recipient', riskLevel: 'HIGH', operationType: 'EXECUTE', requiresHumanApproval: true },
      ],
    });

    // 3. Calendar Integration (CalDAV - Unauthenticated)
    this.registerIntegration({
      integrationId: 'int_calendar',
      name: 'Personal Calendar',
      category: 'PRODUCTIVITY',
      provider: 'CalDAV Provider',
      status: 'NEEDS_AUTH', // Realistic status: Needs authentication!
      accountName: 'Unconfigured Calendar',
      sanitizedMetadata: { calendarName: 'Personal Schedule' },
      capabilities: [
        { capabilityId: 'calendar.read', name: 'Read Calendar', description: 'Read schedule events', riskLevel: 'LOW', operationType: 'READ', requiresHumanApproval: false },
        { capabilityId: 'calendar.create', name: 'Create Event', description: 'Schedule new event', riskLevel: 'MEDIUM', operationType: 'CREATE', requiresHumanApproval: false },
        { capabilityId: 'calendar.delete', name: 'Delete Event', description: 'Cancel calendar event', riskLevel: 'HIGH', operationType: 'DELETE', requiresHumanApproval: true },
      ],
    });

    // 4. GitHub Integration (GitHub API - Unauthenticated)
    this.registerIntegration({
      integrationId: 'int_github',
      name: 'GitHub Development Workspace',
      category: 'DEVELOPMENT',
      provider: 'GitHub API v3',
      status: 'NEEDS_AUTH', // Realistic status!
      accountName: 'Unconfigured GitHub Account',
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

  public async executeCapability(
    integrationId: string,
    capabilityId: string,
    parameters: any
  ): Promise<NormalizedIntegrationResult> {
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

    if (integration.status === 'NEEDS_AUTH' || integration.status === 'DISCONNECTED') {
      return {
        integrationId,
        capabilityId,
        status: 'BLOCKED',
        data: null,
        error: `INTEGRATION_UNAVAILABLE: Integration "${integration.name}" is in status "${integration.status}". User authentication required before capability execution!`,
        provenance: { timestamp: Date.now(), source: integration.name, trustClassification: 'UNTRUSTED_EXTERNAL_DATA' },
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

    // Authoritative Routing: Look up tool ID by capability and route through ToolExecutor
    try {
      const toolDef = toolRegistry.getToolByCapability(capabilityId);
      const targetToolId = toolDef ? toolDef.toolId : capabilityId;

      const toolRes = await toolExecutor.execute({
        id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        toolId: targetToolId,
        capability: capabilityId,
        parameters,
        chainDepth: 1,
        riskLevel: cap.riskLevel,
      });

      return {
        integrationId,
        capabilityId,
        status: toolRes.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
        data: toolRes.data,
        error: toolRes.error,
        provenance: { timestamp: Date.now(), source: integration.name, trustClassification: 'UNTRUSTED_EXTERNAL_DATA' },
      };
    } catch (err: any) {
      return {
        integrationId,
        capabilityId,
        status: 'FAILED',
        data: null,
        error: `Tool Execution Failure: ${err.message}`,
        provenance: { timestamp: Date.now(), source: integration.name, trustClassification: 'UNTRUSTED_EXTERNAL_DATA' },
      };
    }
  }
}

export const integrationRegistry = new IntegrationRegistry();
