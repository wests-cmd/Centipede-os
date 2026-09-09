## 2025-05-18 - Cryptographically Secure PIN and Token Generation
**Vulnerability:** `Math.random()` was used in `src/security/deviceTrust.ts` for generating 6-digit device pairing PINs, session tokens, and device IDs.
**Learning:** `Math.random()` is PRNG (pseudo-random, non-cryptographic) in JS/TS runtimes, exposing mobile device pairing PINs and session tokens to PRNG state prediction attacks.
**Prevention:** Use `globalThis.crypto.getRandomValues()` for CSPRNG across browser and Node/Bun runtimes when generating security tokens, keys, or PINs.
