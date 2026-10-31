## 2025-05-20 - CSPRNG Requirement for Capability Grant IDs and Device Trust Tokens
**Vulnerability:** Capability grants and device trust tokens used `Math.random()`, creating predictability risks for privilege authorization tokens and device credentials.
**Learning:** In multi-runtime environments (Browser/Node/Bun), local `Math.random()` fallback functions or inline `Math.random()` string generators bypass CSPRNG guarantees.
**Prevention:** Centralize CSPRNG generation in `src/security/cryptoUtils.ts` (`generateSecureRandomHex`, `generateSecurePin`) and fail closed (`CSPRNG_UNAVAILABLE`) if `globalThis.crypto.getRandomValues` is missing.

## 2025-05-21 - Device Trust Session Validation Unenforced State Bypass
**Vulnerability:** `DeviceTrustManager.validateSessionToken` previously searched for devices by `sessionToken` but allowed devices in `PENDING_PAIRING` state to be treated as authenticated if passed `undefined` or an unassigned token match.
**Learning:** In Map/Array lookups where default parameters or undefined variables can match `device.sessionToken === undefined`, pending unauthenticated devices could bypass session checks.
**Prevention:** Always validate session input presence/type first, and explicitly enforce `device.trustState === 'PAIRED_ACTIVE'` and `device.sessionToken === sessionToken`.

## 2025-05-22 - Unbounded HTTP Request Body Stream Buffering DoS
**Vulnerability:** In `CentipedeServer`, incoming POST/PUT request streams were consumed into memory chunks without size bounding, exposing the process to memory exhaustion (OOM) and DoS from oversized request payloads.
**Learning:** Even internal or local HTTP companion servers must enforce strict maximum body size limits and fail fast on both `Content-Length` headers and cumulative streaming chunk sizes.
**Prevention:** Enforce `MAX_REQUEST_BODY_BYTES` (1 MB) with immediate HTTP 413 `PAYLOAD_TOO_LARGE` response and socket abort (`req.destroy()`), alongside `X-Content-Type-Options: nosniff`.
