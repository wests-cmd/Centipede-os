# Kingdom Integration Guide for Centipede OS

This document defines the stable integration contract, communication protocols, security requirements, connection states, version compatibility rules, and error-handling policies between **Centipede OS** and the **Kingdom** runtime (`wests-cmd/kingdom`).

---

## Architecture Overview

```
Centipede OS (Desktop Shell & Views)
        ↓
  Centipede AI / OS Services
        ↓
  KingdomAdapter (src/api/kingdomAdapter.ts)
        ↓  (HTTP REST / WebSockets)
  Kingdom API (v40.1)
        ↓
  Kingdom Runtime Engine / Swarm / ZeroTrust
```

Centipede OS communicates with Kingdom **strictly through `KingdomAdapter`**. No internal Kingdom Python modules are imported or directly coupled.

---

## Feature Status Classification

### IMPLEMENTED
- **Kingdom Integration Adapter (`KingdomAdapter`)**: Full typed TS client covering all 18 specified Kingdom REST endpoints (`get_status`, `start_runtime`, `stop_runtime`, `get_mode`, `set_mode`, `submit_task`, `get_task`, `cancel_task`, `get_events`, `get_knights`, `get_models`, `get_memory`, `search_memory`, `get_maps`, `get_security_status`, `get_permissions`, `create_approval`, `approve`, `deny`, `get_audit`).
- **Connection State Machine**: 6 distinct states (`CONNECTING`, `CONNECTED`, `DISCONNECTED`, `AUTHENTICATION_FAILED`, `VERSION_INCOMPATIBLE`, `ERROR`).
- **Version Compatibility Engine**: Minimum supported version `40.0.0`, maximum tested version `40.1.9`. Automatically flags `INCOMPATIBLE_TOO_OLD` or `INCOMPATIBLE_TOO_NEW`.
- **Controlled Backoff Reconnection**: Retries with exponential backoff (2s → 4s → 8s → 16s cap) without aggressive infinite looping.
- **ZeroTrust Security Governance**: Non-bypassable approval workflow for privileged capabilities (`filesystem.delete`, `process.execute`, etc.).
- **Live Event Dispatcher**: Real-time event consumption via `/ws` WebSocket stream.
- **Desktop Shell & System Views**: Desktop Shell, App Launcher, Kingdom Status Panel, Activity & Task Manager, ZeroTrust Permissions & Approvals View, Universal Search, File Manager Foundation, Terminal Entry Point, Settings Panel.
- **Automated Test Suite**: Unit tests (`tests/kingdomAdapter.test.ts`) and Playwright E2E suite (`tests/e2e.spec.ts`) covering all 12 criteria.

### PARTIAL
- **AI Model Health Inspection**: Connects to `/models` and parses health JSON; AI generation fallback currently mock/scaffolded when Ollama provider is disabled.

### SCAFFOLDING
- **Centipede AI Intent Parser**: Simulated step-by-step pipeline (User → Intent → Plan → Permission Check → Kingdom → Result) for prompt intent decomposition before dispatching tasks to Kingdom.

### PLANNED
- **Multi-Node Cluster Synchronizer**: Advanced node registry topology graph visualizer.
- **Persistent Local File Storage Bridge**: Virtual directory mapping directly to local disk volumes.

---

## Connection States

| State | Description | UI Display |
|---|---|---|
| `CONNECTING` | Attempting initial or reconnect HTTP ping to `/status` | Yellow pulsing badge |
| `CONNECTED` | Active connection verified with `/status` and WebSocket stream connected | Green badge |
| `DISCONNECTED` | Kingdom server offline or network unreachable | Red badge + warning banner |
| `AUTHENTICATION_FAILED` | HTTP 401/403 returned on security endpoints | Amber badge + auth warning |
| `VERSION_INCOMPATIBLE` | Detected Kingdom major/minor version outside v40.0.0–v40.1.9 range | Purple badge + alert banner |
| `ERROR` | Unexpected transport or JSON parsing error | Red badge |

---

## Kingdom API Endpoints Reference

### Runtime & Status
- `GET /status` → Engine state, running bool, version, task counters
- `POST /start` → Starts runtime engine
- `POST /stop` → Stops runtime engine
- `GET /mode` / `PUT /mode` → Query/change runtime mode (`adaptive`, `lightweight`)

### Tasks
- `POST /tasks` → Submit prompt task
- `GET /tasks` / `GET /tasks/{id}` → List or inspect tasks
- `POST /tasks/{id}/cancel` → Cancel task execution

### Security & ZeroTrust
- `GET /security/status` → Security engine status and pending approval counts
- `GET /security/permissions` → Node capabilities mapping
- `GET /security/approvals` → List pending approval requests
- `POST /security/approvals` → Create approval request
- `POST /security/approvals/{id}/approve` → Grant approval
- `POST /security/approvals/{id}/deny` → Deny approval
- `GET /security/audit` → Query immutable audit log

---

## Error Handling & Error Masking

`KingdomAdapter` intercepts all network and HTTP errors:
1. **Sensitive Data Masking**: Python tracebacks, bearer tokens, secrets, and credentials are stripped from UI error messages before rendering.
2. **Graceful Degradation**: Centipede OS boots and functions offline without crashing when Kingdom is unreachable.

---

## Developer Setup & Testing Instructions

### Prerequisites
- Node.js v22+ / Bun v1.2+
- Python 3.12+ (for running Kingdom backend)

### Running Kingdom Backend
```bash
cd /tmp/kingdom
PYTHONPATH=. python3 -m uvicorn backend.main:app --port 8000
```

### Building & Running Centipede OS
```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build production bundle
bun run build
```

### Running Test Suites
```bash
# Unit tests for KingdomAdapter & Version engine
bun tests/kingdomAdapter.test.ts

# Playwright E2E verification
npx playwright test
```
