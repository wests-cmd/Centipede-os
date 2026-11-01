import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { getSafeSandboxPath } from '../../src/tools/executor';

describe('Tool Executor Sandbox & Security Hardening Test Suite', () => {
  it('1. Rejects path traversal attempts outside sandbox boundary', () => {
    expect(() => getSafeSandboxPath('../../etc/passwd')).toThrow('PATH_TRAVERSAL_DETECTED');
    expect(() => getSafeSandboxPath('/etc/shadow')).toThrow('PATH_TRAVERSAL_DETECTED');
    expect(() => getSafeSandboxPath('../../../var/log/syslog')).toThrow('PATH_TRAVERSAL_DETECTED');
  });

  it('2. Rejects empty or malformed path parameters', () => {
    expect(() => getSafeSandboxPath('')).toThrow('INVALID_PATH');
    expect(() => getSafeSandboxPath(null as any)).toThrow('INVALID_PATH');
  });

  it('3. Accepts valid relative paths inside sandbox boundary', () => {
    const valid = getSafeSandboxPath('documents/invoice.pdf');
    expect(valid).toContain('sandbox');
    expect(valid.split(path.sep)).toContain('documents');
    expect(valid.split(path.sep).at(-1)).toBe('invoice.pdf');
  });
});
