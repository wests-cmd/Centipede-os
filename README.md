# Centipede OS

**Centipede OS** is a modern web-based desktop operating system shell and application framework designed to operate seamlessly on top of the **Kingdom** runtime engine (`wests-cmd/kingdom`).

---

## Architecture & Integration

Centipede OS connects to Kingdom through a clean, decoupled adapter layer (`src/api/kingdomAdapter.ts`). Centipede OS does **not** import Kingdom internal Python code directly, treating Kingdom as an external HTTP/WebSocket service contract.

```
Centipede OS Shell & Applications
        ↓
  Centipede AI / OS Services
        ↓
  KingdomAdapter (src/api/kingdomAdapter.ts)
        ↓  (REST API / WebSockets)
  Kingdom Engine (wests-cmd/kingdom v40.1)
```

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
# Run Kingdom Adapter Unit Tests
bun tests/kingdomAdapter.test.ts

# Run Playwright End-to-End Test Suite
npx playwright test
```

---

## Feature Status Classification

- **IMPLEMENTED**: Desktop Shell, KingdomAdapter (18 methods), Connection State Engine (6 states), Version Compatibility Checker (v40.0.0–v40.1.9), Task Pipeline, ZeroTrust Security Approvals, Live WebSocket Event Stream, Universal Search, File Manager Foundation, Terminal Entry Point, Settings.
- **PARTIAL**: AI Model Health Status Inspector.
- **SCAFFOLDING**: Centipede AI Intent Parser & Pipeline Visualizer.
- **PLANNED**: Multi-Node Swarm Topology Visualizer, Local Storage Bridge.

For full technical specifications, see [KINGDOM_INTEGRATION.md](./KINGDOM_INTEGRATION.md).
