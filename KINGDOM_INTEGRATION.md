# Kingdom Integration Guide for Centipede OS

This document defines the integration contract, communication protocols, security requirements, connection states, version compatibility rules, and error-handling policies between **Centipede OS** and the **Kingdom** runtime (`wests-cmd/kingdom`).

> **Formal Specification**: For the frozen, versioned API contract specification, see [KINGDOM_CENTIPEDE_API_CONTRACT.md](./KINGDOM_CENTIPEDE_API_CONTRACT.md).

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
- **Formal API Contract (`KINGDOM_CENTIPEDE_API_CONTRACT.md`)**: Frozen, documented, versioned interface contract (`v1.0.0`) for Kingdom v40.1.
- **Kingdom Integration Adapter (`KingdomAdapter`)**: Full typed TS client covering all 18 specified Kingdom REST endpoints (`get_status`, `start_runtime`, `stop_runtime`, `get_mode`, `set_mode`, `submit_task`, `get_task`, `cancel_task`, `get_events`, `get_knights`, `get_models`, `get_memory`, `search_memory`, `get_maps`, `get_security_status`, `get_permissions`, `create_approval`, `approve`, `deny`, `get_audit`).
- **Connection State Machine**: 6 distinct states (`CONNECTING`, `CONNECTED`, `DISCONNECTED`, `AUTHENTICATION_FAILED`, `VERSION_INCOMPATIBLE`, `ERROR`).
- **Categorized Error Engine**: 12 explicit error codes (`INVALID_REQUEST`, `AUTHENTICATION_FAILED`, `AUTHORIZATION_DENIED`, `NOT_FOUND`, `TIMEOUT`, `KINGDOM_OFFLINE`, `ENDPOINT_UNAVAILABLE`, `VERSION_INCOMPATIBLE`, `TASK_FAILED`, `TASK_CANCELLED`, `SERVER_ERROR`, `UNKNOWN_ERROR`).
- **Version Compatibility Engine**: Supported versions `40.0.0`–`40.1.9`. Statuses: `COMPATIBLE`, `COMPATIBLE_WITH_WARNING`, `UNSUPPORTED`, `UNKNOWN`.
- **Controlled Backoff Reconnection**: Exponential backoff retries (2s → 4s → 8s → 16s cap) preventing aggressive request loops when offline.
- **ZeroTrust Security Governance**: Non-bypassable approval workflow for privileged capabilities (`filesystem.delete`, `process.execute`, etc.).
- **Live Event Dispatcher**: Real-time event consumption via `/ws` WebSocket stream.
- **Desktop Shell & System Views**: Desktop Shell, App Launcher, Kingdom Status Panel, Activity & Task Manager, ZeroTrust Permissions & Approvals View, Universal Search, File Manager Foundation, Terminal Entry Point, Settings Panel.
- **Automated Contract Test Suite**: Contract unit tests (`tests/contract.test.ts`) and Playwright E2E suite (`tests/e2e.spec.ts`) covering all scenarios.

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
| `AUTHENTICATION_FAILED` | HTTP 401 returned on security endpoints | Amber badge + auth warning |
| `VERSION_INCOMPATIBLE` | Detected Kingdom version outside supported range | Purple badge + alert banner |
| `ERROR` | Unexpected transport or JSON parsing error | Red badge |

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
# Contract verification suite against live Kingdom server
bun tests/contract.test.ts

# Playwright E2E contract verification
npx playwright test
```
