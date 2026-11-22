# System Command Center: user visibility, truth and recovery (2026-11-21)

## What is now implemented

Centipede includes a **System Command Center**, accessible from Home, the desktop sidebar and mobile-sized dock. It offers **Everyday / Advanced / Owner** perspectives on the SAME observed state, rather than a second executor, scheduler, task database, approval authority, or audit log. Its 16 surface areas are:

| Area | Source currently available | Explicit limitations |
|---|---|---|
| Computer | Local-only read-only Bun host telemetry | A measured Linux kernel view is not certification of a physical OS or container isolation |
| CPU & memory | Two real CPU samples, Linux MemAvailable and Bun process RSS | First CPU sample is unknown; total Chromium/Kingdom/OS RSS not provided |
| Segmentor | Kingdom connection state | Does not demonstrate permission to execute or verified completed work |
| Kingdom | KingdomAdapter state | Connection alone is not capability negotiation / remote task proof |
| Tasks | Kingdom canonical /tasks list | Task completion is *reported*, not independently verified here |
| Connected computers | Kingdom /security/permissions nodes | Registration and active flags are upstream reports, not active ping or hardware test |
| Agents/models | Kingdom /models | No GGUF loaded, benchmarked, or executed by this dashboard |
| Security & approvals | Kingdom /security/status and /security/approvals | All approvals remain in Kingdom's existing authenticated workflow |
| Files & storage | Service filesystem free bytes if supported | Only the server working volume; no universal storage claims or bypass of locked Files broker |
| Network | Browser onLine hint and Kingdom connection separately | onLine is NOT internet reachability |
| Updates | Shipped browser client version | Does NOT determine host OS, Docker, or Kingdom update/rollback status |
| Backups & recovery | None | Always clearly **Not verified** until restored data is proven |
| Skills & apps | Kingdom /skills | A listed skill is not approved, installed everywhere, safe, or executed |
| Notifications | Bounded derived inbox | Does NOT pretend to be a durable security/audit log |
| System history | Kingdom /events and browser-session connection transitions | Browser transitions are disposable and never represented as signed audit |
| Privacy & permissions | Link to existing capture/permission UI | Does not silently inspect camera, microphone or screen |

### Format and interaction

The Home page provides a short status strip and a direct Command Center entry. **Everyday** shows six high-level cards and actionable alerts, while **Advanced** expands to all 16 cards, two small bounded resource sparklines and recent Kingdom task/event IDs. **Owner** adds a read-only preview of existing Kingdom audit decisions after the existing owner-action UI is unlocked; no permission is granted by switching views. Each card shows a value, explanation, source, observation/uncertainty state and an action leading to the existing relevant screen.

Alerts always answer: what happened, impact, what Centipede did, suggested next step and linked screen. No invented success messages, host scores or synthetic task timeline. A reported completed Kingdom task is never relabeled independently verified.

## Local telemetry security

`GET /api/v1/visibility/host` is a new **read-only, loopback-peer and same-origin operator-only** endpoint through the existing `isLocalAdminRequest()` checks. Remote phones, LAN clients and cross-origin requests cannot read it; non-GET methods return 405. It uses `node:os`, `/proc/meminfo` on Linux and `statfsSync()` only, without shell execution, password extraction, process enumeration, file modification or agent commands.

Returned fields are intentionally restricted to kernel memory, snapshot CPU percentage, server process RSS, uptime and available bytes on the service working filesystem. It never returns paths, usernames, file contents, process lists, command lines, secrets, credentials or environment variables. A Docker instance may expose host-level kernel metrics: the response and UI explicitly label this **local server kernel view** rather than whole-machine/cgroup memory accounting.

### Efficiency and data retention

Only a mounted, visible Command Center polls the host and Kingdom, at a **20-second interval**. The first CPU reading is unknown until two kernel samples exist. A maximum of 24 performance samples and 20 local browser connection transitions live in React memory, disappear on unmount, and are never uploaded or persisted as an audit trail. Normal Centipede heartbeat behavior is unchanged.

### Human-facing correctness rules

1. An unavailable, expired or unauthorized measurement shows **Not verified**, not 0%, healthy or a simulated value.
2. A disconnected Kingdom makes remote task counts and audit records unknown; cached task statuses are cleared.
3. No host telemetry is exposed to mobile clients or to arbitrary LAN requests.
4. Never confuse a software-build browser benchmark with actual Laptop 2/DT1 measurements.
5. A task ID/status is a Kingdom report; verified execution still needs a signed result and approved worker evidence.
6. Switching to Owner mode does not unlock privileged tasks or approve anything; the existing owner gate remains mandatory.

## Testing

- `tests/unit/system_visibility.test.ts`: all 16 status records, disconnection fail-closed behavior, stale CPU/RAM data, low-memory warnings, and authenticated read-only telemetry denial/allowance.
- `tests/e2e/visibility.playwright.ts`: first-run user journey to the real Command Center; six ordinary cards, sixteen advanced cards, attention inbox, owner-locked audit, Doctor navigation and 390px mobile-sized layout.
- The existing Windows/Ubuntu typecheck, Vitest/Bun tests, browser E2E, CodeQL, packaged HTTP smoke tests and strict reality lint remain required.

## Still blocked for an actual certified daily-driver

Centipede requires an instrumented **physical** 4 GiB dual-core boot, measured total system and per-process memory pressure for 24 hours, a real paired DT1/Laptop 2 Kingdom task plus malicious-worker revocation, signed backup/restore and interrupted-update rollback, verified native signed phones and actual camera/mic permission tests. The Command Center cannot solve those system-level and deployment gates by adding UI; see `PHYSICAL_ACCEPTANCE.md` and [issue #150](https://github.com/wests-cmd/Centipede-os/issues/150).

The release remains a preview until those claims have independent evidence.
