import { describe, expect, it as test } from 'vitest';
import {
  evaluateAutonomy,
  type PolicyContext,
} from '../../src/agent/autonomyPolicy';

const base: PolicyContext = {
  mode: 'FREE',
  category: 'app_control',
  authenticated: true,
  trustedDevice: true,
  withinWorkspace: true,
  recoverable: true,
  emergencyStop: false,
};

describe('Free Autonomy', () => {
  test('opens applications without extra prompts', () => {
    expect(evaluateAutonomy(base).kind).toBe('ALLOW');
  });

  test('allows normal development work', () => {
    expect(
      evaluateAutonomy({
        ...base,
        category: 'code_execution',
      }).kind
    ).toBe('ALLOW');
  });

  test('requires confirmation for spending', () => {
    expect(
      evaluateAutonomy({
        ...base,
        category: 'financial',
      }).kind
    ).toBe('CONFIRM');
  });

  test('respects emergency stop', () => {
    expect(
      evaluateAutonomy({
        ...base,
        emergencyStop: true,
      }).kind
    ).toBe('DENY');
  });

  test('does not silently use unknown devices', () => {
    expect(
      evaluateAutonomy({
        ...base,
        category: 'trusted_device',
        trustedDevice: false,
      }).kind
    ).toBe('CONFIRM');
  });

  test('guided mode requires confirmation', () => {
    expect(
      evaluateAutonomy({
        ...base,
        mode: 'GUIDED',
      }).kind
    ).toBe('CONFIRM');
  });

  test('does not authorize unauthenticated work', () => {
    expect(
      evaluateAutonomy({
        ...base,
        authenticated: false,
      }).kind
    ).toBe('DENY');
  });
});
