# CENTIPEDE OS FAILURE INJECTION & RECOVERY DRILL REPORT

## Executive Summary

This report documents the failure injection drills, automated containment mechanisms, recovery procedures, and plain-language user explanations for 11 critical system failure vectors across Centipede OS.

---

## 1. Eleven Failure Injection Drills

### Drill 1 — Kingdom Backend Offline / Unreachable
- **Injected Failure**: Kingdom API server on port 8000 stopped or network interface dropped.
- **System Detection**: `KingdomAdapter` transitions connection state to `DISCONNECTED` / `KINGDOM_OFFLINE`.
- **Observed Behavior**: `ToolExecutor.execute()` catches offline status and fails closed (`status: 'BLOCKED'`, error: `'KINGDOM_OFFLINE'`). Zero local un-granted execution.
- **User Explanation**: "Kingdom security engine is offline. Privileged actions are temporarily paused to protect your system."
- **Recovery Procedure**: Automatic reconnect retry with exponential backoff (2s → 16s). On connection restoration, task execution resumes.

### Drill 2 — Segmentor AI Pipeline Failure
- **Injected Failure**: Intent parser or planner encounters malformed model response.
- **System Detection**: `IntentParser.parse()` returns `UNKNOWN` intent with 0.0 confidence.
- **Observed Behavior**: `PermissionGate` rejects execution (`status: 'DENIED'`). No action dispatched.
- **User Explanation**: "Segmentor did not understand that instruction. Please rephrase your request."
- **Recovery Procedure**: User provides clarified instruction; pipeline re-evaluates.

### Drill 3 — Local AI Model Service Unavailable
- **Injected Failure**: Ollama / local model provider on port 11434 stopped.
- **System Detection**: `ServiceHealth` reports `status: 'STOPPED'`.
- **Observed Behavior**: `CentipedeAIPipeline` falls back to rule-based intent parsing for system commands; external queries report model unavailable.
- **User Explanation**: "Local AI model engine is not running. Centipede OS system commands remain fully available."
- **Recovery Procedure**: `KingdomUpdateCenter` or Settings panel restarts the local model service.

### Drill 4 — Network Disconnection / Drops
- **Injected Failure**: Local LAN or Wi-Fi network interface unmounted mid-task.
- **System Detection**: `PlatformCapabilities.networkInterfacesAvailable` transitions to `false`.
- **Observed Behavior**: Local sandboxed operations complete; outbound 3rd-party integrations report `NEEDS_AUTH` / `DISCONNECTED`.
- **User Explanation**: "Network connection lost. Local file tasks continue, but online integrations are paused."
- **Recovery Procedure**: Automatic reconnect upon network interface restoration.

### Drill 5 — Knight Worker Node Disconnection
- **Injected Failure**: Swarm knight process killed or disconnected from Commander.
- **System Detection**: Heartbeat timer misses 2 consecutive checks.
- **Observed Behavior**: Task scheduler flags node status as `DISCONNECTED`. Active tasks reassigned to healthy knights or queued.
- **User Explanation**: "Knight worker node 02 went offline. Assigned tasks re-routed to healthy workers."
- **Recovery Procedure**: Automatic re-pairing upon node reconnection.

### Drill 6 — Scout Discovery Node Unreachable
- **Injected Failure**: Scout discovery daemon unmounted.
- **System Detection**: Discovery telemetry stream pauses.
- **Observed Behavior**: Swarm uses cached hardware capabilities. No security or execution authority lost.
- **User Explanation**: "Scout discovery node offline. System capability cache active."
- **Recovery Procedure**: Scout daemon restarts automatically.

### Drill 7 — Persistent State Corruption / Tampering
- **Injected Failure**: `WorkflowPersistenceStore` JSON file modified by unauthorized process.
- **System Detection**: SHA-256 state signature check (`computeIntegritySignature`) fails during `recoverFromState()`.
- **Observed Behavior**: Recovery throws `PERSISTENCE_TAMPERING_DETECTED` and resets state to safe default.
- **User Explanation**: "Saved workflow state file was modified or corrupted. State reset to safe default."
- **Recovery Procedure**: System re-loads last verified release checkpoint.

### Drill 8 — Emergency Storage Pressure (< 5% Disk Space)
- **Injected Failure**: Simulated large file write reduces free space to < 5%.
- **System Detection**: `PlatformDetector` sets `storagePressure = 'EMERGENCY'`.
- **Observed Behavior**: `ToolExecutor.execute()` blocks mutating operations with error `STORAGE_EMERGENCY`. OS bootability protected.
- **User Explanation**: "Free disk space is critically low (<5%). Downloads and nonessential actions are paused to protect your computer."
- **Recovery Procedure**: User cleans disk space in Storage Manager; pressure state returns to `NORMAL`.

### Drill 9 — Docker Container Crash / Build Layer Failure
- **Injected Failure**: Container workload process killed (`SIGKILL`).
- **System Detection**: `ToolExecutor` catches dispatch error, increments `CircuitBreaker` failure count.
- **Observed Behavior**: Circuit breaker trips to `OPEN` after 3 failures; failed request recorded in Dead-Letter Queue (`DLQ`).
- **User Explanation**: "Container workload failed repeatedly. Action paused and routed to Dead-Letter Queue for review."
- **Recovery Procedure**: User initiates DLQ reconciliation in Settings (`reconcileUnknownState`).

### Drill 10 — Corrupted Skill Package Execution Attempt
- **Injected Failure**: Skill ZIP package modified post-registration.
- **System Detection**: `TrustedSkillEngine` computes artifact checksum.
- **Observed Behavior**: Artifact checksum does not match manifest checksum -> returns `SKILL_CHECKSUM_MISMATCH`.
- **User Explanation**: "Skill package integrity check failed. The skill file was modified and cannot execute."
- **Recovery Procedure**: User re-downloads verified skill manifest.

### Drill 11 — Stolen / Revoked Mobile Session Token
- **Injected Failure**: Mobile companion session token revoked while mobile app sends request.
- **System Detection**: `DeviceTrustManager.validateSessionToken()` returns `REVOKED_DEVICE`.
- **Observed Behavior**: `ApiRouter` returns HTTP 403 Forbidden with `REVOKED_DEVICE` error.
- **User Explanation**: "Mobile device access has been revoked by system administrator."
- **Recovery Procedure**: Device must be re-paired using a new CSPRNG 6-digit PIN.
