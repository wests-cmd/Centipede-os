## 2025-05-20 - CSPRNG Requirement for Capability Grant IDs and Device Trust Tokens
**Vulnerability:** Capability grants and device trust tokens used `Math.random()`, creating predictability risks for privilege authorization tokens and device credentials.
**Learning:** In multi-runtime environments (Browser/Node/Bun), local `Math.random()` fallback functions or inline `Math.random()` string generators bypass CSPRNG guarantees.
**Prevention:** Centralize CSPRNG generation in `src/security/cryptoUtils.ts` (`generateSecureRandomHex`, `generateSecurePin`) and fail closed (`CSPRNG_UNAVAILABLE`) if `globalThis.crypto.getRandomValues` is missing.

## 2025-05-21 - Device Trust Session Validation Unenforced State Bypass
**Vulnerability:** `DeviceTrustManager.validateSessionToken` previously searched for devices by `sessionToken` but allowed devices in `PENDING_PAIRING` state to be treated as authenticated if passed `undefined` or an unassigned token match.
**Learning:** In Map/Array lookups where default parameters or undefined variables can match `device.sessionToken === undefined`, pending unauthenticated devices could bypass session checks.
**Prevention:** Always validate session input presence/type first, and explicitly enforce `device.trustState === 'PAIRED_ACTIVE'` and `device.sessionToken === sessionToken`.
