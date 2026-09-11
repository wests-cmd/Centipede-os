# CENTIPEDE OS SYSTEM DEPENDENCY MAP & END-TO-END JOURNEY AUDIT

## Executive Summary

This specification maps the 25 primary subsystems of Centipede OS and Kingdom, documenting ownership, inputs, outputs, security boundaries, failure behaviors, and real execution paths.

---

## 1. Twenty-Five Subsystem Dependency Map

| Subsystem ID | Subsystem Name | Primary Source Path | Inputs | Outputs | Security Boundary | Failure Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SYS-01** | **Boot & Main Entry** | `src/main.tsx` | Browser/DOM | DesktopShell Mount | Init verified tool registry | Fails closed on script load error |
| **SYS-02** | **Desktop Shell UI** | `src/components/DesktopShell.tsx` | User clicks, IPC | Window render, Intent triggers | Role-based view filtering | Renders offline status banner |
| **SYS-03** | **Segmentor Assistant** | `src/ai/pipeline.ts` | User text prompt | Structured Plan, Status | Text carries zero authority | Returns error explanation |
| **SYS-04** | **Intent Parser** | `src/ai/intentParser.ts` | Natural language text | Parsed `Intent` object | Strict schema validation | Returns `UNKNOWN` intent (0 guessing) |
| **SYS-05** | **Capability Resolver** | `src/ai/capabilityResolver.ts` | `Intent` object | Capability ID & Risk Class | Authoritative risk lookup | Rejects unknown capabilities |
| **SYS-06** | **AI Planner** | `src/ai/planner.ts` | `Intent` object | Step-by-step `Plan` | Subject to Plan Drift Engine | Plan execution halted |
| **SYS-07** | **Permission Gate** | `src/ai/permissionGate.ts` | `Plan` object | `ActionRequest` | ZeroTrust fail-closed (`DENIED`) | Returns `APPROVAL_REQUIRED` |
| **SYS-08** | **Action Executor** | `src/ai/actionExecutor.ts` | `ActionRequest` | `ActionResult` | Ignores caller `authorizationState` | Forces `ToolExecutor` check |
| **SYS-09** | **Verified Tool Registry** | `src/tools/registry.ts` | `ToolDefinition` | Registered tool manifest | Immutable registry locked post-init | Rejects un-registered tools |
| **SYS-10** | **Tool Executor Gate** | `src/tools/executor.ts` | `ToolInvocationRequest` | `ToolExecutionResult` | Validates `ExecutionAuthorizationContext` | Returns `BLOCKED` / `PENDING` |
| **SYS-11** | **Circuit Breaker & DLQ** | `src/tools/executor.ts` | Execution errors | Open status, DLQ entry | Trips OPEN after 3 failures | Routes to Dead-Letter Queue |
| **SYS-12** | **JIT Grant Engine** | `src/agent/grants.ts` | Grant request params | JIT `CapabilityGrant` | Context-bound single-use atomic grant | Returns `GRANT_EXPIRED` / `REVOKED` |
| **SYS-13** | **Plan Drift Engine** | `src/agent/planValidator.ts` | Plan steps | Drift detection status | Blocks material scope expansion | Blocks execution |
| **SYS-14** | **Approval Tamper Guard** | `src/security/approvalTamperGuard.ts` | Approval ID & params | Tamper verification | SHA-256 parameter hash locking | Returns `APPROVAL_PARAM_TAMPERING` |
| **SYS-15** | **Device Trust Manager** | `src/security/deviceTrust.ts` | Pairing PIN, Token | Session validation | CSPRNG token & PIN generation | Returns `REVOKED_DEVICE` |
| **SYS-16** | **Mobile Companion App** | `src/components/MobileCompanionApp.tsx` | QR scan, PIN entry | Authenticated session | Mobile client cannot bypass gate | Device access revoked |
| **SYS-17** | **Universal Search** | `src/search/aggregator.ts` | Query string | Search items | Search NEVER dispatches actions | Returns path traversal error |
| **SYS-18** | **Memory Store & Sync** | `src/learning/memoryStore.ts` | Fact entries | Memory graph | Trust hierarchy (`SYSTEM` > `USER`) | Memory carries zero authority |
| **SYS-19** | **User Knowledge Store** | `src/learning/userKnowledgeStore.ts` | Fact corrections | Provenance record | User fact edit/forget workflows | Preserves provenance audit |
| **SYS-20** | **Trusted Skill Engine** | `src/skills/trustedSkillEngine.ts` | Skill ZIP / Manifest | Validated skill | SHA-256 manifest checksum matching | Returns `UNTRUSTED` / `REVOKED` |
| **SYS-21** | **Workflow Engine** | `src/workflow/engine.ts` | Workflow definition | Execution run | Multi-dimensional budgets | Status `BLOCKED` / `FAILED` |
| **SYS-22** | **Persistence Store** | `src/workflow/persistence.ts` | State JSON | Recovered state | SHA-256 state signature check | Throws `PERSISTENCE_TAMPERING` |
| **SYS-23** | **Platform Detector** | `src/platform/detector.ts` | Hardware, OS | PlatformCapabilities | No host Docker socket mounting | Reports degraded status |
| **SYS-24** | **Kingdom API Adapter** | `src/api/kingdomAdapter.ts` | HTTP / WebSocket | Runtime status | Kingdom sole execution authority | Returns `KINGDOM_OFFLINE` |
| **SYS-25** | **Update & Rollback** | `src/components/KingdomUpdateCenter.tsx` | Version package | Update status | Health check before commit | Triggers automatic rollback |

---

## 2. Eleven-Stage Real End-to-End User Journey Trace

```text
[1. DOWNLOAD] ──► User obtains `CentipedeOS-v1.0.0-Installer.iso` (1.8 GB).
       │
       ▼
[2. INSTALL] ──► Guided bootstrap installer auto-detects hardware and recommends profile.
       │
       ▼
[3. FIRST BOOT] ──► Desktop Shell mounts, locks tool registry, connects Kingdom WebSocket.
       │
       ▼
[4. USER SETUP] ──► User creates profile and selects Segmentor assistant preferences.
       │
       ▼
[5. SECURITY SETUP] ──► ZeroTrust policies initialized; device trust pairing enabled.
       │
       ▼
[6. KINGDOM SETUP] ──► `KingdomAdapter` validates Kingdom API v40.1 contract version.
       │
       ▼
[7. SEGMENTOR] ──► User submits natural prompt: "Archive completed invoices in ./archive".
       │
       ▼
[8. TASK & PLAN] ──► `IntentParser` -> `CapabilityResolver` -> `Planner` generates 3-step plan.
       │
       ▼
[9. APPROVAL] ──► PermissionGate flags `filesystem.write` -> `ToolExecutor` issues JIT grant.
       │
       ▼
[10. EXECUTION] ──► `ToolExecutor` verifies grant context & calls `kingdomAdapter.authorize_capability()`.
       │
       ▼
[11. RESULT & AUDIT] ──► Side effect executed, recorded in audit log, formatted for user by Segmentor.
```
