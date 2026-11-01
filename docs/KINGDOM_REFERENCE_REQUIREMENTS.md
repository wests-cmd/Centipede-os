# Centipede requirements from the owner's architecture references

## Installed integration update

The installed Centipede host now runs the shared Kingdom request service,
portable project memory, optional browser voice controls and durable schedules.
The receiving-payment adapter is optional and disconnected until an owner
links credentials. Separate installed Kingdoms passed signed peer restart and
remote analysis acceptance through an owner relay. Kingdom's matching delivery
record is docs/SHARED_PLATFORM_DELIVERY.md. These are service updates, not a
reason to rewrite the installed OS disk. Generic offline deployment remains
owner-pinned and keeps credentials and machine addresses out of the package.

External connectors still need adoption of the shared request contract;
merchant checkout/OAuth and direct peer networking remain separate gates.

The five October 16, 2026 screenshots describe one shared assistant backend,
multiple interfaces, tiered routing, portable memory and background automation.
They are references, not installation instructions or proof of implementation.
Kingdom owns those harness features; Centipede supplies the reliable host and
desktop experience. See Kingdom docs/REFERENCE_ARCHITECTURE_BACKLOG.md for R01–R09.

## Delivery checklist

- [ ] C01 Built-in connection/setup: show installed Kingdom health and version;
  open its workspace directly; guide owner connection and optional model/peer
  setup. Avoid requiring hand-written per-user shell commands. Preserve private
  listening defaults, and explain required OS/network approval when applicable.
- [ ] C02 Shared front doors: desktop shell and browser use the same Kingdom
  request IDs, conversations, project scopes and results. Optional voice or
  knowledge-editor plugins connect through the same bridge rather than create
  a second assistant with separate state.
- [ ] C03 Background host reliability: service start after boot, bounded CPU/RAM
  and subprocess supervision, graceful cancellation, durable checkpoints,
  health reporting and restart recovery. Acceptance: reboot while a disposable
  job waits, reconnect, and prove no duplicate side effect.
- [ ] C04 Portable project storage: select local or mounted external storage,
  check availability/permissions, expose readable project notes and backup/
  restore. Keep secrets separate, indexes rebuildable and concurrent writes
  transactional. A missing USB must produce a recovery state, not silent data
  loss or writes to an unintended directory.
- [ ] C05 Independent Kingdom peers: show each computer and its Kingdom identity,
  separately from Apprentices and model connections. Preserve approved peer
  keys and reconnect only after authenticated contact; test changed keys,
  revocation, network interruption and duplicate legacy IDs. A peer online
  badge is not evidence that distributed work completed.
- [ ] C06 Responsive Easy/Advanced desktop: readable narrow/wide layouts,
  keyboard navigation, progress, error/recovery explanations and text-first
  answers. Acceptance: viewport checks and the same job resumed from browser
  and desktop without losing input.
- [ ] C07 Optional voice/connectors: opt-in adapters, text fallback, device and
  permission checks. No mandatory paid hosting, third-party account or specific
  model/harness. Benchmark actual old hardware before enabling heavy workloads.
- [ ] C08 Reproducible shipping: package generic setup and runtime integration;
  keep personal IPs, SSH keys and tokens in owner configuration. Install/upgrade
  tests must preserve owner data and prove rollback and USB-free boot where
  applicable. Existing installed machines must not be silently reinstalled.

Current evidence: the installed Centipede host boots without its installer USB;
Kingdom's service is enabled and its private API/frontend work. The optional
offline service deployment adapter has tests. These foundations do not prove
all checklist items or all hardware combinations are complete. Async I/O can
overlap waiting; CPU-heavy inference still needs capacity or another worker.
