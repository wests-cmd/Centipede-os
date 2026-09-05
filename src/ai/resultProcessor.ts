import { ActionResult, Intent } from './types';

export class ResultProcessor {
  public formatUserExplanation(intent: Intent, result: ActionResult): string {
    if (result.status === 'BLOCKED') {
      return `Action Blocked: ${result.error || 'Access denied by ZeroTrust policy.'}`;
    }

    if (result.status === 'PENDING') {
      return `Security Approval Required: ${result.data?.message || 'Action requires human approval in Kingdom.'}`;
    }

    if (result.status === 'FAILED') {
      return `Execution Error: ${result.error || 'Failed to execute Kingdom action.'}`;
    }

    switch (intent.type) {
      case 'QUERY_STATUS':
        return `Kingdom Engine Version v${result.data?.version || '40.1'} is ${result.data?.running ? 'RUNNING' : 'STOPPED'} in ${result.data?.mode || 'adaptive'} mode.`;
      case 'START_RUNTIME':
        return 'Kingdom runtime engine started successfully.';
      case 'STOP_RUNTIME':
        return 'Kingdom runtime engine stopped.';
      case 'GET_KNIGHTS':
        return `Retrieved ${result.data?.knights?.length || 0} active swarm knights.`;
      case 'CREATE_TASK':
        return `Task submitted to Kingdom swarm! Task ID: ${result.data?.id}`;
      case 'CANCEL_TASK':
        return `Task ${result.data?.id || 'specified'} cancelled successfully.`;
      default:
        return 'Kingdom operation completed successfully.';
    }
  }
}

export const resultProcessor = new ResultProcessor();
