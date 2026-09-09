# CENTIPEDE OS SECURITY TRUST BOUNDARY SPECIFICATION

## Executive Summary

Centipede OS enforces a strict multi-tier ZeroTrust boundary where authority transitions strictly from low trust to high security through independent verification gates.

---

## 1. System Trust Classification Layers

```text
┌─────────────────────────────────────────────────────────┐
│              UNTRUSTED LAYER (DATA ONLY)                │
│ AI Model Outputs • Memory Graph • External Search       │
│ Imported Skills • Mobile Requests • Persisted State     │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│              VERIFICATION / GATE BOUNDARY               │
│ PermissionGate • CapabilityResolver • PlanValidator    │
│ ApprovalTamperGuard • CapabilityGrantEngine             │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│               CANONICAL EXECUTION GATE                  │
│               ToolExecutor.execute()                    │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│            SOLE EXECUTION & SECURITY AUTHORITY          │
│               Kingdom Runtime Engine                    │
└─────────────────────────────────────────────────────────┘
```

| Component Layer | Trust Status | Authority & Capabilities |
| :--- | :--- | :--- |
| **Hardware & Host Kernel** | `FOUNDATIONAL TRUST` | Physical host OS, CPU, RAM, and hardware isolation bounds. Outside Centipede container scope. |
| **Kingdom Runtime (`KingdomAdapter`)** | `SOLE EXECUTION AUTHORITY` | Final authority for operating system, process, network, and swarm operations (`/security/authorize`). |
| **ToolExecutor Gate (`src/tools/`)** | `TRUSTED BOUNDARY` | Validates canonical `ExecutionAuthorizationContext`, JIT grants, approval parameter hashes, and circuit breakers. |
| **Capability Grant Engine (`src/agent/`)** | `TRUSTED` | Issues short-lived JIT capability grants bound to agent, session, workflow, run, step, and parameter digest. |
| **Approval Tamper Guard (`src/security/`)** | `TRUSTED` | Locks human approvals to exact SHA-256 parameter digests (`parameterHash`). |
| **Device Trust Manager (`src/security/`)** | `TRUSTED` | Generates CSPRNG PIN codes/session tokens; handles instant device access revocation. |
| **AI Model & Planner (`src/ai/`)** | `UNTRUSTED` | Proposes action plans. Text outputs carry zero authority (`carriesAuthority: false`). |
| **Memory & Knowledge Store (`src/learning/`)** | `UNTRUSTED` | Stores facts and preferences as `DATA`. Cannot self-authorize or override security policy. |
| **Skill Manifests & Engine (`src/skills/`)** | `UNTRUSTED / VERIFIED` | Extends capabilities. Imported skills default to `UNTRUSTED`. Artifact changes trigger SHA-256 mismatch block. |
| **Workflow Engine (`src/workflow/`)** | `UNTRUSTED / VERIFIED` | Generated workflows default to `DRAFT`. Step grants must match workflow/run/step context. |
| **Mobile Companion Client (`src/components/`)** | `PARTIALLY TRUSTED` | Requires device QR pairing and PIN confirmation. Mobile requests cannot bypass `ToolExecutor` gate. |
