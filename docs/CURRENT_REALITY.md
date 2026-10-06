# Centipede OS release reality

> Current release gates are maintained in [SHIP_REALITY_MATRIX.md](SHIP_REALITY_MATRIX.md); the full supplied checklist and its implementation status are tracked in [MASTER_RELEASE_EXECUTION_CHECKLIST.md](MASTER_RELEASE_EXECUTION_CHECKLIST.md) and [MASTER_RELEASE_EXECUTION_STATUS.md](MASTER_RELEASE_EXECUTION_STATUS.md). Historical readiness documents may contain outdated completion claims and do not override those records or current code.

## Current release update — 2026-10-06

The current public stable release is [`v1.0.0`](https://github.com/wests-cmd/Centipede-os/releases/tag/v1.0.0). Release candidate [`v1.0.1-rc.3`](https://github.com/wests-cmd/Centipede-os/releases/tag/v1.0.1-rc.3) is published but is not the recommended download. The `v1.0.1-rc.4` image build was stopped before publication: QEMU showed a Debian splash/menu and a generic XFCE desktop, and the desktop readiness marker was missing. That visible result does not meet the Centipede product identity requirement.

The current branch fixes the BIOS menu renderer/title/artwork, sets the live account display name to Centipede OS, applies the classic dark wallpaper to live sessions, and starts the web desktop from the live account profile. These changes still need a fresh exact-image build and visual BIOS/UEFI review. Do not publish the candidate until those checks pass. The installer remains live-preview-only until it has been installed onto a separate disposable VM disk, rebooted, and passed source-media protection checks. Android signed APK and iOS device IPA remain blocked because distribution signing is not configured.

The target descriptions in the historical sections below record earlier audits and CI runs; for current downloadable artifacts and gate status, use this update and the linked live [ship reality matrix](SHIP_REALITY_MATRIX.md).

**Core version:** `package.json` (`1.0.0`)
**Public stable release:** [`v1.0.0`](https://github.com/wests-cmd/Centipede-os/releases/tag/v1.0.0)
**Desktop refresh merge:** `f17a9365f223572dc0ea411dfbfdf214eee3ed5a`
**Kingdom compatibility:** protocol major `1`; contract version `1.4.0`; Kingdom is a separate service.

## Published release versus current main

The public v1.0.0 download remains the release built at commit `e0051a65656cf7678d3d5d814243c0e3a5f44cae`. It contains the original XFCE/Chromium desktop. It does not contain the refreshed home screen and everyday app bundle now present on `main`.

The refreshed desktop work was validated on PR commit `1f99f79eddb3dd06bd86dbc55074b20993f87d0b` before it was merged. Platform build run [36805229329](https://github.com/wests-cmd/Centipede-os/actions/runs/36805229329) built the live ISO, byte-identical USB image, QEMU qcow2, Docker image, Android debug APK, and iOS Simulator app. QEMU reached the desktop readiness marker; Docker's HTTP/health smoke test passed; the iPhone Simulator launched the app. The merged source still needs a new version tag and release publication before those updated images become downloads from the stable release page.

The primary CI and CodeQL checks passed on the PR head. The separate Copilot security-review job failed before it could review the code because the configured model was unsupported; it reported no source findings. Android signed APK and iPhone IPA jobs were skipped because publisher signing is not configured.

## Boot recovery candidate

A boot/recovery workstream was merged from PR [#117](https://github.com/wests-cmd/Centipede-os/pull/117) as `dbc95eed00d51d91709b392431a9ce5998813171`. Platform workflow [37413139746](https://github.com/wests-cmd/Centipede-os/actions/runs/37413139746) built the exact ISO, Live USB copy, and QEMU disk, then passed BIOS normal, BIOS Safe Graphics, signed UEFI normal, and signed UEFI Safe Graphics boot-to-desktop checks. The run also uploaded QEMU screenshots and serial logs. These candidate artifacts are **not a new public stable release**. The user's physical PC/monitor has not been retested, and the broader recovery gaps are listed in [BOOT_RECOVERY_CHECKLIST.md](BOOT_RECOVERY_CHECKLIST.md).
## Target status

| Target | Gate | Current public status | Current main evidence |
|---|---|---|---|
| Desktop web bundle | BUILDABLE | v1.0.0 bundle published | Updated home screen is merged; a new tagged release is still needed. |
| ISO | BUILDABLE | v1.0.0 ISO published | Updated live ISO built in run 36805229329; not published as a new release. |
| Live USB | BUILDABLE | v1.0.0 image published | Updated ISO is byte-identical to the USB output; not published as a new release. |
| VM | BUILDABLE | v1.0.0 qcow2 published | Updated QEMU media passed structural and boot-readiness checks; not published as a new release. |
| Docker | BUILDABLE | v1.0.0 archive published | Updated Linux/amd64 image passed its HTTP and health smoke test; not published as a new release or registry image. |
| Android | BLOCKED for stable distribution | No signed release APK | Debug APK build passed; retained signing key, pinned publisher certificate, and explicit enablement are required. |
| iOS | BLOCKED for device distribution | No signed iPhone IPA | iOS Simulator app passed launch smoke; Apple distribution signing/provisioning and explicit enablement are required. |
| Kingdom service | PARTIAL | Server-side read-only proxy to an external service | This local audit connected through the Centipede proxy to a Docker Kingdom service and read its actual v1TAS/protocol 1.4 status, Knight list, models, and security status. The service reported `running=false`, no Ollama models, and no OpenAI-compatible provider. No task was submitted or runtime started. |

The platform run 37413139746 ISO/USB/VM workflow artifact was about 4.66 GB combined. The bundle includes the ISO, a byte-identical USB copy, and a QEMU disk image; download only the needed ISO if storage or bandwidth is limited. The image includes free everyday apps, which increase download size.

## User-facing install limits

The published and candidate images are live systems. They boot from USB and run in memory; they do not install to an internal drive, provide disk partitioning, or promise persistent files across restarts. The current installation guide explains this before the writing steps. The image has a limited firmware set and is not verified on every PC model. It does not install Kingdom or grant Centipede control of the host PC.

The browser companion creates and confirms short-lived phone pairing codes through a shared server process. Pair-code creation and device administration require a loopback peer and a localhost request host; browser Origin and Fetch Metadata checks reject cross-origin requests as additional CSRF/DNS-rebinding defenses. Request headers alone cannot grant authority. A paired phone can revoke its own session but cannot revoke another device. Pairing state is in memory and pairing uses plain HTTP, so it must stay on a private, trusted network. Docker/reverse-proxy host administration has not been certified and may be unavailable when the API sees a bridge/proxy address instead of loopback. Mobile task and approval workflows are not implemented. Android/iOS projects remain WebView shells and do not provide signed phone distribution. The Kingdom proxy keeps `KINGDOM_API_TOKEN` server-side and permits only allowlisted GET endpoints from localhost; task submissions and privileged changes are not forwarded. Live data is verified only for the configured deployment used during an explicit integration test, not as a claim about other Kingdom services.

The Kingdom Update Center previously displayed an invented patch version and release notes, then displayed success or rollback states without downloading or applying a package. The current implementation removes those fake controls and reports the actual connection/version state, while stating that Centipede does not install or roll back Kingdom software. The browser client now detects same-line patch versions and refreshes automatically; major/minor changes prompt first. This only reloads browser assets from a server that already serves the newer build. No installed-OS updater, image download/verification, installer, rollback, or boot recovery mode is provided.

Runtime service telemetry no longer claims fixed Centipede/Kingdom/model health or a fabricated 2 ms latency. Services report `UNKNOWN` until an actual health probe supplies evidence; this does not replace live Kingdom adapter connection state.

Browser storage quota is not host disk capacity. Runtime detection no longer manufactures disk pressure, per-directory usage, or an emergency-storage signal; Centipede therefore has no verified host-disk preflight in this app build. Profile suggestions use available CPU/memory reports and make their heuristic limits explicit instead of filling missing values with a guessed 4-core/8-GB/128-GB machine.
