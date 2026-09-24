# Centipede OS Master Gap Register

This document provides a human-readable and machine-readable state inventory of all Centipede OS subsystems, classification boundaries, risk profiles, and execution truth.

---

## Subsystem Inventory & Execution Truth Matrix

| ID | Category | Subsystem | Current State | Risk | Security Impact | Status | Remaining Work |
|---|---|---|---|---|---|---|---|
| GAP-01 | UI / Visual | Centipede World Visual & Home | VERIFIED | LOW | Low | `VERIFIED` | None. Canvas 2D procedural Earth + Centipede animation with quality & reduced-motion controls. |
| GAP-02 | AI / Agent | Segmentor AI Pipeline | VERIFIED | HIGH | Critical | `VERIFIED` | None. Governed pipeline (IntentParser -> Context -> Planner -> PermissionGate -> ActionExecutor -> ResultProcessor) enforces fail-closed execution. |
| GAP-03 | Security | ZeroTrust Permission Gate & JIT Grants | VERIFIED | CRITICAL | Critical | `VERIFIED` | None. Atomic single-use grants with parameter hash verification (`computeParameterHash`). |
| GAP-04 | API / Adapter | Kingdom Protocol Adapter & Handshake | VERIFIED | HIGH | High | `VERIFIED` | None. Dynamic Protocol v1.x handshake and capability negotiation (`READ -> NEGOTIATE -> ADAPT -> VERIFY -> OPERATE`). |
| GAP-05 | Tools | Verified Tool Executor | VERIFIED | HIGH | Critical | `VERIFIED` | None. Canonical `ExecutionAuthorizationContext` validation and compound idempotency keys. |
| GAP-06 | Workflows | Bounded Autonomous Workflow Engine | VERIFIED | MEDIUM | High | `VERIFIED` | None. Multi-dimensional execution budgets, SHA-256 state signatures, and `DRAFT` default state. |
| GAP-07 | Skills | Trusted Skill Ecosystem | VERIFIED | MEDIUM | High | `VERIFIED` | None. Skill manifests with SHA-256 artifact checksum verification and capability expansion diffing. |
| GAP-08 | Memory | Memory & User Knowledge Store | VERIFIED | LOW | Medium | `VERIFIED` | None. MemoryStore hierarchy (`SYSTEM_AUTHORITY` > `USER_CONFIRMED` > `MODEL_INFERENCE`) with forget workflows. |
| GAP-09 | Search | Universal Search Aggregator | VERIFIED | LOW | Medium | `VERIFIED` | None. Permission-bounded aggregator with path traversal defense and Search-Action separation. |
| GAP-10 | Platform | Profile Selector & Hardware Auto-Detector | VERIFIED | LOW | Low | `VERIFIED` | None. Real browser/Node hardware API detection (`navigator.hardwareConcurrency`, `navigator.deviceMemory`, `navigator.storage.estimate()`). |
| GAP-11 | Storage | Storage Pressure Engine | VERIFIED | LOW | Medium | `VERIFIED` | None. 5 pressure states (`NORMAL`, `INFORMATIONAL_WARNING`, `WARNING`, `CRITICAL`, `EMERGENCY`) blocking mutating actions <5% free space. |
| GAP-12 | Network | Mobile Companion QR Pairing & Revocation | VERIFIED | MEDIUM | High | `VERIFIED` | None. CSPRNG pairing PINs, session tokens, and instant device access revocation. |
| GAP-13 | Release | Two-Stage CI/CD & Release Builder | VERIFIED | MEDIUM | High | `VERIFIED` | None. Byte-exact archive SHA-256 checksums matching system `sha256sum` byte-for-byte. |
| GAP-14 | Setup | First-Run Setup Wizard & Desktop Launcher | VERIFIED | LOW | Low | `VERIFIED` | None. 6-step guided wizard and `scripts/start-centipede.ts` launcher. |
| GAP-15 | Docker | Swarm Multi-Node Stack | VERIFIED | LOW | Medium | `VERIFIED` | None. Production `docker-compose.yml` for Commander, Knight, and Scout. |
| GAP-16 | Recovery | Update Center & State Rollback | VERIFIED | MEDIUM | High | `VERIFIED` | None. Version verification post-update with automatic rollback on failure. |
| GAP-17 | OS Kernel | Bare-Metal Bootable ISO / Live USB | PLANNED | LOW | Low | `PLANNED` | Targeted for future Linux kernel packaging milestone as documented in `docs/INSTALLATION_GUIDE.md`. |

---

## Classification Guidelines

- **VERIFIED**: Code exists, executes in production path, and passes automated test verification.
- **PARTIAL**: Core implementation exists with known functional boundaries.
- **SIMULATED**: Tool/action returns explicit `SIMULATED` verification state without claiming real machine mutation.
- **PLANNED**: Identified roadmap item with explicit boundary separation from current buildable release artifacts.
