# Sentinel Security Journal

## 2025-05-20 - CSPRNG Requirement for JIT Capability Grants
**Vulnerability:** Capability grant IDs in `src/agent/grants.ts` were constructed using `Math.random().toString(36)`, making security authorization grant tokens PRNG-predictable.
**Learning:** `Math.random()` lacks cryptographic entropy and generates non-uniform base-36 outputs. Cross-runtime modules bundled for client web builds cannot import `node:crypto` statically, so CSPRNG generation must use `globalThis.crypto.getRandomValues`.
**Prevention:** Use `generateSecureRandomHex()` from `src/security/cryptoUtils.ts` for all security tokens and grant identifiers across client and server environments.
