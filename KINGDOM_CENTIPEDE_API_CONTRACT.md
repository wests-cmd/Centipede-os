# Formal Kingdom ↔ Centipede OS API Contract Specification

**Contract Version**: `1.0.0`
**Target Kingdom Engine Version**: `v40.1`
**Minimum Supported Kingdom Version**: `v40.0.0`
**Maximum Tested Kingdom Version**: `v40.1.9`

---

## 1. Architectural Boundary & Single Adapter Rule

To preserve full independence and prevent internal coupling, **Centipede OS must interact with Kingdom exclusively through `KingdomAdapter` (`src/api/kingdomAdapter.ts`)**.

```
┌─────────────────────────────────────────────────────────┐
│                 Centipede OS Frontend                   │
│   (Desktop Shell, App Launcher, Centipede AI, Views)    │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│           KingdomAdapter (Single Integration Point)     │
│             src/api/kingdomAdapter.ts                   │
└────────────────────────────┬────────────────────────────┘
                             │
            HTTP / REST      │      WebSocket (/ws)
            Synchronous      │      Asynchronous Streams
                             ▼
┌─────────────────────────────────────────────────────────┐
│                   Kingdom API Server                    │
│              (FastAPI backend.main:app)                 │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│            Kingdom Internal Engine / Swarm              │
│       (Runtime Engine, Knights, ZeroTrust, DB)          │
└─────────────────────────────────────────────────────────┘
```

**Boundary Directives**:
1. No Centipede OS code may import Python files from Kingdom.
2. No UI component or service in Centipede OS may execute raw `fetch()` calls directly to Kingdom endpoints. All requests must route through `KingdomAdapter`.
3. Secret credentials, bearer tokens, or internal API keys must never be exposed or embedded in the frontend UI.

---

## 2. API Contract Endpoints & Specifications

### 2.1 Runtime Management

#### `GET /status`
- **Purpose**: Query runtime health, scheduler state, version, and active task counters.
- **Request**: `GET /status`
- **Response Format**:
  ```json
  {
    "running": true,
    "mode": "adaptive",
    "version": "40.1",
    "scheduler_running": true,
    "tasks": {
      "queued": 0,
      "running": 1,
      "completed": 10,
      "failed": 0,
      "cancelled": 1
    }
  }
  ```

#### `POST /start`
- **Purpose**: Start the Kingdom runtime engine and task scheduler.
- **Response Format**: `{"status": "started", "running": true, "version": "40.1", ...}`

#### `POST /stop`
- **Purpose**: Gracefully stop the Kingdom runtime engine and task scheduler.
- **Response Format**: `{"status": "stopped", "running": false, ...}`

#### `GET /mode` & `PUT /mode`
- **Purpose**: Retrieve or set active operating mode (`adaptive`, `lightweight`).
- **Request Payload (`PUT`)**: `{"mode": "lightweight"}`
- **Response Format**: `{"status": "mode_updated", "mode": "lightweight"}` or HTTP 422 if mode is invalid.

---

### 2.2 Task Lifecycle & Operations

#### Task States
Task objects follow a strict state machine lifecycle:
`queued` → `running` → `completed` | `failed` | `cancelled`

```
  ┌─────────┐      ┌─────────┐      ┌───────────┐
  │ queued  ├─────►│ running ├─────►│ completed │
  └────┬────┘      └────┬────┘      └───────────┘
       │                │
       ▼                ▼
  ┌───────────┐    ┌───────────┐
  │ cancelled │    │  failed   │
  └───────────┘    └───────────┘
```

#### `POST /tasks`
- **Purpose**: Submit a new prompt task to the Kingdom swarm.
- **Request Payload**: `{"prompt": "task description", "metadata": { "client": "centipede_os" }}`
- **Response Format (HTTP 201 Created)**:
  ```json
  {
    "id": "uuid-v4-str",
    "prompt": "task description",
    "status": "queued",
    "created_at": 1709485200.0,
    "metadata": { "client": "centipede_os" }
  }
  ```

#### `GET /tasks` & `GET /tasks/{task_id}`
- **Purpose**: Retrieve list of tasks (filtered by `status` query param) or single task details.
- **Response Format**: Task object or list of task objects. HTTP 404 if `task_id` does not exist.

#### `POST /tasks/{task_id}/cancel`
- **Purpose**: Request cancellation of a queued or running task.
- **Response Format**: Updated task object with `status: "cancelled"`. HTTP 409 if task is already completed/failed.

---

### 2.3 Events & Real-Time Stream

#### `GET /events`
- **Purpose**: Query historical event log. Query param: `limit` (1..200, default 50).
- **Response Format**: List of event objects `[{"event": "task.created", "data": {...}, "timestamp": float}]`.

#### `WS /ws` (WebSocket Stream)
- **Purpose**: Stream real-time runtime snapshots, heartbeats, task state transitions, knight updates, and security events.
- **Connection Framing**:
  - Initial Frame: `{"type": "runtime.snapshot", "data": <RuntimeStatus>}`
  - Heartbeat Frame (every 20s): `{"type": "heartbeat", "data": <RuntimeStatus>}`
  - System Events: `{"type": "task.completed" | "security.approval" | ..., "data": {...}}`

---

### 2.4 Knights & Models

#### `GET /knights`
- **Purpose**: List active swarm knight agents and active/completed task counts.
- **Response Format**: `{"knights": [{"name": "planner", "status": "ready", "active": 0, "completed": 5}]}`

#### `GET /models`, `POST /models/generate`, `POST /models/stream`
- **Purpose**: Inspect model provider health, execute model generation, or open SSE stream.

---

### 2.5 Memory & AI Intelligence Maps

#### `GET /memory` & `GET /memory/search`
- **Purpose**: Retrieve recorded memory entries or perform vector search. Query params: `query` (str), `limit` (int).

#### `GET /maps`, `GET /maps/{name}`, `POST /maps/{name}`
- **Purpose**: Manage AI swarm intelligence graphs.

---

### 2.6 ZeroTrust Security, Approvals & Audit

#### Security Status (`GET /security/status`)
- **Response Format**: `{"enabled": true, "mode": "zero_trust", "registered_nodes": 7, "pending_approvals_count": 0, "audit_logs_count": 10}`

#### Node Permissions (`GET /security/permissions`)
- **Response Format**: List of node capability bindings (`{"nodes": [{"node_id": "coder", "capabilities": [...], "verified": true}]}`).

#### Approval Workflow (`GET /security/approvals`, `POST /security/approvals`, `POST /security/approvals/{id}/approve`, `POST /security/approvals/{id}/deny`)
- **Purpose**: Create, list, approve, or deny human approval requests for restricted/privileged capabilities (`filesystem.delete`, `process.execute`, `system.admin`, etc.).
- **Lifecycle**: `pending` → `approved` | `denied`.

#### Security Audit Log (`GET /security/audit`)
- **Purpose**: Inspect immutable ZeroTrust audit trail. Query params: `limit`, `actor`, `decision` (`ALLOWED` | `DENIED`), `capability`.

---

## 3. Categorized Error Model

All errors emitted by `KingdomAdapter` are classified into the following standardized error codes:

| Error Code | HTTP / Condition | Cause / User Message |
|---|---|---|
| `INVALID_REQUEST` | HTTP 400 / 422 | Request parameters or prompt payload failed validation. |
| `AUTHENTICATION_FAILED` | HTTP 401 | Missing or invalid authentication token. |
| `AUTHORIZATION_DENIED` | HTTP 403 | Capability authorization denied by ZeroTrust policy. |
| `NOT_FOUND` | HTTP 404 | Target task, approval request, or map does not exist. |
| `TIMEOUT` | Fetch Timeout | Request exceeded maximum network timeout (10s). |
| `KINGDOM_OFFLINE` | Connection Error | Kingdom backend server is unreachable or offline. |
| `ENDPOINT_UNAVAILABLE` | HTTP 503 | Model service or requested backend endpoint is unavailable. |
| `VERSION_INCOMPATIBLE` | Version Check | Kingdom server major version is outside supported range. |
| `TASK_FAILED` | Task State | Execution of submitted task failed in runtime engine. |
| `TASK_CANCELLED` | Task State | Task was cancelled prior to or during execution. |
| `SERVER_ERROR` | HTTP 500 | Internal execution exception inside Kingdom engine. |
| `UNKNOWN_ERROR` | Other | Unexpected network or parsing failure. |

All user-visible error messages undergo **Error Masking** to strip Python tracebacks, bearer tokens, and internal database paths.

---

## 4. Version Compatibility Mechanism

```
                     ┌──────────────────────────────────────────────┐
                     │          Kingdom Version Verification        │
                     └──────────────────────┬───────────────────────┘
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               │                            │                            │
               ▼                            ▼                            ▼
      Major < 40                   40.0.0 <= v <= 40.1.9             Major > 40
┌───────────────────────────┐  ┌───────────────────────────┐  ┌───────────────────────────┐
│       UNSUPPORTED         │  │        COMPATIBLE         │  │        UNSUPPORTED        │
│ (INCOMPATIBLE_TOO_OLD)    │  │                           │  │  (INCOMPATIBLE_TOO_NEW)   │
└───────────────────────────┘  └───────────────────────────┘  └───────────────────────────┘
```

- **Minimum Supported**: `v40.0.0`
- **Maximum Tested**: `v40.1.9`
- **Statuses**:
  - `COMPATIBLE`: Server version is within `v40.0.0`–`v40.1.9`.
  - `COMPATIBLE_WITH_WARNING`: Minor/patch version exceeds tested range but major version matches `40`.
  - `UNSUPPORTED`: Major version differs (e.g. `v39.x` or `v41.x`). Triggers `VERSION_INCOMPATIBLE` connection state.
  - `UNKNOWN`: Version header not yet received.

---

## 5. Security Boundary & Non-Bypass Directives

1. **Non-Bypass Enforcement**: Centipede OS must **never** attempt to bypass Kingdom ZeroTrust security checks or alter security policies directly.
2. **Controlled AI Pipeline**:
   `User` → `Centipede AI` → `Intent` → `Plan` → `Permission Check` → `Kingdom Security` → `Verified Action` → `Result` → `Centipede`
3. **Privileged Capabilities**: If an action requires privileged capabilities (`filesystem.delete`, `process.execute`, `docker.execute`, `system.admin`, `node.register`), Centipede AI creates an approval request in `/security/approvals`. The action **will not execute** until explicit human authorization is granted in the UI.
4. **No Unrestricted Shell Access**: Centipede AI does not possess direct shell execution privileges. Commands are handled exclusively through validated API endpoints.
