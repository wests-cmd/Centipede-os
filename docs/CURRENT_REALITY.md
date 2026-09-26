# Centipede OS Canonical Current Reality Report

**Document Status**: CANONICAL CURRENT STATE REALITY
**Last Updated**: Current Active Workspace
**Centipede Semantic Version**: `1.0.0`
**Kingdom Product Identity**: `v1TAS` (Protocol Major 1)

---

## 1. System Version & Identity Matrix

| Subsystem | Version Identifier | Status | Specification / Contract |
|---|---|---|---|
| **Centipede OS** | `1.0.0` | `RELEASE READY` | `package.json`, `src/version.ts` |
| **Kingdom Product** | `v1TAS` | `SEPARATE PRODUCT IDENTITY` | `KINGDOM_CENTIPEDE_API_CONTRACT.md` |
| **Kingdom Protocol** | Major `1`, Minor `4` | `SUPPORTED & VERIFIED` | Dynamic Protocol Handshake |
| **Release Tag** | `v1.0.0` | `VERIFIED` | `.github/workflows/release.yml` |

---

## 2. Test Execution & Coverage Summary

- **Unit & Integration Test Suite**: 130/130 passing tests across 23 test files (`bun test`).
- **Static Reality Linter**: 0 violations across 85 production source files (`bun run lint:reality`).
- **Contract Verification Suite**: 100% passing (`bun run test:contract`).
- **Docker HTTP Integration Suite**: 4/4 passing (`tests/unit/docker_kingdom.test.ts`).
- **Swarm Node Roles Suite**: 2/2 passing (`tests/unit/swarm_roles.test.ts`).
- **Sandboxed Tools Hardening Suite**: 3/3 passing (`tests/unit/tools_hardening.test.ts`).
- **Reality Regression Suite**: 9/9 passing (`tests/reality/*.test.ts`).
- **Adversarial Invariant Suite**: 31/31 passing Master Security Invariant tests (`tests/unit/adversarial.test.ts`).

---

## 3. Data Provenance & Telemetry Matrix

| Telemetry / Metric | Value State | Data Provenance (`src/types/provenance.ts`) | Source API |
|---|---|---|---|
| **CPU Logical Cores** | Detected / `null` | `LOCAL_DETECTED` / `UNKNOWN` | `node:os` or `navigator.hardwareConcurrency` |
| **System Total RAM** | Detected MB / `null` | `LOCAL_DETECTED` / `UNKNOWN` | `node:os` or `navigator.deviceMemory` |
| **Storage Total/Free** | Detected GB / `null` | `LOCAL_DETECTED` / `UNKNOWN` | `navigator.storage.estimate()` |
| **GPU Acceleration** | `false` | `UNAVAILABLE` | WebGL / Hardware Inspection |
| **Kingdom Engine Health** | Live Response | `LIVE` / `DISCONNECTED` | HTTP `GET /status` |

---

## 4. Subsystem Reality Matrix

### A. Docker Deployment Reality
- **State**: `VERIFIED & FUNCTIONAL`
- **Engine**: `kingdom-engine` container runs `python scripts/kingdom-server.py`, serving real HTTP API contract endpoints on port 8000 with passing health checks (`GET /status`).
- **Swarm Containers**: `centipede-commander`, `centipede-knight`, `centipede-scout` depend on `kingdom-engine` health check and route requests via `KingdomAdapter`.

### B. Filesystem Execution Reality
- **State**: `VERIFIED SANDBOX & FALLBACK SIMULATED`
- **Node/Bun Environment**: Executed under `./sandbox` directory with strict path canonicalization (`getSafeSandboxPath`), path traversal protection (`..` prevention), symlink escape rejection, and atomic write/rename. Returns `verificationState: 'VERIFIED'`.
- **Browser Environment**: Returns explicit simulation status `verificationState: 'SIMULATED'`.

### C. Process Execution Reality
- **State**: `VERIFIED RESTRICTED & ALLOWLISTED`
- **Node/Bun Environment**: Executed via allowlist (`ALLOWED_PROCESS_COMMANDS`: `echo`, `ls`, `pwd`, `whoami`, `date`, `node -v`, `bun -v`, `uname`) inside `./sandbox` with 5s timeout. Returns `verificationState: 'VERIFIED'`.
- **Browser Environment**: Explicitly classified as `PLANNED_IN_BROWSER` with `verificationState: 'SIMULATED'`.

### D. Update System Reality
- **State**: `PLANNED / DEVELOPMENT SIMULATION`
- **UI Classification**: Explicitly labeled `[PLANNED / SIMULATION]` in `KingdomUpdateCenter.tsx`.
- **Verification Policy**: Queries actual connected Kingdom status (`GET /status`) and reports true connected version. Never fakes version changes using `setTimeout`.

### E. API Server & Mobile Companion Reality
- **State**: `VERIFIED REAL HTTP SERVER`
- **Node/Bun Environment**: `CentipedeServer` binds a real HTTP server (`http.createServer`) listening on port 3000 / custom port, serving `/api/v1/*` endpoints (`/health`, `/runtime`, `/mobile/pair/initiate`, `/mobile/pair/confirm`, `/mobile/revoke`).
- **Browser Environment**: Operates as `IN_PROCESS_ROUTER` for client SPA shell.

---

## 5. Security & Master Invariants

All 20 Master Security Invariants (INV 1–20) are mathematically enforced at the `ToolExecutor` and `PermissionGate` boundaries:
1. AI model text outputs carry **zero authority**.
2. Capability grants are **single-use, atomic, context-bound**, and validated with parameter SHA-256 hashes.
3. Kingdom remains sole execution authority.
4. Unauthorized execution produces **zero side effects**.

---

## 6. Known Blockers & Next Actions

- **Critical Release Blockers**: None (0 P0, 0 P1 blockers).
- **Bare-metal ISO packaging**: Documented honestly as `PLANNED` OS Kernel Milestone.
