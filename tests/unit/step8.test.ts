import { describe, it, expect, beforeEach } from 'vitest';
import { deviceTrustManager } from '../../src/security/deviceTrust';
import { approvalTamperGuard } from '../../src/security/approvalTamperGuard';
import { knowledgeManager } from '../../src/ingest/knowledgeManager';
import { ActionRequest } from '../../src/ai/types';

describe('Step 8 — Mobile Companion, Anti-Tampering & Knowledge Security Suite', () => {
  beforeEach(() => {
    // Reset or setup before tests
  });

  it('Test 1 — Mobile Companion QR Pairing PIN Code Expiration and Re-use Prevention', () => {
    const pairing = deviceTrustManager.initiatePairing('Pixel Companion', 'MOBILE_APP');
    expect(pairing.pairingCode.length).toBe(6);

    // Invalid code format check fails closed
    const invalidFormat = deviceTrustManager.confirmPairing('abc');
    expect(invalidFormat.success).toBe(false);
    expect(invalidFormat.error).toContain('Invalid pairing code format');

    // Confirm once
    const firstConfirm = deviceTrustManager.confirmPairing(pairing.pairingCode);
    expect(firstConfirm.success).toBe(true);

    // Attempt reuse of single-use pairing PIN code fails
    const secondConfirm = deviceTrustManager.confirmPairing(pairing.pairingCode);
    expect(secondConfirm.success).toBe(false);
    expect(secondConfirm.error).toContain('Invalid or expired');
  });

  it('Test 1b — Mobile Companion Isolation and Single-Use Consumption', () => {
    const pairingUserA = deviceTrustManager.initiatePairing('User A Device', 'MOBILE_APP');
    const pairingUserB = deviceTrustManager.initiatePairing('User B Device', 'MOBILE_APP');

    // Attacker guessing wrong codes does NOT affect User A or User B's pending codes
    for (let i = 0; i < 5; i++) {
      const wrongConfirm = deviceTrustManager.confirmPairing('000000');
      expect(wrongConfirm.success).toBe(false);
    }

    // User A and User B can still successfully confirm their pairing codes
    const confirmA = deviceTrustManager.confirmPairing(pairingUserA.pairingCode);
    expect(confirmA.success).toBe(true);

    const confirmB = deviceTrustManager.confirmPairing(pairingUserB.pairingCode);
    expect(confirmB.success).toBe(true);
  });

  it('Test 2 — Approval Anti-Tampering Guard Detects Parameter Modification After Human Approval', () => {
    const originalAction: ActionRequest = {
      id: 'act_safe_del',
      capability: 'filesystem.delete',
      operation: 'delete_file',
      parameters: { path: '/tmp/safe_log.txt' },
      planId: 'p1',
      intentId: 'i1',
      riskLevel: 'HIGH',
      authorizationState: 'PENDING',
    };

    // Register approval
    const payload = approvalTamperGuard.registerApprovalRequest('appr_123', originalAction);
    expect(payload.parameterHash).toBeDefined();

    // Verify unmodified execution succeeds
    const validVerify = approvalTamperGuard.verifyAndAuthorizeExecution('appr_123', originalAction);
    expect(validVerify.valid).toBe(true);

    // Tamper attack: Attacker changes parameter after user approved `/tmp/safe_log.txt` to `/etc/shadow`
    const tamperedAction: ActionRequest = {
      ...originalAction,
      parameters: { path: '/etc/shadow' }, // Modified parameter!
    };

    const tamperedVerify = approvalTamperGuard.verifyAndAuthorizeExecution('appr_123', tamperedAction);
    expect(tamperedVerify.valid).toBe(false);
    expect(tamperedVerify.error).toContain('APPROVAL_PARAM_TAMPERING');
  });

  it('Test 3 — Knowledge Manager Enforces Provenance and Trust Classification Hierarchy', () => {
    const item = knowledgeManager.addKnowledge(
      'Invoice Document',
      'Invoice #9901 Total $500',
      'FILE_UPLOAD',
      'mobile_user',
      true
    );

    expect(item.trustLevel).toBe('USER_CONFIRMED');
    expect(item.provenance.uploaderId).toBe('mobile_user');

    const retrieved = knowledgeManager.getKnowledge(item.knowledgeId);
    expect(retrieved?.title).toBe('Invoice Document');
  });
});
