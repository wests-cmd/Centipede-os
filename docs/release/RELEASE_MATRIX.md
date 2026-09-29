# Centipede OS v1.0.0 Multi-Distribution Release Matrix

**Version**: `1.0.0`
**Authoritative Source**: `release/targets.json` and `release/target-dependencies.json`

---

## Target Matrix

| Target ID | Output Artifact | Architecture | Status | Builder | Verification Method | Update Strategy |
|---|---|---|---|---|---|---|
| **desktop-slim** | `centipede-os-1.0.0-slim-web-bundle.tar.gz` | x86_64 / arm64 | **AVAILABLE** | `scripts/build-release.ts` | Non-empty archive & SHA-256 match & Vite `dist/` | Atomic tarball |
| **desktop-full** | `centipede-os-1.0.0-full-bundle.tar.gz` | x86_64 / arm64 | **AVAILABLE** | `scripts/build-release.ts` | Pre-packaged runtime + Docker Compose + scripts & docs | Atomic tarball |
| **docker** | `docker-compose.yml` | x86_64 / arm64 | **AVAILABLE** | `docker-compose up -d` | HTTP `/status` health check against `scripts/kingdom-server.py` | Docker pull |
| **iso** | `centipede-os-1.0.0.iso` | x86_64 | **PLANNED** | `archiso / mkarchiso` | QEMU headless boot & systemd startup | Raw partition |
| **live-usb** | `centipede-os-1.0.0-live-usb.img` | x86_64 | **PLANNED** | `dd / raw image writer` | EFI bootloader & partition table check | Raw partition |
| **vm** | `centipede-os-1.0.0.qcow2` | x86_64 | **PLANNED** | `qemu-img convert` | QEMU guest launch & API socket check | QCOW2 snapshot |
| **android** | `centipede-os-1.0.0.apk` | arm64-v8a | **PLANNED** | `gradle / Android SDK` | AAPT dump badging & APK signature check | APK installer |
| **ios** | `centipede-os-1.0.0.ipa` | arm64 | **PLANNED** | `xcodebuild archive` | Mach-O executable verification & codesign check | TestFlight / AppStore |

---

## Toolchain & Hardware Dependencies

- **Desktop Slim & Full**: Node.js v22+, Bun v1.2+, Vite v5+, Tar.
- **Docker Stack**: Docker Engine v24+, Docker Compose v2.20+, Python 3.11+.
- **OS Kernel Targets (ISO / USB / VM)**: `archiso`, `qemu-system-x86_64`, `parted` (Planned OS Kernel Milestone).
- **Mobile Native Targets (Android / iOS)**: Android SDK / Gradle, Xcode / xcodebuild (Planned Mobile Native Milestone; Mobile Companion Web Client available now).
