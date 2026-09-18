# CENTIPEDE OS — SHIP REALITY MATRIX

**Date:** March 2025
**Version:** v1.0.0
**Git Commit:** d6e73a0

---

## Subsystem Ship Matrix

| Capability | Source | Build Path | Runtime Path | Test | Artifact | Status |
|---|---|---|---|---|---|---|
| Centipede Desktop | `src/App.tsx`, `src/components/DesktopShell.tsx` | `bun run build` (Vite) | `http://localhost:5173` | `tests/unit/step7.test.ts` | `release/centipede-os-1.0.0-desktop-web-bundle.tar.gz` | REAL + BUILDABLE |
| Segmentor AI Assistant | `src/ai/aiCore.ts`, `src/components/CentipedeAI.tsx` | Vite bundler | Local JS Runtime | `tests/unit/aiCore.test.ts` | Included in Web Bundle | REAL + RUNTIME VERIFIED |
| Kingdom Integration | `src/api/kingdomAdapter.ts`, `src/api/contractSpec.ts` | Vite bundler | REST/WS Port 8000 | `tests/unit/adapter.test.ts` | Adapter Layer | REAL + RUNTIME VERIFIED |
| AI Pipeline & Planning | `src/ai/planner.ts`, `src/ai/permissionGate.ts` | Vite bundler | Pipeline Execution | `tests/unit/aiCore.test.ts` | In-memory Engine | REAL + RUNTIME VERIFIED |
| Tool Execution Engine | `src/tools/executor.ts`, `src/tools/definitions.ts` | Vite bundler | Dispatcher | `tests/unit/tools.test.ts` | Validated Execution | REAL + RUNTIME VERIFIED |
| ZeroTrust Permission Gate | `src/ai/permissionGate.ts`, `src/agent/grants.ts` | Vite bundler | JIT Authorization | `tests/unit/adversarial.test.ts` | Fail-Closed Gate | REAL + RUNTIME VERIFIED |
| Human Approval anti-tampering | `src/security/approvalTamperGuard.ts` | Vite bundler | Dynamic Payload Check | `tests/unit/step8.test.ts` | Cryptographic Guard | REAL + RUNTIME VERIFIED |
| Memory & User Knowledge Store | `src/learning/memoryStore.ts`, `src/learning/userKnowledgeStore.ts` | Vite bundler | Local Memory / Persistence | `tests/unit/learning.test.ts` | Trust-bound Store | REAL + RUNTIME VERIFIED |
| Skills Ecosystem | `src/skills/trustedSkillEngine.ts`, `src/skills/manifest.ts` | Vite bundler | Skill Registry | `tests/unit/step12_13.test.ts` | Signed Skill Manifests | REAL + RUNTIME VERIFIED |
| Universal Search | `src/search/searchAggregator.ts` | Vite bundler | Aggregator Engine | `tests/unit/search.test.ts` | Permissions Aggregator | REAL + RUNTIME VERIFIED |
| Voice Processor | `src/ai/voiceInterface.ts` | Vite bundler | Web Speech / STT | `tests/unit/voiceAndAutonomy.test.ts` | Voice Engine | REAL + RUNTIME VERIFIED |
| Mobile Companion Client | `src/components/MobileCompanionApp.tsx` | Vite bundler | Web PWA / QR Session | `tests/unit/step7.test.ts` | Mobile Web App | REAL + RUNTIME VERIFIED |
| Multi-Node Swarm Docker Stack | `docker-compose.yml`, `Dockerfile` | `docker compose build` | Container Swarm | `tests/unit/step7.test.ts` | Docker Image Stack | REAL + BUILDABLE |
| VM / Live USB / Bootable OS | Planned OS Kernel | Kernel ISO Pipeline | Virtual / Hardware Boot | N/A | Planned OS Milestones | PLANNED / APP LAYER |
