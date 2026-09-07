import { ToolDefinition, ToolRegistryDiscoveryItem } from './types';

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private isLocked = false;

  public register(tool: ToolDefinition): void {
    if (this.isLocked) {
      throw new Error('ToolRegistry is locked against runtime tool registrations.');
    }
    if (this.tools.has(tool.toolId)) {
      throw new Error(`Duplicate tool registration rejected: "${tool.toolId}".`);
    }
    this.tools.set(tool.toolId, { ...tool });
  }

  public lockRegistry(): void {
    this.isLocked = true;
  }

  public getTool(toolId: string): ToolDefinition | undefined {
    const tool = this.tools.get(toolId);
    return tool ? { ...tool } : undefined;
  }

  public getToolByCapability(capability: string): ToolDefinition | undefined {
    for (const tool of this.tools.values()) {
      if (tool.capabilities.includes(capability)) {
        return { ...tool };
      }
    }
    return undefined;
  }

  public getAvailableTools(): ToolRegistryDiscoveryItem[] {
    return Array.from(this.tools.values()).map((t) => ({
      toolId: t.toolId,
      name: t.name,
      description: t.description,
      category: t.category,
      capabilities: [...t.capabilities],
      riskClass: t.riskClass,
      requiresApproval: t.requiresApproval,
    }));
  }

  public count(): number {
    return this.tools.size;
  }
}

export const toolRegistry = new ToolRegistry();
