# Kingdom Integration Guide for Centipede OS

This document defines the integration contract, communication protocols, security requirements, connection states, version compatibility rules, and error-handling policies between **Centipede OS** and the **Kingdom** runtime (`wests-cmd/kingdom`).

> **Formal Specification**: For the frozen, versioned API contract specification, see [KINGDOM_CENTIPEDE_API_CONTRACT.md](./KINGDOM_CENTIPEDE_API_CONTRACT.md).

---

## Architecture Overview

```
Centipede OS (Desktop Shell & Views)
        ↓
  Centipede AI Core Foundation (src/ai/)
        ↓
  Verified Tool System (src/tools/)
        ↓
  Memory + Learning + Skills System (src/learning/)
        ↓
  Universal Search System (src/search/)
        ↓
  KingdomAdapter (src/api/kingdomAdapter.ts)
        ↓  (HTTP REST / WebSockets)
  Kingdom API (v40.1)
        ↓
  Kingdom Runtime Engine / Swarm / ZeroTrust
```

Centipede OS communicates with Kingdom **strictly through `KingdomAdapter`**. No internal Kingdom Python modules are imported or directly coupled.

---

## Endpoint Coverage Matrix

The adapter implements the currently supported Kingdom integration surface documented in the contract:

| Kingdom Endpoint | Exists | Adapter Method | Tested | Contract Status | Classification / Notes |
|---|---|---|---|---|---|
| `GET /status` | Yes | `get_status()` | Yes | Contracted | `IMPLEMENTED` - Runtime health & task counters |
| `POST /start` | Yes | `start_runtime()` | Yes | Contracted | `IMPLEMENTED` - Starts runtime engine |
| `POST /stop` | Yes | `stop_runtime()` | Yes | Contracted | `IMPLEMENTED` - Stops runtime engine |
| `GET /mode` | Yes | `get_mode()` | Yes | Contracted | `IMPLEMENTED` - Queries operating mode |
| `PUT /mode` | Yes | `set_mode()` | Yes | Contracted | `IMPLEMENTED` - Sets operating mode |
| `POST /tasks` | Yes | `submit_task()` | Yes | Contracted | `IMPLEMENTED` - Submits prompt task |
| `GET /tasks` | Yes | `list_tasks()` | Yes | Contracted | `IMPLEMENTED` - Lists tasks |
| `GET /tasks/{task_id}` | Yes | `get_task()` | Yes | Contracted | `IMPLEMENTED` - Inspects single task |
| `POST /tasks/{task_id}/cancel` | Yes | `cancel_task()` | Yes | Contracted | `IMPLEMENTED` - Cancels task |
| `GET /events` | Yes | `get_events()` | Yes | Contracted | `IMPLEMENTED` - Queries historical events |
| `WS /ws` | Yes | `initWebSocket()` | Yes | Contracted | `IMPLEMENTED` - Real-time WebSocket stream |
| `GET /knights` | Yes | `get_knights()` | Yes | Contracted | `IMPLEMENTED` - Swarm knights list |
| `GET /models` | Yes | `get_models()` | Yes | Contracted | `IMPLEMENTED` - Model providers health |
| `POST /models/generate` | Yes | `generate_model()` | Yes | Contracted | `IMPLEMENTED` - Model text generation |
| `POST /models/stream` | Yes | SSE stream | No | Contracted | `PARTIAL` - SSE streaming endpoint available |
| `GET /memory` | Yes | `get_memory()` | Yes | Contracted | `IMPLEMENTED` - Retrieves memory entries |
| `POST /memory` | Yes | `add_memory()` | Yes | Contracted | `IMPLEMENTED` - Records memory entry |
| `GET /memory/search` | Yes | `search_memory()` | Yes | Contracted | `IMPLEMENTED` - Vector search memory |
| `GET /memory/graph` | Yes | `get_memory_graph()` | Yes | Contracted | `IMPLEMENTED` - Memory graph structure |
| `POST /memory/snapshot` | Yes | `create_memory_snapshot()` | Yes | Contracted | `IMPLEMENTED` - Creates memory snapshot |
| `GET /maps` | Yes | `get_maps()` | Yes | Contracted | `IMPLEMENTED` - Lists saved AI maps |
| `GET /maps/{name}` | Yes | `get_map()` | Yes | Contracted | `IMPLEMENTED` - Imports AI map |
| `POST /maps/{name}` | Yes | `save_map()` | Yes | Contracted | `IMPLEMENTED` - Exports AI map |
| `GET /security/status` | Yes | `get_security_status()` | Yes | Contracted | `IMPLEMENTED` - Security engine health |
| `GET /security/policies` | Yes | `get_security_policies()` | Yes | Contracted | `IMPLEMENTED` - Capabilities & risk map |
| `GET /security/permissions` | Yes | `get_permissions()` | Yes | Contracted | `IMPLEMENTED` - Registered node capabilities |
| `POST /security/authorize` | Yes | `authorize_capability()` | Yes | Contracted | `IMPLEMENTED` - Authorizes capability request |
| `GET /security/approvals` | Yes | `list_approvals()` | Yes | Contracted | `IMPLEMENTED` - Lists approval requests |
| `POST /security/approvals` | Yes | `create_approval()` | Yes | Contracted | `IMPLEMENTED` - Creates approval request |
| `POST /security/approvals/{id}/approve` | Yes | `approve()` | Yes | Contracted | `IMPLEMENTED` - Grants approval |
| `POST /security/approvals/{id}/deny` | Yes | `deny()` | Yes | Contracted | `IMPLEMENTED` - Denies approval |
| `GET /security/audit` | Yes | `get_audit()` | Yes | Contracted | `IMPLEMENTED` - ZeroTrust audit trail |

---

## Feature Status Classification

### IMPLEMENTED
- **Step 8 Mobile Companion App & Anti-Tampering Engine (`src/components/MobileCompanionApp.tsx`, `src/security/approvalTamperGuard.ts`, `src/ingest/knowledgeManager.ts`)**: QR PIN companion pairing UI, parameter hash anti-tampering verification, and knowledge provenance tracking.
- **Step 7 Runtime Platform Foundation (`src/platform/`, `src/config/`, `Dockerfile`, `docker-compose.yml`)**: Platform capability detection, configuration validation, non-root multi-stage Docker containerization, health checks, and isolated service networking.
- **Versioned REST API & Mobile Pairing (`src/server/`, `src/security/deviceTrust.ts`)**: Versioned endpoints (`/api/v1/*`), QR device pairing, PIN validation, session tokens, and device revocation.
- **Untrusted Content Ingestion Pipeline (`src/ingest/pipeline.ts`)**: Untrusted data classification, provenance tracking, and prompt injection security scanning.
- **Memory & Learning System (`src/learning/`)**: Scope-based MemoryStore with Trust Level Hierarchy (`SYSTEM_AUTHORITY` > `USER_CONFIRMED` > `MODEL_INFERENCE`), LearningEngine with evidence signal thresholding ($N=3$) and hard security metric evaluation (>0 security violations = evaluation fail), versioned SkillManager with skill immutability, capability expansion diff engine, and rollback engine.
- **Universal Search System (`src/search/`)**: Multi-source aggregator (`SearchAggregator`) searching across Applications, Files, Kingdom Tasks, Vector Memory, AI Maps, and Web. Features path traversal defenses (`..`, `/etc`, `/proc`, `/sys`, `/root` blocked), untrusted external web data tagging (`isUntrustedData: true`), result provenance, and Search-Action execution separation.
- **Verified Tool System (`src/tools/`)**: Locked ToolRegistry, ToolExecutor, 20 verified tool definitions, parameter input schema validation, execution timeout controls (10s), idempotency keys, and tool composition chain depth limits (`maxChainDepth = 5`).
- **Centipede AI Core Pipeline (`src/ai/`)**: Governed pipeline (User Input → IntentParser → ContextManager → Planner → PermissionGate → ActionExecutor → ResultProcessor). ZeroTrust permission gate enforces non-bypassable approvals; model text outputs carry zero authority.
- **Formal API Contract (`KINGDOM_CENTIPEDE_API_CONTRACT.md`)**: Frozen, documented, versioned interface contract (`v1.0.0`) for Kingdom v40.1.
- **Kingdom Integration Adapter (`KingdomAdapter`)**: Full typed TS client covering all Kingdom REST & WS endpoints.
- **Connection State Machine**: 6 distinct states (`CONNECTING`, `CONNECTED`, `DISCONNECTED`, `AUTHENTICATION_FAILED`, `VERSION_INCOMPATIBLE`, `ERROR`).
- **Categorized Error Engine**: 12 explicit error codes (`INVALID_REQUEST`, `AUTHENTICATION_FAILED`, `AUTHORIZATION_DENIED`, `NOT_FOUND`, `TIMEOUT`, `KINGDOM_OFFLINE`, `ENDPOINT_UNAVAILABLE`, `VERSION_INCOMPATIBLE`, `TASK_FAILED`, `TASK_CANCELLED`, `SERVER_ERROR`, `UNKNOWN_ERROR`).
- **Version Compatibility Engine**: Supported versions `40.0.0`–`40.1.9`. Statuses: `COMPATIBLE`, `COMPATIBLE_WITH_WARNING`, `UNSUPPORTED`, `UNKNOWN`.
- **Controlled Backoff Reconnection**: Exponential backoff retries (2s → 4s → 8s → 16s cap) preventing aggressive request loops when offline.
- **ZeroTrust Security Governance**: Non-bypassable approval workflow for privileged capabilities (`filesystem.delete`, `process.execute`, etc.).
- **Live Event Dispatcher**: Real-time event consumption via `/ws` WebSocket stream.
- **Desktop Shell & System Views**: Desktop Shell, App Launcher, Kingdom Status Panel, Activity & Task Manager, ZeroTrust Permissions & Approvals View, Universal Search, File Manager Foundation, Terminal Entry Point, Settings Panel.
- **Automated Contract Test Suite**: Unit tests (`vitest`), contract integration suite (`npm run test:contract`), and Playwright E2E suite (`npm run test:e2e`).

### PARTIAL
- **AI Model Health Inspection**: Connects to `/models` and parses health JSON; AI generation fallback currently mock/scaffolded when Ollama provider is disabled.

### SCAFFOLDING
- None (All core subsystems, AI pipeline, Tool system, Search system, Memory, and Learning systems are fully implemented and backed by ZeroTrust Permission Gate).

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

## Authentication & CORS Audit Findings

- **Authentication**: Kingdom API endpoints currently validate ZeroTrust capability authorization bindings based on `actor_id` passed in request bodies (`backend/security/zero_trust.py`). HTTP Bearer token headers are supported by `KingdomAdapter` and raise `AUTHENTICATION_FAILED` on HTTP 401.
- **CORS Configuration**: Kingdom backend (`backend/main.py`) defaults to `allow_origins=["*"]` in development. In production deployments, origin filtering should be restricted via environment variables.

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
# Unit test assertions (pure offline)
bun test

# Contract verification suite against live Kingdom server
bun run test:contract

# Playwright E2E browser contract verification
bun run test:e2e
```
