# Centipede OS — daily-driver and autonomous-work release path

**Status:** implementation and acceptance plan, NOT proof of general-availability readiness.
**Base reviewed:** main at 4b3447e156ac523ef47eaed59a62970d21672d63, November 22, 2026.
**Related:** [Master specification](CENTIPEDE_OS_MASTER.md) · [Background harness](BACKGROUND_HARNESS.md) · [Physical acceptance](PHYSICAL_ACCEPTANCE.md) · [Release blockers #150](https://github.com/wests-cmd/Centipede-os/issues/150).

> Centipede is a Debian-based operating environment, with Segmentor in the user-facing shell and Kingdom as a separately deployed execution/security authority. The published v1.0.1-rc.11 ISO, Live USB, VM optical media, Docker and web-bundle assets are experimental previews from commit 63b4b63d7af104cb456a86530e43d16e8b5a699d. They do not install a persistent daily-driver OS or ship the new background harness.

## Definition of done

A person unfamiliar with computers can safely download and install Centipede without a terminal; use Files, Apps, search, networking, audio, power and system settings; work locally when offline; authorize Segmentor actions; connect Kingdom; update and roll back; and run an independent background agent without surrendering the active desktop or granting uncontrolled computer access. All claims must be proven against the exact public artifact.

### On, away, locked, or powered off

- **User closes GUI, locks screen, or signs out while computer stays powered:** an independently supervised, explicitly approved worker may continue.
- **Worker/host restarts:** durable queue survives; interrupted runs are marked UNKNOWN/INTERRUPTED and never blindly replay unknown side effects.
- **This host is powered off:** local work cannot execute. An independently powered, owner-paired Kingdom node may continue after a valid lease handoff, otherwise work remains queued.
- **User is actively using computer:** unattended automation uses its own headless browser, dedicated virtual display or VM. Never reuse the person's mouse, keyboard, clipboard, logged-in browser profile, camera, microphone, or foreground windows.

## Hard boundaries

1. **AI is never authorization.** Segmentor, models, skills, memories, webpages and worker outputs only propose work; Kingdom controls privileged capabilities and approvals.
2. **Autonomy OFF by default.** User approves a scoped goal envelope (resources, destinations, data sensitivity, permissions, expiry, time/compute/network/spending budgets). The agent can then choose the next *within-scope* task without asking every time.
3. **Untrusted page content is data.** Instructions inside pages and tool responses never change permission scopes. No form submission, login, file upload, purchases, host shell, external publishing or arbitrary desktop control in the initial public-web worker.
4. Keep nonroot, read-only container, private state, restrictive seccomp, Chromium sandbox, bounded time/CPU/RAM/PIDs, short-lived local owner authorization, durable audit and emergency stop. Do not add --no-sandbox, privileged mode, SYS_ADMIN, host desktop mounts, Docker socket mounts or blanket network access to "fix" a test.
5. Never mark a simulated or queued action complete. The user-facing result must carry the verified Kingdom task/run identity or explicitly say UNKNOWN/NOT VERIFIED.

## Release gates and acceptance evidence

| Gate | Work | YES only when |
| --- | --- | --- |
| H0 — Isolated worker | Extract worker from conflicting PR #175 onto current main; fix sandboxed Chromium startup and execute durable routines | CI runs actual Chromium with sandbox; owner auth, restart receipts and no host desktop are verified |
| H1 — Quiet resource use | Give worker low CPU shares, one active run, 0.75 CPU cap, 1 GiB memory, 128 PIDs, 30 s per run and admission on host memory/load | Real low-end foreground activity and thermal/latency measurements show acceptable impact |
| H2 — Safe automatic scheduling | Durable approved recurring tasks, dedupe, cancellation, revocation, retention and UNKNOWN recovery | GUI closed does not halt work; restarts never duplicate uncertain side effects |
| H3 — Proactive AI | Owner-approved goals, proposal ranking, bounded planner, deterministic plan validator and Kingdom grant checks | Model cannot create authority or expand original goal; prompt-injection/skill-poisoning tests deny escalation |
| H4 — Separate GUI computer use | Isolated virtual-desktop/VM adapter for owner-approved native app workflows | Automated input affects only isolated display; user input remains untouched; rollback and task receipts pass |
| H5 — Kingdom 1–5 nodes | Signed/identity-bound task leases, worker negotiation, revocation, quarantine and lost-worker reconciliation | DT1/Laptop 2 split/rejoin tests do not double-execute a non-idempotent action |
| OS1 — Everyday work | Real Files/Apps/process lifecycle, network, audio, Bluetooth, display, camera permissions, system truth layer | User performs common tasks without terminal and real changes persist across reboots |
| OS2 — Persistent installer | Distinguish Live USB vs. install-to-disk; graphical disk selection, encryption, bootloader and recovery | Novice installs, removes USB, boots installed disk; untargeted disks stay intact |
| OS3 — OS recovery | Trusted signing, verified manifests, staging/snapshot rollback, backups and safe boot menu | Failed/corrupted/power-interrupted update returns to working OS with unchanged user data |
| GA — Public release | Verified exact-commit builds, installer/guide/video, privacy/license/support, novice + accessibility tests | Full physical-machine and doomsday acceptance, explicit owner GO, honest published artifacts |

### Source file map (existing in the harness integration branch)

- Worker and queue: harness/core.py, harness/service.py, harness/browser.py, harness/browser_task.py, harness/healthcheck.py.
- Isolation and install: Dockerfile.harness, docker-compose.harness.yml, harness/seccomp_profile.json, scripts/setup-harness.py.
- UI and protected API: src/components/BackgroundHarnessApp.tsx, src/api/kingdomActions.ts, src/server/harnessProxy.ts, src/server/routes.ts.
- Authority: existing src/server/kingdomAction.ts and Kingdom adapter; Kingdom remains a separate service. No second, conflicting authoritative scheduler.
- Tests: tests/harness/test_harness.py, tests/unit/background_harness_proxy.test.ts, .github/workflows/background-harness.yml.
- OS and measured acceptance: packaging/live-build/, src/server/hostFiles.ts, scripts/physical-acceptance.py, docs/PHYSICAL_ACCEPTANCE.md.

### Proposed new modules — not implemented yet

- harness/goals.py: structured approved goal envelopes, expiration and revocation; model suggestions never mint capabilities.
- harness/resource_policy.py: trusted host-side admission signals, cgroup accounting, battery/idle evidence and per-device budget policy.
- src/components/AttentionQueue.tsx: unified failures, owner approvals, ambiguous outcomes and system repairs.
- src/server/agentActivity.ts: read-only canonical Kingdom task/run reconciliation.
- tests/harness/test_goal_escalation.py: adversarial scope expansion, authorization replay and injected webpage/tool output.
- Native computer control adapter: separate virtual display/VM with bounded snapshots and independent verifier, not foreground mouse automation.

## Autonomous task lifecycle

1. Owner approves a goal envelope with its exact resources, time limit, risk ceiling, allowed tools, destinations and side effects.
2. Planner proposes a task. Validator compares requested actions to original goal and classifies scope drift deterministically.
3. Kingdom independently checks agent identity, owner policy, device trust, grant, expiry, required approval and resource budget.
4. Task receives canonical ID and bounded single-worker lease. Worker executes only approved primitives inside the isolated environment.
5. Independent verifier checks side effects, stores evidence and reports verified result. Never let natural-language text alone certify success.
6. Retry only idempotent work with stable idempotency keys; otherwise reconcile first. Revoked or expired permissions stop further work.
7. UI surfaces concise results, UNKNOWN outcomes and needs-attention items. Agent-generated ideas go to a proposal queue, not directly into privileged execution.

Required lifecycle: PROPOSED → VALIDATING → WAITING_APPROVAL → QUEUED → LEASED → RUNNING → VERIFYING → SUCCEEDED. Also DENIED, CANCELLED, FAILED, EXPIRED, INTERRUPTED, UNKNOWN, QUARANTINED. Keep original goal, policy version and task identity attached to every transition.

## Performance targets (benchmarks to collect, not claimed passes)

- Minimum target: about 4 GiB RAM, dual-core CPU, 64-bit; low-power visuals, no model loaded by default, only one heavy job across constrained computers.
- Browser worker initially requires at least 1 GiB Linux host MemAvailable and low host load before claiming. CPU shares 128, CPU cap 0.75, 1 GiB cgroup RAM, 128 PIDs and a 30-second watchdog. If under pressure, defer or offload, do not starve the user.
- Measure p95 foreground input latency worker OFF and worker ON on identical hardware. **Goal:** under 15% degradation; if missed, restrict/offload. Also measure swap, thermal, battery, disk I/O and RAM headroom.
- Prove user keyboard/mouse focus never changes during isolated browser/VM jobs; user should be able to stop work instantly.
- Offline desktop, Files, local search and Settings remain usable without a model. Cloud provider selection must be opt-in, privacy-aware and visible.

## D-day tests before public beta

- Forged owner session, expired/revoked grant, prompt injection, hostile browser content, malicious skill/tool description, cross-site request, DNS rebinding, private-IP metadata, oversized payload and SSRF.
- Browser crash, agent restart, machine reboot, network split, revoked Kingdom worker, ambiguous completion, partial data write, duplicate task ID, corrupted SQLite copy.
- Compromised browser cannot access Docker socket, host home, active X11/Wayland, host clipboard, microphone, camera, or privileged service credentials.
- User actively typing and working while background worker operates; monitor CPU, power, desktop responsiveness and thermal limits.
- Bad package signature, signing mismatch, power loss during install/update, disk nearly full, missing bootloader, corrupt config, broken Kingdom, restored user data.
- Actual physical acceptance on DT1 and Laptop 2, clean VM, keyboard-only accessibility and a novice test with no terminal. At least 24 continuous hours on real devices before a public beta, followed by a longer monitored pilot.

## Release and commercial policy

- Keep experimental preview, beta and stable daily driver distinct; publish no phone APK/IPA until signing and device-pairing acceptance pass.
- Release manifest and SHA-256 must match uploaded assets; verify trusted publisher identity, exact commit SHA and true installed runtime behavior. A release builder passing does not prove safe install.
- README should offer one-click links **only to actually existing artifacts**, with device/goal picker and truthful requirements; maintain a narrated installation walkthrough and accessible transcript.
- The current LICENSE is a custom **Kingdom License (CYA License) v2.0** with commercial-use restrictions requiring copyright-holder written approval. The repository owner must choose explicit distribution/commercial licensing, and review third-party packages, model weights, trademarks, privacy and support obligations. Do not claim OSI open-source status for that license.
- Free/community and paid products should share a verified secure runtime; payment, billing and publishing must be outside autonomous default permissions. Add privacy notice, patch policy, responsible-disclosure channel and support readiness before selling.

## Immediate implementation order

1. Keep merged release-integrity, downgrade-protection, display-fit and master-spec work on main; do not overwrite it with the older PR #175 download changes.
2. Validate the rebased worker-only branch and fix all actual Chromium container issues. Pass sandbox launch without privileged Docker, persistent SQLite, owner auth and unknown-result tests.
3. Measure resource noninterference on a ~4 GiB dual-core machine and fail closed where host activity cannot be measured.
4. Implement approved goal-based proposals and Kingdom canonical leases; no model-selected grants.
5. Add isolated native GUI control through separate display/VM, real recovery, persistent installer, and physical device evidence.
6. Complete the GA matrix. If any check is NO, record root cause, file, repair, test and retest. Do not call it shipped.

**Rule: evidence over appearance. This is the path to a usable and sellable operating environment, not an authorization to publish incomplete binaries.**
