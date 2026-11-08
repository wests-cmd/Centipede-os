export interface ExecutionReceipt {
  success: boolean;
  actionId: string;
  timestamp: number; // Unix seconds
  deviceId: string;
  sessionId: string;
  targetId: string;
  observationId: string;
  stateVerified: boolean;
  error?: string;
}

export interface ExpectedExecution {
  actionId: string;
  deviceId: string;
  sessionId: string;
  targetId: string;
  observationId: string;
}

export function verifyReceipt(
  receipt: ExecutionReceipt,
  expected: ExpectedExecution,
  nowSeconds = Date.now() / 1000
): void {
  if (!receipt || !receipt.success || !receipt.stateVerified) {
    throw new Error('Execution was not verified');
  }

  for (const field of [
    'actionId',
    'deviceId',
    'sessionId',
    'targetId',
    'observationId',
  ] as const) {
    if (
      !expected[field] ||
      receipt[field] !== expected[field]
    ) {
      throw new Error(`Execution ${field} mismatch`);
    }
  }

  if (
    !Number.isFinite(receipt.timestamp) ||
    receipt.timestamp > nowSeconds + 5 ||
    nowSeconds - receipt.timestamp > 30
  ) {
    throw new Error('Stale execution receipt');
  }
}
