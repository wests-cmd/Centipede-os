# CENTIPEDE OS — SHIP REALITY MATRIX

**Public release:** Centipede `1.0.0` (`package.json`)
**Desktop refresh merge:** `f17a9365f223572dc0ea411dfbfdf214eee3ed5a`
**Kingdom compatibility:** protocol major `1`; contract version `1.4.0`
**Authoritative target gates:** [`release/targets.json`](../release/targets.json)

> This is the current source for release and OS-completion status. Older readiness reports that describe a disk installer, full system recovery, automatic updates, or automatic rollback are historical claims and are not evidence that those features exist.

| Target | What actually exists | Gate | Publication status |
|---|---|---|---|
| Desktop web bundle | React/Vite app; tarball published in v1.0.0 | BUILDABLE | The updated desktop design is on `main`, but only the earlier bundle is published. |
| Bootable ISO | Debian live-build hybrid amd64 ISO; QEMU reached the refreshed desktop readiness marker | BUILDABLE | v1.0.0 image is public. Updated image built in [platform run 36805229329](https://github.com/wests-cmd/Centipede-os/actions/runs/36805229329), not yet in a new release. |
| Live USB | Same hybrid ISO bytes as the ISO asset | BUILDABLE | v1.0.0 image is public. Updated output is validated but unpublished. Flashing it erases the selected USB. |
| VM image | QEMU qcow2 virtual optical-media image; structural and guest boot checks pass | BUILDABLE | v1.0.0 image is public. Updated output is validated but unpublished. Attach it as virtual CD media; it is not an installed hard disk. |
| Docker image | Centipede web app container; HTTP/CSS/health check passed | BUILDABLE | v1.0.0 archive is public. The updated image is CI-only and is not pushed to a registry. It does not include Kingdom. |
| Android | Capacitor project; debug APK built and verified in CI | BLOCKED for stable distribution | No signed release APK. Signing keystore, pinned certificate fingerprint, and explicit workflow enablement are needed. |
| iOS | Capacitor project; iOS Simulator app launched in CI | BLOCKED for device distribution | Simulator build is not installable on iPhone. Apple distribution signing/provisioning and explicit enablement are needed. |
| Kingdom service | Separate project and deployment | EXTERNAL | No live Kingdom deployment was connected for the platform build. |

The successful current-main candidate checks ran on PR source commit `1f99f79eddb3dd06bd86dbc55074b20993f87d0b`; that source was merged as `f17a9365f223572dc0ea411dfbfdf214eee3ed5a`. CodeQL and primary CI passed. A separate Copilot reviewer failed before analysis because its configured model was unsupported. That result is not a clean review; it reported no source finding.

The current images are live boot media. They do not install to an internal drive and do not provide a disk installer or persistent user storage. The refreshed ISO/USB/VM build artifact is approximately 3.35 GB combined. See the [beginner USB guide](INSTALLATION_GUIDE.md) before writing the image to removable media.

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
| User-facing health screen | **OPEN** | Runtime/status panels expose some service information. | Add a simple health page that reports verified system, storage, network, security, Kingdom, Segmentor, skills, and update state with links to actionable fixes. |

The Centipede release must continue to identify its Linux base, live-only behavior, hardware limits, external Kingdom dependency, and unsigned/blocked platform targets until the corresponding rows have reproducible evidence and are updated here.
