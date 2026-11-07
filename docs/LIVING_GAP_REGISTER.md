# Centipede OS — Living Gap Register & Operational Reality Audit

<<<<<<< HEAD
**Date:** 2026-11-01
**Role:** Autonomous Engineering Team Leader for Centipede OS
**Source of Truth Version:** `1.0.0` (`package.json`)
=======
**Date:** 2026-11-01
**Role:** Autonomous Engineering Team Leader for Centipede OS
**Source of Truth Version:** `1.0.0` (`package.json`)
>>>>>>> origin/feat/kingdom-universal-autonomous-assistant-11952944265175455362
**Target Kingdom Protocol:** Protocol Major `1`, Contract Version `1.4.0` (`KINGDOM_CENTIPEDE_API_CONTRACT.md`)

---

## 1. Executive Summary & Product Boundary

Centipede OS owns the presentation, desktop integration, media interaction, accessibility, and local application environment. Kingdom owns the autonomous runtime, authorization decisions, and distributed execution. Centipede OS strictly does not implement a competing autonomous backend; all privileged actions and model executions flow through Kingdom's authenticated ZeroTrust contracts.

This register audits the current state of default branch `main`, cataloging what is working, incomplete, source-only, published in release, broken, missing hardware validation, and missing installation paths.

---

## 2. Capability Classification Matrix

### A. Working Capabilities (Verified with Tests and Code)
1. **Dynamic Protocol Capability Negotiation:**
   - `KingdomAdapter` discovers protocol major/minor (Protocol Major 1, Minor 4), caches status, negotiates dynamic capabilities, and gracefully degrades feature sets.
2. **Deterministic Cryptographic Tool Boundaries:**
   - Single-use JIT Capability Grants (`CapabilityGrantEngine`), CSPRNG generation (`generateSecureRandomHex`), parameter hash canonicalization (`computeParameterHash`), path traversal sanitization, and immutable DLQ tracking.
3. **Restricted Sandboxed Filesystem & Process Operations:**
   - Real `./sandbox` directory file read/write/delete operations and binary execution allowlist with shell-metacharacter injection blocks (`/[;&|`$><\n\r]/`).
4. **Read-Only Upstream Kingdom Proxy:**
   - Local HTTP proxy at `/api/v1/kingdom/*` enforcing server-side token protection, localhost-only access, stream size bounding, and sanitized HTTP 500 error responses.
5. **Data Provenance Architecture:**
   - Explicit `DataProvenance` tags (`LIVE`, `LOCAL_DETECTED`, `REMOTE_REPORTED`, `PERSISTED`, `CACHED`, `CONFIGURED`, `UNKNOWN`, `UNAVAILABLE`, `SIMULATED`, `TEST_FIXTURE`) preventing fabricated telemetry.
6. **Accessibility & Design Token System:**
   - Low-resource dark palette (`brand.dark` `#020617`, `brand.active` `#2563eb`, `brand.alert` `#dc2626`), high-contrast modes, large text scaling, and opt-in speech synthesis.
7. **Mobile QR Companion Pairing:**
   - Single-use PIN generation, loopback-restricted pairing administration, in-memory session token indexing, and device revocation.

---

### B. Incomplete Capabilities (In Progress / Partial)
1. **Swarm Console:**
   - Existing UI in `MapsApp.tsx` and `KingdomStatusPanel.tsx` displays basic node status, but lacks an integrated multi-device management console displaying health, resource telemetry, installed tools, models, trust state, and authenticated role profile switching (Observe, Assist, Develop, Admin, Experimental).
2. **AI Tools Installation & Adapter Registry:**
   - External AI application integration exists as concept/doc, but lacks a graphical 10-step guided installation workflow for Claude Code, OpenCode/Ollama, Codex, AutoGen, CrewAI, and Local Llama.cpp with capability/restriction disclosures.
3. **Voice Assistant Pipeline:**
   - `VoiceProcessor` exists with interrupt handling and confidence threshold checks, but lacks default plug-and-play browser Web Speech API providers (`WebSpeechSTTProvider`, `WebSpeechTTSProvider`) and UI push-to-talk/wake-word controls.
4. **Vision & Controlled Computer-Use:**
   - `PerceptionPanel` handles local camera/screen streams and frame budgeting, but lacks integrated vision model interpretation and controlled computer-use action abstractions (window navigation, permitted UI clicks, typing, and recovery).
5. **Autonomous Self-Improvement Timeline:**
   - Autonomous execution history exists inside internal agent engines, but lacks a first-class readable UI timeline displaying objective, planned steps, active agent, assigned Knight, files changed, tests running, repair attempts, and retained lessons.

---

### C. Source-Only Features (Present in Source, Not Shipped in v1.0.0 Stable Binary)
1. **Refreshed Desktop Shell & Everyday App Grid:**
   - Refreshed desktop launcher layout, quick-launch everyday apps, and procedural Centipede World visuals merged on `main` (`f17a9365`), but stable v1.0.0 GitHub release tag remains the earlier XFCE bundle (`e0051a65`).
2. **Calamares Permanent Disk Installer & Boot Menu Scripts:**
   - Branch `origin/server/permanent-installer-plan-20261015` and `origin/codex/calamares-disk-installer` contains live-build Calamares configs and bootstrap scripts, but these are not yet merged or validated as stable distribution releases.

---

### D. Published Release Features (Shipped in v1.0.0 Release)
1. `centipede-os-1.0.0-desktop-web-bundle.tar.gz` (Vite single-page app bundle).
2. `centipede-os-1.0.0-x86_64.iso` (Debian Live-build hybrid ISO).
3. `centipede-os-1.0.0-live-x86_64.img` (Raw byte-identical USB image).
4. `centipede-os-1.0.0-vm-x86_64.qcow2` (QEMU virtual machine disk).
5. Docker smoke image (`wests-cmd/centipede-os:1.0.0`).

---

### E. Broken Integrations & Environmental Boundaries
1. **Direct Docker Socket Execution:**
   - Direct Docker socket mounting is blocked and rejected by design (`tests/unit/step7.test.ts`) to maintain zero-trust boundaries; all container orchestration must occur via Kingdom backend.
2. **Missing Out-of-the-Box Kingdom Contract Fixture Execution:**
   - `tests/integration/contract.integration.ts` expects Kingdom running on port 8000; when offline, it throws `KingdomApiError(KINGDOM_OFFLINE)` as intended, but integration suites must launch the fixture when executing contract suites.

---

### F. Missing Hardware Validation
1. **Host Disk & Physical Telemetry:**
   - Telemetry strictly reports `UNKNOWN` or `UNAVAILABLE` in browser and non-root container environments; host disk metrics require trusted native host agent daemon.
2. **Physical Multi-Monitor & Audio Hardware:**
   - Audio input/output verified via browser Web Audio API mocks and headless sessions; physical microphones, noise cancellation, and multi-display setups require physical host validation.

---

### G. Missing Installation Paths
1. **Permanent Graphical Disk Installation:**
   - Shipped ISO is a Live USB memory-only session. Persistent installation to internal NVMe/SATA disk with Calamares partitioning requires active testing and verification.
2. **Headless Server SSH Bootstrap:**
   - Headless deployment plan requires validated SSH public key injection without default credentials.
3. **Signed Mobile Distribution (Android APK & iOS IPA):**
   - Capacitor builds compile debug APK and iOS simulator shells; production distribution requires pinned Android signing keystores and Apple Developer provisioning profiles.

---

## 3. Targeted Next Autonomous Actions
1. Deploy `SwarmConsoleApp.tsx` with full node health, resource telemetry, role profiles, and DT1 / Laptop 2 task delegation.
2. Deploy `AIToolsApp.tsx` with 10-step installation workflow and Kingdom adapter registry.
3. Implement Web Speech API STT/TTS providers and wire end-to-end voice pipeline in `CentipedeAI.tsx`.
4. Implement controlled computer-use tool interface (`src/tools/computerUse.ts`) and vision analysis in `PerceptionPanel.tsx`.
5. Deploy `SelfImprovementApp.tsx` exposing Kingdom's autonomous engineering timeline.
6. Verify all changes through unit tests, contract tests, and reality linters.
