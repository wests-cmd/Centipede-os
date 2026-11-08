export type AutonomyMode =
  | 'FREE'
  | 'GUIDED'
  | 'EXPERIMENTAL';

export type ActionCategory =
  | 'browse'
  | 'app_control'
  | 'workspace_write'
  | 'user_tool_install'
  | 'code_execution'
  | 'self_repair'
  | 'trusted_device'
  | 'system_change'
  | 'delete_important_data'
  | 'financial'
  | 'credential_access';

export interface PolicyContext {
  mode: AutonomyMode;
  category: ActionCategory;
  authenticated: boolean;
  trustedDevice: boolean;
  withinWorkspace: boolean;
  recoverable: boolean;
  emergencyStop: boolean;
}

export type PolicyDecision =
  | { kind: 'ALLOW'; reason: string }
  | { kind: 'CONFIRM'; reason: string }
  | { kind: 'DENY'; reason: string };

const routineActions = new Set<ActionCategory>([
  'browse',
  'app_control',
  'workspace_write',
  'user_tool_install',
  'code_execution',
  'self_repair',
  'trusted_device',
]);

const sensitiveActions = new Set<ActionCategory>([
  'financial',
  'credential_access',
  'system_change',
  'delete_important_data',
]);

export function evaluateAutonomy(
  ctx: PolicyContext
): PolicyDecision {
  if (ctx.emergencyStop) {
    return {
      kind: 'DENY',
      reason: 'Emergency stop is active',
    };
  }

  if (!ctx.authenticated) {
    return {
      kind: 'DENY',
      reason: 'Authenticated session required',
    };
  }

  if (
    ctx.category === 'trusted_device' &&
    !ctx.trustedDevice
  ) {
    return {
      kind: 'CONFIRM',
      reason: 'Pair this device first',
    };
  }

  if (
    ['workspace_write', 'code_execution',
      'user_tool_install', 'self_repair']
      .includes(ctx.category) &&
    !ctx.withinWorkspace
  ) {
    return {
      kind: 'CONFIRM',
      reason: 'Action exceeds the current workspace',
    };
  }

  if (sensitiveActions.has(ctx.category)) {
    if (
      ctx.mode === 'EXPERIMENTAL' &&
      ctx.category === 'system_change' &&
      ctx.recoverable &&
      ctx.trustedDevice
    ) {
      return {
        kind: 'ALLOW',
        reason: 'Recoverable experimental operation',
      };
    }

    return {
      kind: 'CONFIRM',
      reason: 'Sensitive operation',
    };
  }

  if (ctx.mode === 'GUIDED') {
    return {
      kind: 'CONFIRM',
      reason: 'Guided mode requires confirmation',
    };
  }

  if (routineActions.has(ctx.category)) {
    return {
      kind: 'ALLOW',
      reason: 'Authorized by Free Autonomy policy',
    };
  }

  return {
    kind: 'DENY',
    reason: 'Unrecognized action category',
  };
}

export const DEFAULT_AUTONOMY_MODE: AutonomyMode =
  'FREE';
