# Project status and roadmap

Audit: 2026-10-27, source snapshot `7acda98`. This summary navigates current code, target decisions and scoped evidence; it is not a fleet/deployment certification.

## Published versus source

The latest public stable release verified in the release listing is [v1.0.0](https://github.com/wests-cmd/Centipede-os/releases/tag/v1.0.0), published 2026-09-30 with 12 assets. [package.json](../package.json) also declares 1.0.0; that does not make current-main changes part of those earlier published bytes.

| Area | Source reality | Remaining boundary |
| --- | --- | --- |
| Web desktop | React/Vite UI and Bun hosting/API | Refreshed source differs from original stable assets |
| Debian ISO/USB | Bookworm amd64 live-build, XFCE/Chromium/everyday apps and Safe Graphics configuration | Exact new release artifacts and physical compatibility need verification |
| VM | Converted live optical-media qcow2 | Not an installed persistent hard disk |
| Docker | Non-root Bun app/container health check | Not the Debian desktop or Kingdom |
| Android | Capacitor/debug validation path | Stable target BLOCKED until signing, publisher identity and explicit enablement |
| iOS | Capacitor/Simulator validation path | Device distribution BLOCKED until Apple signing/provisioning |
| Kingdom observation | Optional local-admin GET proxy and bounded peer/local summaries | Real separate backend required; no execution authority |
| Local inference | Safety harness and baseline instructions | No bundled model/runtime or proven hardware speedup |
| Installed-system operation | Live boot and limited build/recovery mechanisms | No supported persistent installer, signed installed-OS updater or automatic rollback |

Detailed references: [target manifest](../release/targets.json), [ship reality matrix](SHIP_REALITY_MATRIX.md), [earlier reality record](CURRENT_REALITY.md), [boot checklist](BOOT_RECOVERY_CHECKLIST.md). Old report titles do not close current gates.

## Highest-impact remaining work

1. Validate actual hardware: graphics, Wi-Fi, Secure Boot, low-memory/offline use and power behavior.
2. Resolve the static live-image server versus Bun API seam before promising default image pairing/proxy behavior.
3. Establish a separately reviewed persistent installation/recovery path with exact-target confirmation, boot-media exclusion and interrupted-operation tests.
4. Independently test installed-OS artifact authenticity, update staging, activation and rollback.
5. Finish signed Android/iPhone distribution and real-device interactions.
6. Demonstrate task-specific workflows against an actual authorized Kingdom deployment, separating proposals, execution and verified results.
7. Validate trusted native resource/storage telemetry and measure inference on the actual target.
8. Evaluate future visuals, selectable/animated backgrounds and additional transports with explicit low-memory, security and hardware criteria.

Draft visual/transport/autonomy proposals are not treated as merged features here. This documentation audit changes no task-completion state or installed computer.

## Completion evidence

Keep separate: implemented source; local checks; CI artifact; published release; installed device; physical/runtime verification. Record revision, input/hash, environment and outcome. A screenshot, one health response or model explanation cannot replace those stages.

The [gap register](MASTER_GAP_REGISTER.md), [release checklist](MASTER_RELEASE_EXECUTION_CHECKLIST.md) and [execution status](MASTER_RELEASE_EXECUTION_STATUS.md) retain detailed work and historical evidence. Review their dates and source scope before promoting a completion claim.
