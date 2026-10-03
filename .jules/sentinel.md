## 2025-05-20 - CSPRNG Requirement for Capability Grant IDs and Device Trust Tokens
**Vulnerability:** Capability grants and device trust tokens used `Math.random()`, creating predictability risks for privilege authorization tokens and device credentials.
**Learning:** In multi-runtime environments (Browser/Node/Bun), local `Math.random()` fallback functions or inline `Math.random()` string generators bypass CSPRNG guarantees.
**Prevention:** Centralize CSPRNG generation in `src/security/cryptoUtils.ts` (`generateSecureRandomHex`, `generateSecurePin`) and fail closed (`CSPRNG_UNAVAILABLE`) if `globalThis.crypto.getRandomValues` is missing.
