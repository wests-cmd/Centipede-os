# Kingdom Integration Guide for Centipede OS

This document defines the stable integration contract, communication protocols, security requirements, and error-handling behavior between **Centipede OS** and the **Kingdom** runtime (`wests-cmd/kingdom`).

---

## 1. How Centipede OS Connects to Kingdom

Centipede OS connects to Kingdom via two primary channels:
1. **HTTP/REST API**: Synchronous operations, runtime management, task submission, security authorizations, approvals, and queries.
2. **WebSocket Stream (`/ws`)**: Asynchronous real-time events, runtime state snapshots, and periodic heartbeats.

Default Base URL: `http://localhost:8000` (configurable via Centipede OS Settings).
Default WebSocket URL: `ws://localhost:8000/ws`.

---

## 2 & 3. Kingdom API Endpoints & Their Purpose

Centipede OS accesses Kingdom strictly through the `KingdomAdapter` interface using the following stable endpoints:

### Runtime & Status
| Endpoint | Method | Purpose | Parameters / Body | Response Format |
|---|---|---|---|---|
| `/status` | `GET` | Get overall runtime engine status | None | `{"running": bool, "mode": str, "version": str, "scheduler_running": bool, "tasks": {"queued": int, "running": int, "completed": int, "failed": int, "cancelled": int}}` |
| `/start` | `POST` | Start the Kingdom runtime engine | None | `{"status": "started", "timestamp": float}` |
| `/stop` | `POST` | Stop the Kingdom runtime engine | None | `{"status": "stopped", "timestamp": float}` |
| `/mode` | `GET` | Query current operating mode | None | `{"mode": "adaptive" \| "lightweight" \| ...}` |
| `/mode` | `PUT` | Change operating mode | `{"mode": str}` | `{"status": "mode_updated", "mode": str}` |

### Tasks
| Endpoint | Method | Purpose | Parameters / Body | Response Format |
|---|---|---|---|---|
| `/tasks` | `POST` | Submit a new task prompt | `{"prompt": str, "metadata": dict}` | `{"id": str, "prompt": str, "status": "queued", "created_at": float, ...}` |
| `/tasks` | `GET` | List all tasks | Query `status` (optional) | `[{"id": str, "prompt": str, "status": str, ...}]` |
| `/tasks/{task_id}` | `GET` | Retrieve specific task details | Path `task_id` | `{"id": str, "prompt": str, "status": str, "result": ...}` |
| `/tasks/{task_id}/cancel` | `POST` | Cancel a running/queued task | Path `task_id` | `{"id": str, "status": "cancelled"}` |

### Events & Telemetry
| Endpoint | Method | Purpose | Parameters / Body | Response Format |
|---|---|---|---|---|
| `/events` | `GET` | Retrieve historical system events | Query `limit` (1..200, default 50) | `[{"event": str, "data": dict, "timestamp": float}]` |
| `/ws` | `WS` | Real-time event & heartbeat stream | None | JSON frames: `{"type": "runtime.snapshot" \| "heartbeat" \| event_name, "data": dict}` |

### Knights & Nodes
| Endpoint | Method | Purpose | Parameters / Body | Response Format |
|---|---|---|---|---|
| `/knights` | `GET` | List active swarm knights and workload | None | `{"knights": [{"name": str, "status": str, "active": int, "completed": int}]}` |

### Models
| Endpoint | Method | Purpose | Parameters / Body | Response Format |
|---|---|---|---|---|
| `/models` | `GET` | Query health/status of AI model providers | None | `{"status": "ok", "providers": [...]}` |

### Memory & Maps
| Endpoint | Method | Purpose | Parameters / Body | Response Format |
|---|---|---|---|---|
| `/memory` | `GET` | Retrieve recorded memory entries | Query `limit` (1..500) | `[{"id": str, "content": str, "metadata": dict, "weight": float, "timestamp": float}]` |
| `/memory/search` | `GET` | Search vector/graph memory | Query `query` (str), `limit` (1..50) | `[{"id": str, "content": str, "score": float}]` |
| `/maps` | `GET` | List saved AI intelligence maps | None | `["map_name_1", "map_name_2"]` |

### Security & Approvals
| Endpoint | Method | Purpose | Parameters / Body | Response Format |
|---|---|---|---|---|
| `/security/status` | `GET` | Retrieve security system health & pending approval counts | None | `{"enabled": bool, "mode": "zero_trust", "registered_nodes": int, "pending_approvals_count": int, "audit_logs_count": int}` |
| `/security/permissions` | `GET` | Query registered node permissions & verified status | None | `{"nodes": [{"node_id": str, "name": str, "capabilities": [str], "verified": bool, "active": bool}]}` |
| `/security/approvals` | `GET` | List pending/historical security approvals | Query `status` (optional) | `[{"id": str, "capability": str, "operation": str, "reason": str, "status": "pending", "risk_level": str, ...}]` |
| `/security/approvals` | `POST` | Create a new approval request | `{"capability": str, "operation": str, "reason": str, "requesting_actor": str, "risk_level": str, "parameters": dict}` | `{"id": str, "status": "pending", ...}` |
| `/security/approvals/{id}/approve` | `POST` | Grant approval for restricted action | `{"approver": str, "reason": str}` | `{"id": str, "status": "approved", ...}` |
| `/security/approvals/{id}/deny` | `POST` | Deny approval for restricted action | `{"approver": str, "reason": str}` | `{"id": str, "status": "denied", ...}` |
| `/security/audit` | `GET` | Retrieve ZeroTrust security audit trail | Query `limit`, `actor`, `decision`, `capability` | `[{"timestamp": float, "actor": str, "operation": str, "capability": str, "decision": "ALLOWED" \| "DENIED", "reason": str}]` |

---

## 4. Authentication & Security Requirements

Centipede OS adheres strictly to Kingdom's ZeroTrust Security model (`backend/security/zero_trust.py`).

1. **Capability Authorization**: Every operation requires checking actor permissions against capability definitions.
2. **Non-Bypass Rule**: Centipede OS does NOT bypass approval checks. When an action yields a `REQUIRES_APPROVAL` decision or targets a privileged capability, Centipede OS creates an approval request or presents the pending request to the human user in the **Permissions & Approval View**.
3. **Actor Identification**: Centipede OS identifies requests using actor attributes (`actor_id: "centipede_ui"`, `requesting_actor: "centipede_ai"`).
4. **Audit Logging**: Every administrative action (approval, denial, mode change, task execution) is logged into Kingdom's immutable audit log (`/security/audit`).

---

## 5. How Errors Are Handled

`KingdomAdapter` wraps all HTTP and WebSocket communications in standard error handlers:

- **HTTP 400 (Bad Request)**: Invalid parameters or task format. UI displays validation error.
- **HTTP 404 (Not Found)**: Task ID, approval ID, or map missing. UI updates active state gracefully.
- **HTTP 409 (Conflict)**: Cannot cancel a completed/failed task or modify state.
- **HTTP 422 (Unprocessable Entity)**: Invalid enum values (e.g. invalid mode).
- **HTTP 503 (Service Unavailable)**: Model provider offline or model generation timeout.
- **Network / Fetch Failure**: Returns structured `OfflineError` or `ConnectionError` objects rather than throwing unhandled exceptions.

---

## 6. How Centipede Detects Kingdom Being Offline

1. **Heartbeat Polling**: `KingdomAdapter` sends periodic `GET /status` requests (default every 3000ms).
2. **Consecutive Failures**: If 2 consecutive status requests fail or timeout, `KingdomAdapter` marks connection state as `offline` and emits `connection:offline` event.
3. **WebSocket Disconnection**: Dropped WebSocket connection triggers immediate offline state detection.
4. **Visual Indicator**: Desktop Shell top bar displays prominent **OFFLINE** warning banner and red badge.

---

## 7. How Centipede Reconnects

1. **Exponential Backoff**: When offline, `KingdomAdapter` attempts reconnection at intervals of 2s, 4s, 8s, up to 16s max.
2. **Auto-Restoration**: Upon a successful `GET /status` response:
   - Connection state transitions to `online`.
   - Re-establishes WebSocket subscriber to `ws://host/ws`.
   - Triggers UI state refresh (tasks, knights, approvals, audit logs).
3. **Manual Reconnect**: The user can click **"Reconnect Now"** in the Kingdom Status Panel at any time to force an immediate reconnection attempt.

---

## 8. Kingdom Version Compatibility

- **Target Version**: Kingdom v40.1.
- **Version Verification**: Upon initial connection, Centipede OS validates `version` field from `GET /status`.
- **Compatibility Contract**: Centipede OS requires `version >= 40.0`. If major version differs, a compatibility warning is logged in System Status.

---

## 9. Which Capabilities Require Approval

In Kingdom's ZeroTrust model, capabilities are classified by risk level (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`):

| Risk Level | Capabilities | Execution Behavior |
|---|---|---|
| **Privileged / Critical** | `system.admin`, `filesystem.delete`, `process.execute`, `node.register`, `docker.execute`, `network.access` | **Requires Human Approval**. Creates approval request in `/security/approvals`. Cannot execute without explicit human `approve()` call. |
| **High** | `filesystem.write`, `ai_map.write` | Requires approval if requesting actor lacks direct verified capability. |
| **Default / Low** | `node.execute`, `memory.read`, `memory.write`, `model.inference`, `ai_map.read`, `filesystem.read` | Allowed automatically for verified knight nodes. |

---

## 10. Which Interfaces Should Be Considered Stable

The following contracts are guaranteed stable for Centipede OS integration:

1. **All 18 Adapter Functions**:
   `get_status()`, `start_runtime()`, `stop_runtime()`, `get_mode()`, `submit_task()`, `get_task()`, `cancel_task()`, `get_events()`, `get_knights()`, `get_models()`, `get_memory()`, `search_memory()`, `get_maps()`, `get_security_status()`, `get_permissions()`, `create_approval()`, `approve()`, `deny()`, `get_audit()`.
2. **WebSocket `/ws` Payload Schema**:
   JSON payloads containing `type` and `data` fields.
3. **Task State Lifecycle**:
   `queued` → `running` → `completed` | `failed` | `cancelled`.
4. **Approval Request Lifecycle**:
   `pending` → `approved` | `denied`.
