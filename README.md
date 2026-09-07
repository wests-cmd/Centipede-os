# Centipede OS

**Centipede OS** is a modern web-based desktop operating system shell and application environment built on top of the **Kingdom** runtime engine (`wests-cmd/kingdom`).

---

## API Contract & Architecture

Centipede OS connects to Kingdom strictly through a frozen, versioned adapter layer (`src/api/kingdomAdapter.ts`). Centipede OS does **not** import Kingdom internal Python code directly, treating Kingdom as an external service contract (`KINGDOM_CENTIPEDE_API_CONTRACT.md`).

```
Centipede OS Shell & Applications
        ↓
  Centipede AI Core Foundation (src/ai/)
        ↓
  Verified Tool System (src/tools/)
        ↓
  KingdomAdapter (src/api/kingdomAdapter.ts)
        ↓  (REST API / WebSockets)
  Kingdom Engine (wests-cmd/kingdom v40.1)
```

---

## Centipede AI Core & Verified Tool System (`src/ai/` & `src/tools/`)

Centipede AI implements a governed, non-bypassable intelligence and tool execution framework:

```
User Input → Intent Parser → Context Manager → Planner → Permission Gate → ToolRegistry → ToolExecutor → KingdomAdapter → Result Processor
```

**Verified Tool System Guarantees (`src/tools/`)**:
1. **The Model is NOT the Security Boundary**: Model outputs saying "I approve this action" carry **zero execution authority**. Authorization is enforced strictly by Kingdom ZeroTrust and human approval workflows.
2. **Immutable Tool Registry**: AI model or external prompt text **cannot** register, modify, or lower tool risk classes at runtime.
3. **Explicit Tool Definitions**: 20 verified tools registered with input schema validation, risk classes (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), and timeouts (10s default).
4. **Tool Composition Bounding**: Tool execution chains are strictly bounded (`maxChainDepth = 5`) to prevent infinite recursion loops.
5. **No Generic Execution Primitives**: Generic execution tools (`shell`, `exec`, `eval`, `run_command`) are forbidden and fail closed.
6. **Idempotency Keys**: Mutating tool executions generate deterministic idempotency keys to prevent duplicate side effects.

---

## Quick Start

### 1. Install Dependencies
```bash
bun install
```

### 2. Run Development Server
```bash
bun run dev
```
Open `http://localhost:3000` in your browser.

### 3. Build Production Distribution
```bash
bun run build
```

---

## Running Test Suites

```bash
# Run All Unit Test Suites (Adapter, AI Core, Verified Tool System)
bun test

# Run Contract Verification Suite (Against live Kingdom server)
bun run test:contract

# Run Playwright End-to-End Browser Test Suite
bun run test:e2e
```

---

## Feature Status Classification

- **IMPLEMENTED**: Verified Tool System (`src/tools/`: ToolRegistry, ToolExecutor, 20 Verified Tools), Centipede AI Core (`src/ai/`: IntentParser, CapabilityResolver, Planner, PermissionGate, ActionExecutor, ResultProcessor, ConversationManager, CentipedeAIPipeline), Formal API Contract (`v1.0.0`), Desktop Shell, KingdomAdapter (18 endpoints), Connection State Engine (6 states), Categorized Error Model (12 codes), Version Compatibility Checker (`v40.0.0`–`v40.1.9`), Task Lifecycle, ZeroTrust Security Approvals, Live WebSocket Event Stream, Universal Search, File Manager Foundation, Terminal Entry Point, Settings.
- **PARTIAL**: AI Model Health Status Inspector.
- **SCAFFOLDING**: None (AI pipeline and Tool system fully implemented and backed by ZeroTrust Permission Gate).
- **PLANNED**: Multi-Node Swarm Topology Visualizer, Local Storage Bridge.
