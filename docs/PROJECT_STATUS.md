# Project status and roadmap

Status reviewed 2026-10-28. This summary navigates source, target decisions and scoped evidence; it is not a fleet/deployment certification. The earlier documentation audit used the 2026-10-27 snapshot `7acda98`.

## Published versus source

The latest public stable release verified in the release listing is [v1.0.0](https://github.com/wests-cmd/Centipede-os/releases/tag/v1.0.0), published 2026-09-30 with 12 assets. [package.json](../package.json) also declares 1.0.0; that does not make current-main changes part of those earlier published bytes.

Main includes [PR #136](https://github.com/wests-cmd/Centipede-os/pull/136)'s device-session authentication and CSPRNG identifier fixes. [PR #137](https://github.com/wests-cmd/Centipede-os/pull/137) is the pending source integration candidate for explicit camera/screen/microphone capture controls, original Centipede artwork, selectable local image/GIF/video backgrounds and optional static boot-menu branding. Its reviewed code head `2fa8c28` passed 209 unit/security tests, seven browser checks, type-check/build, safety fixtures and CodeQL. Capture unit tests inject browser APIs; browser media checks decode actual GIF/WebM fixtures. These results do not prove physical capture hardware, a rebuilt ISO, physical boot, persistent OS installation or an installed-device update. None of this changes the published v1.0.0 assets.

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
8. Complete target-device memory/codec and physical boot acceptance for the tested media/branding source candidate; evaluate additional transports separately with explicit security and hardware criteria.

The media/capture implementation above remains a source candidate pending PR #137's merge; additional transport/autonomy proposals remain separate work. Source integration does not certify a published release or installed computer.

## Completion evidence

Keep separate: implemented source; local checks; CI artifact; published release; installed device; physical/runtime verification. Record revision, input/hash, environment and outcome. A screenshot, one health response or model explanation cannot replace those stages.

The [gap register](MASTER_GAP_REGISTER.md), [release checklist](MASTER_RELEASE_EXECUTION_CHECKLIST.md) and [execution status](MASTER_RELEASE_EXECUTION_STATUS.md) retain detailed work and historical evidence. Review their dates and source scope before promoting a completion claim.
