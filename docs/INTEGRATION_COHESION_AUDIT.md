# Centipede OS integration cohesion — verified P0 audit

Reviewed Centipede `main` `57dad1be427c7a7ee9efee197405e9c988a3bf0d` (2026-11-07) and Kingdom `main` `2c6f2b555094a74ea87eaedeedbd81f8c4ce804c` (2026-11-04).

## Concrete failures and gaps

1. Main CI run 42418570106 failed TypeScript validation: repeated `generateSecureRandomHex` import bindings and broken `fetchJson` endpoint matching using undefined `spec`, `key` and `item`.
2. Default Kingdom URL `/api/v1/kingdom` is read-only by design: `src/server/kingdomReadProxy.ts` accepts only local-admin GET requests. Segmentor's permission gate could not use `POST /security/authorize` over that default transport.
3. The assistant, Tasks, Workspace, skills and memory are disconnected at the data-model level: `src/ai/pipeline.ts` uses ToolExecutor, `ActivityTaskView.tsx` sends adapter task requests, `WorkspaceApp.tsx` uses local `workflowEngine`, `MemoryApp.tsx` uses local `memoryStore`, and `SkillsApp.tsx` uses local `skillManager`.
4. `FileManager.tsx` is an explicitly labelled sample viewer; not an authorized native filesystem provider.
5. PR #143 is unmerged, so proposed swarm, computer-use, voice and self-improvement modules are not yet in main.

## Scope of this corrective PR

- Repair build-blocking duplicate imports and the method-aware dynamic contract matcher.
- Expose read-only transport semantics and reject mutation requests before sending HTTP.
- Enable only a fixed low-risk GET capability allowlist through the existing local-admin read proxy; privileged actions remain blocked without real owner authorization.
- Make the Task and Kingdom panels explain/disallow unsupported write actions.
- Add regression tests for endpoint methods, read-only transport, and permission decisions.

## Next integration stages — NOT complete in this PR

1. Separate owner-authenticated Kingdom **action** channel with identity-bound, scoped, expiring grants; independent Kingdom policy and human approval; CSRF/replay protection; bounded requests; verification, audit and revocation. **Never turn the local-admin read proxy into a general write proxy.**
2. Canonical durable Task/Run identity + lifecycle + event stream shared by Segmentor, Tasks, Workflows, Skills, mobile and Devices; observe real Kingdom task state and reconcile after reconnect.
3. Kingdom-backed memory, skills, workflow and maps interfaces where supported. Preserve explicitly offline/local-only data and scope; no new duplicate authoritative database.
4. Native Debian file operations and diagnostics through separately authorized capabilities, not a simulated browser demo.
5. Cohesive everyday desktop UX: Segmentor first; simple Home/Files/Tasks/Devices/Settings; power-user screens optional. Dark/blue/red tokens; accessible and 4GB low-power.
6. End-to-end tests against actual Kingdom on DT1/Laptop 2: submit → approve → worker → verify → result → reconnect; error/rollback and compromised-node cases.
7. Revalidate PR #143, installable release artifacts, app/ISO/mobile truth, updates and recovery before declaring daily-driver release.

## Acceptance

Required CI typecheck, tests, build, and real fresh-install/Kingdom integration evidence. This PR is code reviewed, **not** a proof that the complete Centipede OS is ship-ready.

## Second-phase read-only integration

The separate `feat/kingdom-live-data-cohesion-20261119` branch reads real Kingdom memory and skill lifecycle state. It labels the browser's local memory and demonstration skill state separately, and does not grant any privileged skill, memory write, or task authority.

## Third-phase local owner task channel

The local desktop now has a separate, explicit owner-unlocked task submit/cancel channel with a bounded request surface and real upstream confirmation. Segmentor and Tasks use that channel; read-only views remain GET-only. This is not a general execution proxy, cross-machine test proof, installer completion, or remote phone capability. See [owner task design](KINGDOM_OWNER_TASK_CHANNEL.md).

## Workspace task handoff

The Workspace UI now uses the same authenticated owner task action channel as Segmentor and Tasks, and displays genuine Kingdom task list state. The local WorkflowEngine and integration catalog remain examples rather than authoritative runtime state. Full workflow-run execution, verified worker output, mobile handoff and durable reconciliation remain blocked pending real Kingdom testing.
