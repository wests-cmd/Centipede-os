import { actionExecutor } from './actionExecutor';
import { contextManager } from './contextManager';
import { conversationManager } from './conversationManager';
import { intentParser } from './intentParser';
import { permissionGate } from './permissionGate';
import { planner } from './planner';
import { resultProcessor } from './resultProcessor';
import {
  ActionRequest,
  ActionResult,
  AIPipelineStatus,
  Intent,
  Message,
  Plan,
  UserInput,
} from './types';

export class CentipedeAIPipeline {
  private pipelineListeners: Set<(state: Message) => void> = new Set();

  public subscribePipeline(listener: (state: Message) => void): () => void {
    this.pipelineListeners.add(listener);
    return () => this.pipelineListeners.delete(listener);
  }

  private notify(msg: Message): void {
    this.pipelineListeners.forEach((l) => l(msg));
  }

  public async process(input: UserInput): Promise<Message> {
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = Date.now();

    let currentMsg: Message = {
      id: msgId,
      sender: 'ai',
      text: input.text,
      timestamp,
      status: 'RECEIVED',
    };

    this.notify(currentMsg);

    // 1. UNDERSTANDING
    currentMsg = { ...currentMsg, status: 'UNDERSTANDING' };
    this.notify(currentMsg);
    await new Promise((r) => setTimeout(r, 100));

    // 2. INTENT_IDENTIFIED
    const intent: Intent = intentParser.parse(input);
    contextManager.recordIntent(intent);

    currentMsg = {
      ...currentMsg,
      intent,
      status: 'INTENT_IDENTIFIED',
    };
    this.notify(currentMsg);

    if (intent.type === 'UNKNOWN') {
      const explanation = resultProcessor.formatUserExplanation(intent, {
        actionId: 'none',
        status: 'FAILED',
        error: intent.explanation,
        timestamp: Date.now(),
      });
      currentMsg = {
        ...currentMsg,
        text: explanation,
        status: 'COMPLETED',
      };
      conversationManager.addMessage(currentMsg);
      this.notify(currentMsg);
      return currentMsg;
    }

    // 3. PLANNING
    currentMsg = { ...currentMsg, status: 'PLANNING' };
    this.notify(currentMsg);
    await new Promise((r) => setTimeout(r, 100));

    const plan: Plan = planner.createPlan(intent);
    currentMsg = { ...currentMsg, plan };
    this.notify(currentMsg);

    // 4. PERMISSION_CHECK
    currentMsg = { ...currentMsg, status: 'PERMISSION_CHECK' };
    this.notify(currentMsg);

    const actionReq: ActionRequest = permissionGate.evaluate(plan);

    if (actionReq.authorizationState === 'APPROVAL_REQUIRED') {
      currentMsg = { ...currentMsg, status: 'APPROVAL_REQUIRED' };
      this.notify(currentMsg);

      const actionResult: ActionResult = await actionExecutor.execute(actionReq, intent);
      const explanation = resultProcessor.formatUserExplanation(intent, actionResult);

      currentMsg = {
        ...currentMsg,
        text: explanation,
        actionResult,
        status: 'APPROVAL_REQUIRED',
      };
      conversationManager.addMessage(currentMsg);
      this.notify(currentMsg);
      return currentMsg;
    }

    if (actionReq.authorizationState === 'DENIED') {
      const actionResult: ActionResult = {
        actionId: actionReq.id,
        status: 'BLOCKED',
        error: 'Action denied by permission gate.',
        timestamp: Date.now(),
      };
      const explanation = resultProcessor.formatUserExplanation(intent, actionResult);

      currentMsg = {
        ...currentMsg,
        text: explanation,
        actionResult,
        status: 'DENIED',
      };
      conversationManager.addMessage(currentMsg);
      this.notify(currentMsg);
      return currentMsg;
    }

    // 5. EXECUTING
    currentMsg = { ...currentMsg, status: 'EXECUTING' };
    this.notify(currentMsg);

    const actionResult: ActionResult = await actionExecutor.execute(actionReq, intent);
    const explanation = resultProcessor.formatUserExplanation(intent, actionResult);

    currentMsg = {
      ...currentMsg,
      text: explanation,
      actionResult,
      status: actionResult.status === 'SUCCESS' ? 'COMPLETED' : 'FAILED',
    };

    conversationManager.addMessage(currentMsg);
    this.notify(currentMsg);
    return currentMsg;
  }
}

export const centipedeAIPipeline = new CentipedeAIPipeline();
