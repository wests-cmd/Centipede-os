# CENTIPEDE OS ENGINEERING DECISION RECORDS (EDRs)

## EDR-001: Canonical Execution Authorization Context & Fail-Closed Tool Executor

- **PROBLEM**: Upstream components (AI model outputs, planner, memory, skills, workflows, integrations) could pass string flags like `authorizationState: 'AUTHORIZED'` or `riskLevel: 'LOW'` to bypass permission checks.
- **WHY IT MATTERS**: Bypassing authorization allows untrusted LLM outputs or prompt injections to execute privileged operations (`filesystem.delete`, `process.execute`) on the host.
- **CURRENT SYSTEM**: `ToolExecutor.execute()` previously checked for grants but lacked mandatory context verification and Kingdom authorization checks before tool execution dispatch.
- **OPTIONS CONSIDERED**:
  - *Option A*: Validate permissions inside the AI Planner before steps are generated.
  - *Option B*: Enforce authorization strictly at the final execution boundary (`ToolExecutor`) using an immutable `ExecutionAuthorizationContext`.
  - *Option C*: Allow local tools to execute without authorization if `riskLevel` is claimed as `LOW`.
- **SELECTED**: **Option B**
- **WHY**: Final execution boundary enforcement ensures that no matter how compromised upstream components are, no privileged execution occurs without valid grants and Kingdom authorization.
- **SECURITY CONSEQUENCES**: Fails closed by default. Eliminates AI self-authorization attacks.
- **FAILURE CONSEQUENCES**: Un-granted requests return `status: 'BLOCKED'` or trigger human approval requests.
- **RECOVERY**: Users grant JIT capability grants or approve pending requests in Kingdom.
- **HOW TESTED**: Tested via Master Security Invariants 7, 12, 14, 15, and 20 in `tests/unit/adversarial.test.ts`.

---

## EDR-002: Cryptographic SHA-256 Digest Standard for State & Artifact Verification

- **PROBLEM**: Legacy integer polynomial hash functions (`(hash << 5) - hash + char`) were used for artifact checksums and parameter digests, creating collision risks.
- **WHY IT MATTERS**: Non-cryptographic hashes allow attackers to construct collision payloads that pass checksum validation.
- **CURRENT SYSTEM**: `calculateArtifactChecksum` and `computeHash` used simple integer loop algorithms.
- **OPTIONS CONSIDERED**:
  - *Option A*: Retain integer hash for speed.
  - *Option B*: Adopt standard SHA-256 (`node:crypto` `createHash('sha256')`).
  - *Option C*: Use external hashing npm dependency.
- **SELECTED**: **Option B**
- **WHY**: Native `node:crypto` standard library SHA-256 provides cryptographic collision resistance across Node, Bun, and Docker runtimes without adding external package dependencies.
- **SECURITY CONSEQUENCES**: Artifact tampering and parameter modifications are cryptographically detected.
- **FAILURE CONSEQUENCES**: Modified artifacts fail execution with `SKILL_CHECKSUM_MISMATCH` or `APPROVAL_PARAM_TAMPERING`.
- **RECOVERY**: Re-sign or re-approve modified artifacts.
- **HOW TESTED**: Tested against standard deterministic SHA-256 fixture ("hello" -> `2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824`) and adversarial tampering tests in `tests/unit/adversarial.test.ts`.

---

## EDR-003: Multi-Dimensional Context-Bound Just-In-Time (JIT) Capability Grants

- **PROBLEM**: Reusable or broadly-scoped grants could be stolen or replayed across different workflow steps, sessions, or agent identities.
- **WHY IT MATTERS**: Grant replay allows an attacker who captures a grant for step 1 to execute step 2 or a completely different workflow.
- **CURRENT SYSTEM**: Grants matched capability and resource scope but lacked multi-dimensional context checks.
- **OPTIONS CONSIDERED**:
  - *Option A*: Single-use grants tied only to capability ID.
  - *Option B*: Context-bound grants tied strictly to `agentId`, `userId`, `deviceId`, `sessionId`, `workflowId`, `runId`, `stepId`, `operation`, `resource`, and `parameterHash`.
- **SELECTED**: **Option B**
- **WHY**: Multi-dimensional binding guarantees that a grant issued for `(wfA, run1, step1)` cannot be used for `(wfA, run1, step2)` or `(wfB, run1, step1)`.
- **SECURITY CONSEQUENCES**: Prevents cross-context grant replay and cross-workflow escalation.
- **FAILURE CONSEQUENCES**: Mismatched context parameters return `WORKFLOW_MISMATCH`, `STEP_MISMATCH`, or `AGENT_MISMATCH`.
- **RECOVERY**: Issue exact-scoped JIT grant for the target execution context.
- **HOW TESTED**: Tested via Invariant 8, Invariant 10, Invariant 17, and Promise.all 10-way race condition test in `tests/unit/adversarial.test.ts`.
