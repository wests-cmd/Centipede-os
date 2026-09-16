# CENTIPEDE OS — UPDATE AND RECOVERY REALITY

**Date:** March 2025
**Version:** v1.0.0

---

## Update Pipeline Architecture

1. **Discovery & Verification:** Centipede OS queries release manifests and compares version metadata against local `src/version.ts` and Kingdom API bounds (`EXPECTED_KINGDOM_CONTRACT_VERSION`).
2. **Checksum Validation:** Downloaded artifacts must match authoritative SHA-256 signatures in `SHA256SUMS`.
3. **Staging & Data Preservation:** User settings, active JIT grant logs, and persistent stores are staged and protected.
4. **Activation & Health Check:** The new release bundle is activated. If Kingdom compatibility or health checks fail, automatic rollback is triggered.

---

## Tested Failure & Recovery Scenario

- **Incompatible Kingdom API Version:** If an update targets a Kingdom API version outside supported semver bounds (`40.0.0` - `40.1.9`), `KingdomAdapter` sets connection status to `VERSION_INCOMPATIBLE` and aborts activation, safely rolling back to the previous stable build without corrupting user data or authorization state.
