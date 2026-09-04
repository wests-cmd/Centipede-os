# Centipede OS

**Centipede OS** is a modern web-based desktop operating system shell and application framework built on top of the **Kingdom** runtime engine (`wests-cmd/kingdom`).

---

## API Contract & Architecture

Centipede OS connects to Kingdom strictly through a frozen, versioned adapter layer (`src/api/kingdomAdapter.ts`). Centipede OS does **not** import Kingdom internal Python code directly, treating Kingdom as an external service contract (`KINGDOM_CENTIPEDE_API_CONTRACT.md`).

```
Centipede OS Shell & Applications
        ↓
  Centipede AI / OS Services
        ↓
  KingdomAdapter (src/api/kingdomAdapter.ts)
        ↓  (REST API / WebSockets)
  Kingdom Engine (wests-cmd/kingdom v40.1)
```

For full technical specifications, endpoint schemas, error codes, and version compatibility rules, see [KINGDOM_CENTIPEDE_API_CONTRACT.md](./KINGDOM_CENTIPEDE_API_CONTRACT.md).

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
# Run Contract Verification Suite
bun tests/contract.test.ts

# Run Playwright End-to-End Test Suite
npx playwright test
```

---

## Feature Status Classification

- **IMPLEMENTED**: Formal API Contract Specification (`v1.0.0`), Desktop Shell, KingdomAdapter (18 endpoints), Connection State Engine (6 states), Categorized Error Model (12 codes), Version Compatibility Checker (`v40.0.0`–`v40.1.9`), Task Lifecycle, ZeroTrust Security Approvals, Live WebSocket Event Stream, Universal Search, File Manager Foundation, Terminal Entry Point, Settings.
- **PARTIAL**: AI Model Health Status Inspector.
- **SCAFFOLDING**: Centipede AI Intent Parser & Pipeline Visualizer.
- **PLANNED**: Multi-Node Swarm Topology Visualizer, Local Storage Bridge.
