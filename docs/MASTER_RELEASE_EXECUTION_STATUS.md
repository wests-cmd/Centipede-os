# Centipede OS master release execution status

This status page maps the supplied **Master Release Execution Checklist** to the current repository. It is an audit snapshot, not evidence that planned capabilities work. `PROVEN` requires reproducible behavior and release evidence; code presence alone is insufficient. The checklist is much broader than the current desktop/live-media product.

**Overall release status: NOT PROVEN against the master checklist.** The published v1.0.0 artifacts and their narrower gates are tracked in [SHIP_REALITY_MATRIX.md](SHIP_REALITY_MATRIX.md). This page records the expanded product requirements and blockers.

| Phase | Requirement | Status | Current evidence / primary remaining work |
|---|---|---|---|
| 0 | Repository interrogation | **PARTIAL** | Release/configuration, runtime, UI, and telemetry paths have been inspected in this work. Complete file-by-file inventory and adversarial proof of every subsystem remains open. |
| 1 | Self-update system | **MISSING** | `src/platform/targetUpdateChecker.ts` checks target metadata; it is not a downloader, installer, signed-feed verifier, atomic updater, or rollback manager. |
| 2 | Self-repair and recovery | **MISSING** | No verified repair executor, safe/recovery mode, or known-good recovery store. |
| 3 | Persistent user state | **PARTIAL** | Persistence exists in selected workflow/memory/browser paths. No complete SYSTEM/APP/USER/SECRET/CACHE/LOG scheme or migration backup/rollback proof. |
| 4 | Persistent agent runtime | **PARTIAL** | Workflow persistence exists; detached execution, task checkpoint recovery, and safe post-reboot resume are not demonstrated. |
| 5 | Agent state model | **PARTIAL** | Task/workflow state exists across modules; no single required state machine with history, blocker explanation, and restart semantics is proven. |
| 6 | Needs Your Attention queue | **PARTIAL** | Approval count and connection warnings exist; there is no unified queue for approvals, failures, updates, repairs, and device alerts. |
| 7 | Multi-agent Segmentor | **PARTIAL** | Planner/executor architecture exists; specialist orchestration, safe delegation, and cancellation/recovery are not proven end to end. |
| 8 | Model router | **PARTIAL** | Model abstraction exists; hardware/privacy/cost-aware routing, local failover, and performance history are not demonstrated. |
| 9 | Context system | **PARTIAL** | Context engine/manager exist; budgeted retrieval, compaction, and controlled context offloading need end-to-end proof. |
| 10 | Event bus and live action | **PARTIAL** | Events and activity views exist in parts; one authoritative event stream covering the checklist domains is not established. |
| 11 | Workspaces | **PARTIAL** | Workspace UI/registry exist; independent permissions, memory, teams, full persistence, and import/export are not proven. |
| 12 | Skills | **PARTIAL** | Trusted skill engine exists; complete lifecycle, dependency resolution, promotion, rollback, and live update proof remain open. |
| 13 | Plugins, MCP, external tools | **MISSING** | No complete signed, sandboxed plugin registry and lifecycle is established. Existing tools still must pass Kingdom authorization. |
| 14 | Workflow/SOP engine | **PARTIAL** | Workflow engine and persistence exist; versioning, schedule/event triggers, checkpoints, and recovery are not fully demonstrated. |
| 15 | Centipede Doctor | **MISSING** | No user-facing system diagnosis and repair workflow with safe support bundle is complete. |
| 16 | Proactive Segmentor | **MISSING** | No verified unified proactive monitoring/notification system with spam controls. |
| 17 | Camera and vision | **MISSING** | Browser permission capability checks do not constitute a camera manager, safe streaming, recording control, or local vision workflow. |
| 18 | 3D printer vision | **MISSING** | No printer monitoring/vision integration or separately authorized control path is proven. |
| 19 | Microphone and two-way voice | **PARTIAL** | Voice interface/browser capability code exists; persistent modes, indicators/history, revocation, and local-first speech are unproven. |
| 20 | Multimodal understanding | **PARTIAL** | Some application/model interfaces exist; image/video/audio understanding workflows and measured outputs are not demonstrated. |
| 21 | Drawing to usable artifact | **MISSING** | No verified sketch-to-SVG/DXF workflow with missing-dimension handling. |
| 22 | Object to CAD | **MISSING** | No multi-view measured object reconstruction workflow. |
| 23 | CAD copilot | **MISSING** | No editable CAD understanding and parametric editing workflow. |
| 24 | CAD/print validation | **MISSING** | No geometry/slicing/G-code validation or authorized printer execution pipeline. |
| 25 | Accessibility | **PARTIAL** | Some accessible patterns exist; no full accessibility settings/profile set or workflow-level proof. |
| 26 | Visual accessibility | **PARTIAL** | Semantic/keyboard/reduced-motion support is present in places; screen-reader, scaling, contrast, and no-color-only coverage require audit. |
| 27 | Hearing accessibility | **PARTIAL** | Visual status/warnings exist; live captions and end-to-end no-audio coverage are not proven. |
| 28 | Mobility/dexterity accessibility | **PARTIAL** | Keyboard-operable controls exist in places; voice/switch-control and full keyboard-only workflows are not proven. |
| 29 | Cognitive/reading accessibility | **PARTIAL** | Some onboarding/explanation UI exists; simple-language and resume/focus modes are not complete. |
| 30 | Speech accessibility | **PARTIAL** | Text interactions provide an alternative to voice; adjustable recognition and the required speech controls are not proven. |
| 31 | Accessibility persistence | **MISSING** | Persistence through update, repair, rollback, reboot, and recovery is not established. |
| 32 | Multi-device/multi-machine | **PARTIAL** | Phone pairing and companion/API paths exist; trusted device presence, remote task recovery, and quarantine workflows are not proven. |
| 33 | Mobile companion | **PARTIAL — signed distribution BLOCKED** | Android/iOS project references and pairing shells exist. Production signing, store compliance, and complete companion workflows are not verified. |
| 34 | Resource modes | **PARTIAL** | Some low-resource choices exist; measured PERFORMANCE/BALANCED/LOW POWER/ULTRALIGHT behavior and the <5 GB target need artifact evidence. |
| 35 | UI | **PARTIAL** | Centipede desktop shell and application areas exist; checklist navigation, modes, health/repair/update/recovery areas remain incomplete. |
| 36 | Kingdom security invariants | **PARTIAL** | Kingdom authorization boundaries exist in the tool path. Camera, printer, plugin, remote-node, and full revocation invariants are not all implemented/proven. |
| 37 | Doomsday testing | **PARTIAL** | Unit/adversarial tests exist. The specified update/recovery, device, camera, microphone, printer, and accessibility attack/failure suite has not run. |
| 38 | Accessibility test personas | **MISSING** | No real workflow evidence for the listed test personas. |
| 39 | Repository consolidation | **PARTIAL** | Current reality docs and one release target gate are identified; stale historical claims remain and need systematic review. |
| 40 | Release proof | **NOT PROVEN** | The master sequence requires exact published artifact download/install, clean-environment boot, update/rollback/repair/recovery, persistence, accessibility, and smoke evidence. That full sequence is not available. |

## Changes made in the current audit

- Removed the fabricated Kingdom patch/version/release notes and no-op success/rollback UI; the panel now reports observed connection/version and states the update limitation.
- Changed unprobed Centipede, Kingdom, and model service health to `UNKNOWN`; removed invented fixed latency.
- Changed missing Kingdom task/mode/running telemetry to `UNKNOWN` in user-facing status text; offline state no longer turns cached absence into a `STOPPED` claim or starts an engine without a live connection/status.
- Removed guessed storage category totals, fixed `NORMAL` pressure, synthetic disk metrics, and the executor's false emergency-disk claim. Browser quota is labeled as browser-origin data, not physical disk capacity.
- Removed guessed CPU/memory/storage defaults from profile suggestions and first-run display. The suggestion is explicitly a heuristic, and unknown measurements remain unknown.
- Replaced the natural-language storage query's invented 512/256 GB report with an explicit unavailable message.

## Immediate release blockers

1. No persistent disk installer or recovery boot mode.
2. No verified installed-system updater, signing/key trust, rollback, or update recovery.
3. No actual host disk telemetry or disk-space preflight in the browser app.
4. Kingdom and model service health are not actively probed by the generic runtime endpoint.
5. Android/iOS signed distribution and full phone workflows are not proven.
6. Full clean-install/update/rollback/repair/recovery/accessibility release sequence has not been demonstrated.

Do not mark this master release **PROVEN** until the exact phase requirements above have reproducible evidence and the release proof sequence succeeds.
