# CENTIPEDE OS — SHIP REALITY MATRIX

**Public release:** Centipede `1.0.0`; unpublished `1.0.1` candidate (`package.json`)
**Latest candidate source:** `247aa713aec66e6c86b93ac56bb8cda9515d8095` on PR [#119](https://github.com/wests-cmd/Centipede-os/pull/119)
**Latest platform build:** [run 37889670497](https://github.com/wests-cmd/Centipede-os/actions/runs/37889670497) — success
**Stable publication gate:** BLOCKED pending a separate disposable-disk install and reboot test
**Kingdom compatibility:** protocol major `1`; contract version `1.4.0`
**Authoritative target gates:** [`release/targets.json`](../release/targets.json)

> This is the current source for release and OS-completion status. Older readiness reports that describe a disk installer, full system recovery, automatic updates, or automatic rollback are historical claims and are not evidence that those features exist.

| Target | What actually exists | Gate | Publication status |
|---|---|---|---|
| Desktop web bundle | React/Vite app; v1.0.1 candidate built | BUILDABLE | Current PR CI typecheck, unit/security tests, browser flows, and release build passed. Candidate remains unpublished. |
| Bootable ISO | Hybrid amd64 live system with Centipede branding and guarded Calamares installer | BUILDABLE | Run 37889670497 built the ISO and passed BIOS normal/safe plus signed UEFI normal/safe desktop readiness checks. Installer-to-separate-disk and reboot validation remains open; v1.0.0 is still the public release. |
| Live USB | Byte-identical copy of the hybrid ISO | BUILDABLE | Run 37889670497 verified the USB image bytes against the ISO. It has not been written to physical media in this run. Writing erases the selected removable drive. |
| VM image | QEMU qcow2 optical-media image | BUILDABLE | Run 37889670497 passed structural checks and booted the guest desktop. This is virtual CD media, not an installed-system disk. |
| Docker image | Centipede web app container | BUILDABLE | Run 37889670497 built and smoke-tested HTTP/health. It does not contain Kingdom and did not validate a live Kingdom connection. |
| Android | Capacitor debug APK | BLOCKED for stable distribution | Current branch build and emulator validation passed, but the signed stable-release APK job was skipped. Retained signing key, pinned certificate, and explicit release enablement must be verified before publication. |
| iOS | Capacitor iOS Simulator app | BLOCKED for device distribution | Current simulator build and launch smoke passed. No signed iPhone IPA was produced; Apple distribution signing/provisioning is required. |
| Kingdom service | Separate project and deployment | EXTERNAL | Kingdom is not part of the Centipede image/container. Current CI used a contract fixture for UI tests; it did not prove a live Kingdom deployment or task execution. |

## v1.0.1 branded disk-installer candidate

The current branch adds Calamares to the Centipede live image as a guided disk installer. Its configuration requires an explicit target choice, starts without a partition operation preselected, displays a final install confirmation, requires 32 GiB of storage and 2 GiB of RAM, and attempts to make the live boot disk read-only before Calamares enumerates install targets. If source-media identification or write protection fails, the installer exits without opening Calamares.

The latest candidate build in run 37889670497 includes the Centipede artwork and task workspace. Its exact ISO passed BIOS and UEFI normal/safe graphics boot-to-desktop checks. Calamares is present, and its launcher is configured to make the live source media read-only before it opens. However, no end-to-end install onto a separate disposable virtual disk, installed-system reboot, or observation that the live source is absent from Calamares' target list has been recorded. The global stable gate therefore remains **BLOCKED**. Do not use a candidate installer on a real drive.

The live system and current installer do not implement automatic graphics fallback, low-memory mode, diagnostics export, interrupted-install recovery, installed-system updates, or update rollback. Review the [disk installation guide](INSTALLATION_GUIDE.md) and [installer limits](DISK_INSTALLATION_GUIDE.md); back up data before any install.

The latest candidate build checks ran on PR source commit `247aa713aec66e6c86b93ac56bb8cda9515d8095`. Primary CI, CodeQL, platform builds, QEMU boot tests, and release build passed. The separate Copilot security-review job did not complete its analysis because its service returned HTTP 402 for exhausted monthly quota; it produced no source findings, so it is not a completed security review. Android signed-release and iOS device IPA jobs were skipped. No new release was published.

The currently published v1.0.0 images are live boot media. They do not install to an internal drive or provide persistent user storage. The latest candidate ISO/USB/VM artifact is available only from the platform workflow run; it is not a public release. See the [beginner USB guide](INSTALLATION_GUIDE.md) before writing the image to removable media.

## Q-Man daily-driver completion checklist

These checks define the larger goal of a daily-driver operating environment. They are separate from the narrower v1.0.0 artifact release gate above. `PARTIAL` means there is some implementation, but the complete user outcome has not been demonstrated.

| Area | Status | What is proven now | What must be added or demonstrated to close it |
|---|---|---|---|
| Bootable live system | **PASS — x86_64 live media** | Hybrid ISO boots in QEMU and can be written to USB. | Verify supported physical hardware coverage; publish each new image only after the release gate passes. |
| Persistent installer and recovery boot | **OPEN** | The image runs as a temporary live session. | Safe disk detection/partitioning, optional encryption, account and locale setup, bootloader install, failure recovery, reinstall/uninstall path, and a recovery boot entry. Persist user data across restart. |
| Desktop shell | **PARTIAL** | Centipede web shell runs in an XFCE desktop; the refreshed image includes common desktop apps. | Demonstrate the complete supported shell experience, including window/workspace behavior, notifications, keyboard and accessibility support, and multi-monitor behavior. Separate base-desktop capabilities from Centipede features in release claims. |
| Segmentor task workflow | **PARTIAL** | Planning, permissions, approvals, and task interfaces exist. | Demonstrate a real everyday request end-to-end: inspect, propose a plan, obtain required approval, execute through Kingdom, verify effects, and report accurately. |
| Real filesystem operations | **PARTIAL** | Files-related UI and permission boundaries exist. | Prove read/write/move/copy/rename/delete/search on real user-selected files through the authorized execution path; destructive changes must require approval and have verifiable results. |
| Everyday applications | **PARTIAL** | Browser and selected free Linux desktop apps are available in the build configuration. | Publish the refreshed image and verify first launch, offline behavior, file handoff, updates, and removal for each app advertised as included. |
| Networking | **PARTIAL** | The Linux base supplies network support; the companion can use the running service on a LAN. | Verify Wi-Fi, Ethernet, Bluetooth, VPN, DNS/firewall diagnosis, permission boundaries, and device discovery on supported hardware. Clearly report unavailable services. |
| Hardware and power truth | **PARTIAL** | CPU/memory recommendations no longer default to guessed machine specs. Browser storage quota is identified separately from physical disk; invented disk pressure and category breakdowns were removed. Runtime service status reports `UNKNOWN` unless probed. | Add a trusted native host telemetry path and validate CPU, memory, storage, GPU, battery, temperature, audio, camera, USB, and display values on physical devices. Disk-space preflight is unavailable until then. |
| Offline operation | **PARTIAL** | The web app can show a disconnected Kingdom state. | Demonstrate boot, core desktop, local files/apps/settings, and security behavior without Internet or Kingdom; clearly disable and explain cloud-only features. |
| Local and cloud model routing | **PARTIAL** | Model/provider abstractions exist in the application. | Prove a free local model can be installed, discovered, selected, and used on stated hardware; test offline fallback and show resource requirements. Keep model output non-authoritative. |
| Recovery and rollback | **OPEN** | Existing security and state-reconciliation code does not constitute OS recovery. | Build a bootable safe/recovery mode, configuration restore, known-good system rollback, and tested recovery from interrupted update and corrupted state. |
| Verified system updates | **OPEN** | Release CI builds and hashes artifacts; that is not an installed-OS update service. The Kingdom update panel now states that it does not install or roll back software. | Add a trusted signed release feed, compatibility checks, verified downloads, a recovery point, health check after restart, and a real rollback test. Do not claim update/rollback before tests prove them. |
| System truth layer | **PARTIAL** | Kingdom connection/version states and provenance types exist. | Use one consistent state model for real, verified, connected, degraded, offline, simulated, planned, unavailable, and error states across system panels. |
| User-facing health screen | **PARTIAL** | Centipede Doctor reports app, browser network, live Kingdom connection/runtime/compatibility, and model catalog endpoint state. Host storage/resources, security, Segmentor, skills, updates, and recovery checks are unavailable or not configured. Accessibility settings now add saved display/input preferences and opt-in speech for final AI responses. | Add trusted host diagnostics, the remaining subsystem checks, complete accessibility support, safe repair planning, and action links; verify each on supported installs. |

The Centipede release must continue to identify its Linux base, live-only behavior, hardware limits, external Kingdom dependency, and unsigned/blocked platform targets until the corresponding rows have reproducible evidence and are updated here.
