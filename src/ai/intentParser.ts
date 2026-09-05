import { Intent, IntentType, UserInput } from './types';

export class IntentParser {
  public parse(input: UserInput): Intent {
    const text = input.text.trim().toLowerCase();
    const id = `intent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = Date.now();

    // 1. Privileged Operations (Check first)
    if (text.includes('delete') || text.includes('remove file') || text.includes('purge')) {
      return {
        id,
        type: 'RESTRICTED_DELETE',
        confidence: 0.95,
        parameters: { target: input.text },
        originalInput: input.text,
        timestamp,
        explanation: 'User requested a high-risk filesystem deletion operation.',
      };
    }

    if (text.includes('shell') || text.includes('exec command') || text.includes('bash')) {
      return {
        id,
        type: 'RESTRICTED_EXECUTE',
        confidence: 0.95,
        parameters: { command: input.text },
        originalInput: input.text,
        timestamp,
        explanation: 'User requested a high-risk process execution operation.',
      };
    }

    // 2. Start / Stop Runtime
    if (text.includes('start engine') || text.includes('start kingdom') || text.includes('boot engine') || text.includes('start runtime')) {
      return {
        id,
        type: 'START_RUNTIME',
        confidence: 0.92,
        parameters: {},
        originalInput: input.text,
        timestamp,
        explanation: 'User requested starting the Kingdom runtime engine.',
      };
    }

    if (text.includes('stop engine') || text.includes('stop kingdom') || text.includes('shutdown runtime') || text.includes('stop runtime')) {
      return {
        id,
        type: 'STOP_RUNTIME',
        confidence: 0.92,
        parameters: {},
        originalInput: input.text,
        timestamp,
        explanation: 'User requested stopping the Kingdom runtime engine.',
      };
    }

    // 3. Specific Task Actions (Cancel / Create before general list)
    if (text.includes('cancel task') || text.includes('abort task')) {
      const match = input.text.match(/(?:task|id)\s+([a-f0-9-]+)/i);
      const taskId = match ? match[1] : '';
      return {
        id,
        type: 'CANCEL_TASK',
        confidence: 0.91,
        parameters: { taskId },
        originalInput: input.text,
        timestamp,
        explanation: `User requested cancelling task ${taskId || 'specified in input'}.`,
      };
    }

    if (text.includes('create task') || text.includes('submit task') || text.includes('run task') || text.includes('execute prompt')) {
      const prompt = input.text.replace(/^(?:create|submit|run|execute)\s+(?:a\s+)?(?:task|prompt)?\s*/i, '').trim() || input.text;
      return {
        id,
        type: 'CREATE_TASK',
        confidence: 0.88,
        parameters: { prompt },
        originalInput: input.text,
        timestamp,
        explanation: 'User requested submitting a task prompt to Kingdom swarm.',
      };
    }

    if (text.includes('tasks') || text.includes('task list') || text.includes('show activity')) {
      return {
        id,
        type: 'LIST_TASKS',
        confidence: 0.89,
        parameters: {},
        originalInput: input.text,
        timestamp,
        explanation: 'User requested listing active and historical tasks.',
      };
    }

    // 4. Status / Health Query
    if (text.includes('status') || text.includes('health') || text.includes('how is kingdom')) {
      return {
        id,
        type: 'QUERY_STATUS',
        confidence: 0.95,
        parameters: {},
        originalInput: input.text,
        timestamp,
        explanation: 'User requested Kingdom runtime engine status and system metrics.',
      };
    }

    // 5. Knights / Swarm Query
    if (text.includes('knight') || text.includes('swarm') || text.includes('nodes')) {
      return {
        id,
        type: 'GET_KNIGHTS',
        confidence: 0.9,
        parameters: {},
        originalInput: input.text,
        timestamp,
        explanation: 'User requested listing active swarm knights.',
      };
    }

    // 6. Security & Permissions
    if (text.includes('security') || text.includes('approvals') || text.includes('permissions') || text.includes('audit')) {
      return {
        id,
        type: 'GET_SECURITY_STATUS',
        confidence: 0.9,
        parameters: {},
        originalInput: input.text,
        timestamp,
        explanation: 'User requested security system health and pending approvals.',
      };
    }

    // Default Unknown Intent - Zero Guessing
    return {
      id,
      type: 'UNKNOWN',
      confidence: 0.0,
      parameters: {},
      originalInput: input.text,
      timestamp,
      explanation: 'I understand you submitted a request, but it does not match a known controlled intent. Please clarify your requested Kingdom action.',
    };
  }
}

export const intentParser = new IntentParser();
