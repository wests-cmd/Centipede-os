import { Intent, UserInput } from './types';

export class ContextManager {
  private activeContext: Record<string, any> = {};
  private recentIntents: Intent[] = [];

  public updateContext(key: string, value: any): void {
    this.activeContext[key] = value;
  }

  public recordIntent(intent: Intent): void {
    this.recentIntents.unshift(intent);
    if (this.recentIntents.length > 10) {
      this.recentIntents.pop();
    }
  }

  public getContext(): Record<string, any> {
    return {
      ...this.activeContext,
      recentIntents: this.recentIntents.map((i) => i.type),
      timestamp: Date.now(),
    };
  }

  public clear(): void {
    this.activeContext = {};
    this.recentIntents = [];
  }
}

export const contextManager = new ContextManager();
