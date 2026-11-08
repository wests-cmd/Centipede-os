import { describe, expect, it as test } from 'vitest';
import {
  verifyReceipt,
  type ExecutionReceipt,
  type ExpectedExecution,
} from '../../src/tools/executionReceipt';

describe('Execution Receipt Freshness and Verification', () => {
  const now = 1000;
  const validExpected: ExpectedExecution = {
    actionId: 'act_123',
    deviceId: 'dev_dt1',
    sessionId: 'sess_abc',
    targetId: 'tgt_window_456',
    observationId: 'obs_789',
  };

  const validReceipt: ExecutionReceipt = {
    success: true,
    stateVerified: true,
    actionId: 'act_123',
    deviceId: 'dev_dt1',
    sessionId: 'sess_abc',
    targetId: 'tgt_window_456',
    observationId: 'obs_789',
    timestamp: 1000,
  };

  test('accepts valid fresh receipt with matching fields', () => {
    expect(() => verifyReceipt(validReceipt, validExpected, now)).not.toThrow();
  });

  test('rejects unverified execution receipt', () => {
    const unverified = { ...validReceipt, stateVerified: false };
    expect(() => verifyReceipt(unverified, validExpected, now)).toThrow('Execution was not verified');
  });

  test('rejects failed execution receipt', () => {
    const failed = { ...validReceipt, success: false };
    expect(() => verifyReceipt(failed, validExpected, now)).toThrow('Execution was not verified');
  });

  test('rejects field mismatch on actionId', () => {
    const mismatched = { ...validReceipt, actionId: 'act_other' };
    expect(() => verifyReceipt(mismatched, validExpected, now)).toThrow('Execution actionId mismatch');
  });

  test('rejects stale receipt older than 30 seconds', () => {
    const stale = { ...validReceipt, timestamp: 960 };
    expect(() => verifyReceipt(stale, validExpected, now)).toThrow('Stale execution receipt');
  });

  test('rejects future receipt more than 5 seconds ahead', () => {
    const future = { ...validReceipt, timestamp: 1010 };
    expect(() => verifyReceipt(future, validExpected, now)).toThrow('Stale execution receipt');
  });
});
