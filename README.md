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
  KingdomAdapter (src/api/kingdomAdapter.ts)
        ↓  (REST API / WebSockets)
  Kingdom Engine (wests-cmd/kingdom v40.1)
```

---

## Centipede AI Core Foundation (`src/ai/`)

Centipede AI implements a governed, non-bypassable intelligence pipeline:

```
User Input → Intent Parser → Context Manager → Planner → Permission Gate → KingdomAdapter → Result Processor
```

**Key Safety Principles**:
1. **The Model is NOT the Security Boundary**: Model outputs saying "I approve this action" carry **zero authority**. Authorization is enforced strictly by Kingdom ZeroTrust and human approval workflows.
2. **Zero Unrestricted Shell Access**: AI cannot execute direct shell commands or bypass capability risk gates.
3. **Zero Guessing**: Ambiguous inputs yield an `UNKNOWN` intent requesting user clarification rather than executing inferred actions.

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
# Run Unit Test Suite (Offline assertions for Adapter & AI Core)
bun test

# Run Contract Verification Suite (Against live Kingdom server)
bun run test:contract

# Run Playwright End-to-End Browser Test Suite
bun run test:e2e
```

---

## Feature Status Classification

- **IMPLEMENTED**: Centipede AI Core Foundation (`src/ai/`: IntentParser, CapabilityResolver, Planner, PermissionGate, ActionExecutor, ResultProcessor, ConversationManager, CentipedeAIPipeline), Formal API Contract (`v1.0.0`), Desktop Shell, KingdomAdapter (18 endpoints), Connection State Engine (6 states), Categorized Error Model (12 codes), Version Compatibility Checker (`v40.0.0`–`v40.1.9`), Task Lifecycle, ZeroTrust Security Approvals, Live WebSocket Event Stream, Universal Search, File Manager Foundation, Terminal Entry Point, Settings.
- **PARTIAL**: AI Model Health Status Inspector.
- **SCAFFOLDING**: None (AI pipeline fully implemented and backed by ZeroTrust Permission Gate).
- **PLANNED**: Multi-Node Swarm Topology Visualizer, Local Storage Bridge.
