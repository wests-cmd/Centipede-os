# Choose the right Centipede OS download

**Start here:** pick your goal, not a file extension. This page lists only assets actually published in [Centipede v1.0.1-rc.11 (November 22, 2026)](https://github.com/wests-cmd/Centipede-os/releases/tag/v1.0.1-rc.11). The release was built from `63b4b63d7af104cb456a86530e43d16e8b5a699d`. It includes the System Command Center. Later source updates are not yet in this image.

> **Experimental preview, not a verified daily-driver installation.** A bootable Debian live session is not a permanent OS installer. Neither Kingdom nor an autonomous worker is included as a trusted production backend.

## Choose one

| Your goal | Verified published RC11 file | Size | What you actually get |
| --- | --- | --- | --- |
| **1. Try it on an Intel/AMD 64-bit PC with a USB** | **[Live USB — Centipede preview (.iso)](https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.1-rc.11/centipede-os-1.0.1-live-usb-x86_64.iso)** | 1.56 GiB | Hybrid Debian live ISO. Boot it from a spare **8 GB+ USB**. **Flashing will erase the selected USB.** It does not overwrite your internal drive by itself. |
| **2. Try it in VirtualBox or VMware** | **[Virtual machine boot ISO (.iso)](https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.1-rc.11/centipede-os-1.0.1-x86_64.iso)** | 1.56 GiB | Optical live-boot medium; **not** an installed virtual disk or persistent OS. |
| **3. Use QEMU/KVM** | **[QEMU optical-media image (.qcow2)](https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.1-rc.11/centipede-os-1.0.1-x86_64.qcow2)** | 1.56 GiB | QCOW2 conversion of the bootable ISO, not a preinstalled writable root disk. Prefer #2 unless QEMU optical-media QCOW2 is specifically needed. |
| **4. Run the Centipede web/API in Docker** | **[Docker image archive (.tar)](https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.1-rc.11/centipede-docker-image-1.0.1.tar)** | 54 MiB | Tested Linux/amd64 container serving the browser UI and API. **Not a bootable OS; Kingdom is not bundled.** |
| **5. Deploy just the built web UI as a developer** | **[Desktop web bundle (.tar.gz)](https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.1-rc.11/centipede-os-1.0.1-desktop-web-bundle.tar.gz)** | 4.81 MiB | Static app files for a web server. **Not a Windows .exe, macOS .dmg or Linux installer.** |
| **6. Verify checksums before using a file** | **[SHA256SUMS](https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.1-rc.11/SHA256SUMS)** | 540 bytes | Hash manifest for the exact RC11 release; provides integrity evidence, not hardware safety certification. |

**Most users:** choose #1 for a spare compatible PC or #2 for a VM. File sizes are the actual published asset sizes rounded for readability.

## What is still unavailable

| What you want | Honest status |
| --- | --- |
| Permanently replace Windows/Linux with Centipede | **Not supported.** There is no verified graphical, persistent disk installer or installed-OS recovery/rollback path. Never format an internal drive for this preview. |
| Double-click Windows/macOS or Linux desktop installation | **Not published.** The `.tar.gz` is a developer web bundle, not a native desktop installer. |
| iPhone/iPad app or TestFlight distribution | **Not published.** The release lacks an iOS IPA and Apple device-signing/acceptance evidence. |
| Secure native Android phone app | **Not certified, not included in RC11.** An older RC9 APK exists historically, but real phone pairing, publisher signature continuity, Play Store compliance and safe remote control are not verified. Do not mistake it for a current download. |
| ARM64/Raspberry Pi/Apple Silicon image | **Not published.** ISO and Docker images here target x86_64 / linux/amd64. |
| Separate Full, Ultra-light, Commander, Scout, Knight images | **No separate installer exists for each profile.** These are application/profile concepts, not separately verified release artifacts. |
| Background autonomous computer worker in RC11 | **Not included.** A separate opt-in headless worker is being built/tested. No physical desktop control is advertised. |

**Important:** GitHub **Code → Download ZIP** and automatic **Source code** archives are source files, not bootable OS images. Do not flash them.

## Using the live USB (no terminal)

1. Download the **Live USB ISO** from #1.
2. Get a **spare USB drive, 8 GB or larger**. Copy important files off it. Writing the image **erases the selected USB**.
3. Open [balenaEtcher](https://etcher.balena.io/). Select **Flash from file → Centipede .iso → Select target → Flash**. Confirm the target is the removable USB, not an internal disk.
4. Restart your compatible Intel/AMD 64-bit PC. Choose the USB from its one-time boot menu (often F12, F9, F11, or Esc). Choose the **live/start** entry, not disk installation.
5. Try Home and the System Command Center. A separate authorized Kingdom service is needed for genuine remote jobs. Save anything important outside the temporary live session.
6. Power down, remove the USB, and boot your regular OS.

[Illustrated guide](docs/media/quick-start.svg) · [Full beginner installation guide](docs/INSTALLATION_GUIDE.md) · [Video walkthrough script](docs/VIDEO_GUIDE.md)

## Integrity and release evidence

The release workflow built/smoke-tested the desktop, Docker, Debian live ISO and QEMU outputs, including BIOS Safe Graphics/normal and UEFI Safe Graphics/normal checks. Download sizes, filenames and tag are pinned in [release/published-preview.json](release/published-preview.json). The [release manifest](https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.1-rc.11/release-manifest.json) identifies the built source and SHA-256 artifacts. The checksums do **not** establish a successful permanent install, mobile authenticity, 24-hour physical stability, or safe autonomous host access.

[Physical acceptance checklist](docs/PHYSICAL_ACCEPTANCE.md) · [Issue #150 — blockers](https://github.com/wests-cmd/Centipede-os/issues/150) · [All releases](https://github.com/wests-cmd/Centipede-os/releases)
