# CENTIPEDE OS EXECUTION PATH INVENTORY

## Executive Summary

This document lists every execution path across the entire Centipede OS codebase where operating system, process, file, network, or Kingdom runtime side effects can be triggered.

### Primary Architectural Invariant
> **NO UNTRUSTED OR COMPROMISED UPSTREAM COMPONENT CAN CAUSE A PRIVILEGED SIDE EFFECT UNLESS THE CANONICAL EXECUTION BOUNDARY (`ToolExecutor.execute()`) INDEPENDENTLY VALIDATES THE COMPLETE AUTHORIZATION CONTEXT AND KINGDOM AUTHORIZES THE EXACT OPERATION.**

---

## Complete Execution Path Inventory

| Path ID | Entry Point | Execution Function | Authorization Gate | Kingdom Gate | Verification Classification | Risk Class | Security Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **EXEC-01** | `CentipedeAIPipeline.processMessage()` (`src/ai/pipeline.ts`) | `ActionExecutor.execute()` | `PermissionGate.evaluate()` + `CapabilityGrantEngine.verifyCapabilityGrant()` + `ToolExecutor` Gate | `kingdomAdapter.authorize_capability()` | `VERIFIED` / `SIMULATED` | Derived from Tool Definition | `VERIFIED / SECURED` |
| **EXEC-02** | `AutonomyEngine.executeRoutine()` (`src/ai/autonomyEngine.ts`) | `CentipedeAIPipeline.processMessage()` → `ToolExecutor.execute()` | Global Kill Switch + Autonomy Level Cap + `PermissionGate` + `ToolExecutor` Gate | `kingdomAdapter.authorize_capability()` | `VERIFIED` / `SIMULATED` | Restricted by Autonomy Level | `VERIFIED / SECURED` |
| **EXEC-03** | `VoiceProcessor.processAudioChunk()` (`src/ai/voiceInterface.ts`) | `executeConfirmedText()` → `ToolExecutor.execute()` | Confidence Threshold (<0.85 requires confirmation) + Interrupt Control + `ToolExecutor` Gate | `kingdomAdapter.authorize_capability()` | `VERIFIED` / `SIMULATED` | Derived from Tool Definition | `VERIFIED / SECURED` |
| **EXEC-04** | `WorkflowEngine.executeWorkflow()` (`src/workflow/engine.ts`) | `ToolExecutor.execute()` | Workflow `trustState` (`ACTIVE`/`APPROVED`) + Context-Bound JIT Grant (`workflowId`, `runId`, `stepId`) | `kingdomAdapter.authorize_capability()` | `VERIFIED` / `SIMULATED` / `EXECUTED_UNVERIFIED` | Defined by Step Schema | `VERIFIED / SECURED` |
| **EXEC-05** | `WorkflowEngine` Compensating Action (`src/workflow/engine.ts`) | `ToolExecutor.execute()` | Tool Risk Category (No `LOW` bypass) + JIT Compensation Grant + `ToolExecutor` Gate | `kingdomAdapter.authorize_capability()` | `VERIFIED` / `SIMULATED` | Authoritative Tool Category | `VERIFIED / SECURED` |
| **EXEC-06** | Direct `ToolExecutor.execute()` (`src/tools/executor.ts`) | `dispatchToolCall()` | `CapabilityGrantEngine.verifyCapabilityGrant()` + `ApprovalTamperGuard.verifyAndAuthorizeExecution()` | `kingdomAdapter.authorize_capability()` | `VERIFIED` / `SIMULATED` | Defined by Tool Definition | `VERIFIED / SECURED` |
| **EXEC-07** | Digital Workspace Integrations (`src/workspace/registry.ts`) | `WorkspaceRegistry.executeAction()` → `ToolExecutor.execute()` | Secret Isolation + Auth Check (`NEEDS_AUTH` Fail Closed) + `ToolExecutor` Gate | `kingdomAdapter.authorize_capability()` | `VERIFIED` | Tool Category | `VERIFIED / SECURED` |
| **EXEC-08** | Kingdom Update Center (`src/components/KingdomUpdateCenter.tsx`) | `KingdomAdapter` Update API Methods | ZeroTrust Human Approval Gating + Version Verification + Rollback Engine | Kingdom Endpoint Security Policy | `VERIFIED` | `HIGH` / `CRITICAL` | `VERIFIED / SECURED` |
| **EXEC-09** | Universal Search Aggregator (`src/search/aggregator.ts`) | Search Provider Queries | Strict Search-Action Separation (Search NEVER dispatches actions) | Read-Only Endpoint Access | `READ_ONLY` / Data Tagged | `LOW` | `VERIFIED / SECURED` |

---

## Failure & Bypass Prevention Summary

1. **No Direct Execution**: Neither `CentipedeAIPipeline`, `Planner`, `IntentParser`, `MemoryStore`, `SkillEngine`, nor `MobileCompanionApp` can invoke `dispatchToolCall()` directly. All requests pass through `ToolExecutor.execute()`.
2. **Context Binding**: Every JIT capability grant is cryptographically hashed and contextually bound to `agentId`, `sessionId`, `workflowId`, `runId`, `stepId`, `operation`, `resource`, and parameter digest.
3. **Kingdom Sole Authority**: Kingdom is the sole execution authority for operating system and swarm operations. `ToolExecutor` queries Kingdom authorization (`authorize_capability`) prior to dispatching any privileged action.
4. **Zero Untrusted Escalation**: No caller-supplied `authorizationState: 'AUTHORIZED'`, `trusted: true`, or `riskLevel: 'LOW'` string can grant authority.
