# Centipede OS release reality

> Current release gates are maintained in [SHIP_REALITY_MATRIX.md](SHIP_REALITY_MATRIX.md); the full supplied checklist and its implementation status are tracked in [MASTER_RELEASE_EXECUTION_CHECKLIST.md](MASTER_RELEASE_EXECUTION_CHECKLIST.md) and [MASTER_RELEASE_EXECUTION_STATUS.md](MASTER_RELEASE_EXECUTION_STATUS.md). Historical readiness documents may contain outdated completion claims and do not override those records or current code.

**Core version:** `package.json` (`1.0.0`)
**Public stable release:** [`v1.0.0`](https://github.com/wests-cmd/Centipede-os/releases/tag/v1.0.0)
**Desktop refresh merge:** `f17a9365f223572dc0ea411dfbfdf214eee3ed5a`
**Kingdom compatibility:** protocol major `1`; contract version `1.4.0`; Kingdom is a separate service.

## Published release versus current main

The public v1.0.0 download remains the release built at commit `e0051a65656cf7678d3d5d814243c0e3a5f44cae`. It contains the original XFCE/Chromium desktop. It does not contain the refreshed home screen and everyday app bundle now present on `main`.

The refreshed desktop work was validated on PR commit `1f99f79eddb3dd06bd86dbc55074b20993f87d0b` before it was merged. Platform build run [36805229329](https://github.com/wests-cmd/Centipede-os/actions/runs/36805229329) built the Debian ISO, byte-identical USB image, QEMU qcow2, Docker image, Android debug APK, and iOS Simulator app. QEMU reached the desktop readiness marker; Docker's HTTP/health smoke test passed; the iPhone Simulator launched the app. The merged source still needs a new version tag and release publication before those updated images become downloads from the stable release page.

The primary CI and CodeQL checks passed on the PR head. The separate Copilot security-review job failed before it could review the code because the configured model was unsupported; it reported no source findings. Android signed APK and iPhone IPA jobs were skipped because publisher signing is not configured.

## Target status

| Target | Gate | Current public status | Current main evidence |
|---|---|---|---|
| Desktop web bundle | BUILDABLE | v1.0.0 bundle published | Updated home screen is merged; a new tagged release is still needed. |
| ISO | BUILDABLE | v1.0.0 ISO published | Updated Debian live ISO built in run 36805229329; not published as a new release. |
| Live USB | BUILDABLE | v1.0.0 image published | Updated ISO is byte-identical to the USB output; not published as a new release. |
| VM | BUILDABLE | v1.0.0 qcow2 published | Updated QEMU media passed structural and boot-readiness checks; not published as a new release. |
| Docker | BUILDABLE | v1.0.0 archive published | Updated Linux/amd64 image passed its HTTP and health smoke test; not published as a new release or registry image. |
| Android | BLOCKED for stable distribution | No signed release APK | Debug APK build passed; retained signing key, pinned publisher certificate, and explicit enablement are required. |
| iOS | BLOCKED for device distribution | No signed iPhone IPA | iOS Simulator app passed launch smoke; Apple distribution signing/provisioning and explicit enablement are required. |
| Kingdom service | EXTERNAL | Not supplied by this repository | No live Kingdom deployment was connected during these builds. |

The branch workflow artifact for ISO/USB/VM was about 3.35 GB combined. Its three image files duplicate the ISO for USB and package it as QEMU media. The image includes free everyday apps, which increase download size.

## User-facing install limits

The published and candidate images are live systems. They boot from USB and run in memory; they do not install to an internal drive, provide disk partitioning, or promise persistent files across restarts. The current installation guide explains this before the writing steps. The image has a limited firmware set and is not verified on every PC model. It does not install Kingdom or grant Centipede control of the host PC.

The browser companion creates and confirms short-lived phone pairing codes through a shared server process. Pair-code creation and device administration require the API transport to report a loopback peer; browser-supplied `Host` or `Sec-Fetch-Site` headers cannot grant that authority. A paired phone can revoke its own session but cannot revoke another device. Pairing state is in memory and pairing uses plain HTTP, so it must stay on a private, trusted network. Docker/reverse-proxy host administration has not been certified and may be unavailable when the API sees a bridge/proxy address instead of loopback. Mobile task and approval workflows are not implemented. Android/iOS projects remain WebView shells and do not provide signed phone distribution. The Kingdom client only reports a verified connection when configured against an actual external endpoint; this CI did not test a deployed Kingdom service.

The Kingdom Update Center previously displayed an invented patch version and release notes, then displayed success or rollback states without downloading or applying a package. The current implementation removes those fake controls and reports the actual connection/version state, while stating that Centipede does not install or roll back Kingdom software. No Centipede OS installer, system updater, or boot recovery mode is currently provided.

Runtime service telemetry no longer claims fixed Centipede/Kingdom/model health or a fabricated 2 ms latency. Services report `UNKNOWN` until an actual health probe supplies evidence; this does not replace live Kingdom adapter connection state.

Browser storage quota is not host disk capacity. Runtime detection no longer manufactures disk pressure, per-directory usage, or an emergency-storage signal; Centipede therefore has no verified host-disk preflight in this app build. Profile suggestions use available CPU/memory reports and make their heuristic limits explicit instead of filling missing values with a guessed 4-core/8-GB/128-GB machine.
