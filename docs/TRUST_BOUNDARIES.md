# CENTIPEDE OS TRUST BOUNDARIES & SECURITY ARCHITECTURE MAP

## 1. Primary Security Objective & Core Invariant

> **NO UNTRUSTED OR COMPROMISED CENTIPEDE COMPONENT CAN CAUSE PRIVILEGED EXECUTION UNLESS AN INDEPENDENTLY VALID, EXACTLY SCOPED, NON-EXPIRED, NON-REVOKED AUTHORIZATION IS VERIFIED AT THE FINAL EXECUTION BOUNDARY.**

The following components are treated as potentially untrusted or compromised at all times:
- AI model outputs
- Intent parser & Planner
- Memory store & Context engine
- Skill manifests & Trusted Skill Engine
- Workflow definitions & Workflow Execution Engine
- Integration adapters & 3rd-party external API outputs
- Mobile companion client & UI inputs
- Persisted application state

None of these upstream components can manufacture execution authority.

---

## 2. Subsystem Trust Classifications

| Subsystem Component | Trust Classification | Rationale & Authority Limits |
| :--- | :--- | :--- |
| **AI Model Outputs (LLM)** | `UNTRUSTED` | Text generation is non-authoritative. Cannot self-authorize, issue grants, or invoke Kingdom directly. |
| **Planner & Plan Validator** | `UNTRUSTED` | Proposes tool invocation sequences. Subject to plan drift detection and non-bypassable capability checks. |
| **Memory Store / Context Engine** | `UNTRUSTED` | Stores context and user preferences. Classified strictly as DATA; cannot grant authority or override rules. |
| **Skill Manifests / Engine** | `UNTRUSTED / VERIFIED` | Extends agent capabilities. Requires artifact checksum and dependency tree verification; defaults imported skills to `UNTRUSTED`. |
| **Workflow Engine & Workflows** | `UNTRUSTED / VERIFIED` | Orchestrates steps. Rerouted strictly through the canonical execution boundary; generated workflows default to `DRAFT`. |
| **Integration Adapters (3rd Party)** | `UNTRUSTED` | Receives external data. Output is tagged as `UNTRUSTED_EXTERNAL_DATA` and stripped of authority. |
| **Mobile Companion Client** | `PARTIALLY TRUSTED` | Requires device trust pairing (PIN/QR). Mobile approvals are parameter-hash locked to prevent post-approval payload modification. |
| **Capability Grant Engine (`src/agent/grants.ts`)** | `TRUSTED` | Issues short-lived (JIT) grants bound to agent, session, workflow, run, step, capability, operation, resource, and parameter hash. |
| **Tool Registry & Executor (`src/tools/`)** | `TRUSTED BOUNDARY` | Enforces execution-boundary authorization checks, parameter anti-tampering guards, single-use consumption, and fail-closed defaults. |
| **Kingdom Adapter (`src/api/kingdomAdapter.ts`)** | `TRUSTED AUTHORITATIVE` | Interface to Kingdom API v40.1. Validates dynamic versioning, connection state, tokens, and runtime status. |
| **Kingdom Runtime Environment** | `SOLE EXECUTION AUTHORITY` | Final authority for privileged operating system, process, network, and node operations. |

---

## 3. Authoritative Execution Path

```text
Untrusted Input / Intent
       │
       ▼
[ Centipede AI Pipeline ] ──► Generates Intent & Plan (UNTRUSTED)
       │
       ▼
[ Permission Gate ] ──► Defaults to UNAUTHORIZED / AUTHORIZATION_REQUIRED
       │
       ▼
[ JIT Capability Grant Engine ] ──► Issues exact-scoped, short-lived JIT Grant on valid approval
       │
       ▼
[ Canonical Execution Request ] ──► Contains requestId, agentId, sessionId, workflowId, grantId, parameterHash, resource
       │
       ▼
[ Tool Executor Gate ] ──► Final Execution Boundary Check:
                           1. Identity & Session Binding
                           2. Active Grant / Approval Validation
                           3. Resource Scope Normalization (Path Traversal Protection)
                           4. Parameter Hash Matching
                           5. Atomic Single-Use Consumption
       │
       ▼
[ Kingdom Adapter ] ──► Routes request to Kingdom API v40.1
       │
       ▼
[ Kingdom Runtime ] ──► (SOLE EXECUTION AUTHORITY) Executes & Returns Effect Result
       │
       ▼
[ Verification & Result ] ──► Explicitly tagged as EXECUTED, VERIFIED, EXECUTED_UNVERIFIED, or SIMULATED
```

---

## 4. Capability Real vs Simulated Execution Matrix

| Capability / Tool ID | Execution Classification | Real Provider Effect vs Simulated |
| :--- | :--- | :--- |
| `runtime.get_status`, `runtime.start`, `runtime.stop` | `REAL` | Invokes live Kingdom runtime endpoint `/status`, `/start`, `/stop`. |
| `tasks.submit`, `tasks.list`, `tasks.cancel` | `REAL` | Invokes live Kingdom task scheduler `/tasks`. |
| `knights.list`, `models.health` | `REAL` | Invokes live Kingdom swarm knights & model endpoints. |
| `memory.read`, `memory.search` | `REAL` | Invokes live Kingdom memory store. |
| `security.status`, `security.approvals_list` | `REAL` | Invokes live Kingdom security subsystem. |
| `filesystem.read`, `filesystem.write`, `filesystem.delete_restricted` | `SIMULATED` | Executed in sandboxed local environment; output tagged explicitly as `mode: SIMULATED`. |

---

## 5. Master Security Invariants 1–20
1. **Invariant 1**: No model output can directly cause privileged execution.
2. **Invariant 2**: No memory content can create authority.
3. **Invariant 3**: No skill can grant itself authority.
4. **Invariant 4**: No workflow can grant itself authority.
5. **Invariant 5**: No external provider output can create authority.
6. **Invariant 6**: No mobile request can bypass authorization.
7. **Invariant 7**: Authorization is enforced at the execution boundary.
8. **Invariant 8**: Authorization is bound to the exact action, parameters, and context.
9. **Invariant 9**: Expired/revoked authorization cannot execute.
10. **Invariant 10**: Authorization cannot be replayed outside its intended scope (atomic single-use).
11. **Invariant 11**: Kingdom remains sole execution authority.
12. **Invariant 12**: Authorization failure fails closed.
13. **Invariant 13**: Verification failure cannot produce false success.
14. **Invariant 14**: Maximum-chain attack across all untrusted components cannot manufacture authority.
15. **Invariant 15**: No privileged ToolExecutor call can execute without exact authorization context.
16. **Invariant 16**: Approval ID alone cannot authorize execution.
17. **Invariant 17**: Grant ID alone cannot authorize execution for mismatched operations or targets.
18. **Invariant 18**: Workflow compensation cannot bypass authorization or lower risk levels.
19. **Invariant 19**: Idempotency cannot bypass authorization.
20. **Invariant 20**: Unauthorized execution produces zero side effects.
