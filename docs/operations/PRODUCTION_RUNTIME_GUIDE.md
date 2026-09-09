# CENTIPEDE OS — PRODUCTION RUNTIME OPERATIONS GUIDE

## 1. System Overview & Architecture
Centipede OS runs as an isolated React + Vite desktop shell interacting with the Kingdom Engine API v40.1 via `KingdomAdapter`.

---

## 2. Startup, Shutdown & Health Monitoring
- **Start Development Runtime**: `bun run dev` (Port 3000)
- **Start Production Bundle**: `bun run build` followed by static hosting (`dist/`)
- **Kingdom Connection Status**: Polls `/api/v1/runtime` every 5 seconds. Connection state machine transitions across `CONNECTING` → `CONNECTED` → `DISCONNECTED` → `AUTHENTICATION_FAILED` → `VERSION_INCOMPATIBLE`.

---

## 3. Disaster Recovery & Emergency Operations
- **Global Kill Switch**: Located in Centipede AI Autonomy Engine (`src/ai/autonomyEngine.ts`). Triggering `triggerGlobalKillSwitch()` immediately aborts all running tasks, clears workflow queues, and resets autonomy to `LEVEL_0` (Manual Only).
- **Circuit Breakers**: `CircuitBreaker` in `src/tools/executor.ts` trips to `OPEN` state after 3 consecutive tool/provider failures. Cooldown period is 15 seconds before transitioning to `HALF_OPEN`.
- **Dead-Letter Queue (DLQ)**: Permanently failed or timed-out operations are queued in `DeadLetterQueue` for state reconciliation via `reconcileUnknownState()`.

---

## 4. Disaster Recovery Targets
- **Recovery Point Objective (RPO)**: Zero state loss for persisted workflows and JIT capability grant records.
- **Recovery Time Objective (RTO)**: Sub-5 second automatic adapter reconnection upon Kingdom restart.
