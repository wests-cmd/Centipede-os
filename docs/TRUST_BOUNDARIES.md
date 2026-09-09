# CENTIPEDE OS TRUST BOUNDARIES & SECURITY ARCHITECTURE MAP

## 1. Trust Classification of Subsystems

| Subsystem Component | Trust Classification | Rationale & Authority Limits |
| :--- | :--- | :--- |
| **AI Model Outputs (LLM)** | `UNTRUSTED` | Text generation is non-authoritative. Cannot self-authorize, issue grants, or invoke Kingdom directly. |
| **Planner & Plan Validator** | `UNTRUSTED / VERIFIED` | Proposes tool invocation sequences. Subject to plan drift detection and non-bypassable capability checks. |
| **Memory Store / Context Engine** | `UNTRUSTED` | Stores context and user preferences. Classified strictly as DATA; cannot grant authority or override rules. |
| **Skill Manifests / Engine** | `UNTRUSTED / VERIFIED` | Extends agent capabilities. Requires hash/signature verification; cannot bypass ZeroTrust approval gates. |
| **Workflow Engine & Workflows** | `UNTRUSTED / VERIFIED` | Orchestrates steps. Each privileged step requires individual, active capability grants and validation. |
| **Integration Adapters (3rd Party)** | `UNTRUSTED` | Receives external data. Output is tagged as `UNTRUSTED_EXTERNAL_DATA` and stripped of authority. |
| **Mobile Companion Client** | `PARTIALLY TRUSTED` | Requires device trust pairing (PIN/QR). Mobile approvals are parameter-hash locked to prevent tampering. |
| **Capability Grant Engine (`src/agent/grants.ts`)** | `TRUSTED` | Issues short-lived (JIT) scoped grants upon valid human/ZeroTrust approval. |
| **Tool Registry & Executor (`src/tools/`)** | `TRUSTED` | Enforces execution-boundary authorization checks and parameter anti-tampering guards. |
| **Kingdom Adapter (`src/api/kingdomAdapter.ts`)** | `TRUSTED AUTHORITATIVE` | The sole interface to Kingdom API v40.1. Validates tokens, signatures, and runtime state. |
| **Kingdom Runtime Environment** | `SOLE EXECUTION AUTHORITY` | Final authority for privileged operating system, process, network, and node operations. |

---

## 2. Real Execution & Authority Flow

```text
User Request / Intent
       │
       ▼
[ Centipede AI Pipeline ] ──► Generates Intent & Plan (UNTRUSTED)
       │
       ▼
[ Capability Resolver ] ──► Map tools & check required risk level
       │
       ▼
[ Permission Gate / JIT Grant Engine ] ──► Is action pre-approved or active JIT Grant valid?
       ├─ NO ──► Prompt User / Mobile ZeroTrust Approval (Parameter Hash Locked)
       └─ YES ─► Issue short-lived, exact-action JIT Grant
       │
       ▼
[ Tool Executor / Execution Boundary ] ──► Validate Grant ID + Scope + Parameter Hash + State
       │
       ▼
[ Kingdom Adapter ] ──► Execute via Kingdom API v40.1 REST / WebSocket
       │
       ▼
[ Kingdom Runtime ] ──► (SOLE EXECUTION AUTHORITY) Executes & Returns Verified Result
       │
       ▼
[ Result Processor & User Verification ]
```

---

## 3. Mandatory Security Invariants
1. **Invariant 1**: No model output can directly cause privileged execution.
2. **Invariant 2**: No memory content can create authority.
3. **Invariant 3**: No skill can grant itself authority.
4. **Invariant 4**: No workflow can grant itself authority.
5. **Invariant 5**: No external provider output can create authority.
6. **Invariant 6**: No mobile request can bypass authorization.
7. **Invariant 7**: Authorization is enforced at the execution boundary.
8. **Invariant 8**: Authorization is bound to the exact action and parameters.
9. **Invariant 9**: Expired/revoked authorization cannot execute.
10. **Invariant 10**: Authorization cannot be replayed outside its intended scope.
11. **Invariant 11**: Kingdom remains sole execution authority.
12. **Invariant 12**: Authorization failure fails closed.
13. **Invariant 13**: Verification failure cannot produce false success.
14. **Invariant 14**: A compromised collection of untrusted components cannot manufacture authority.
