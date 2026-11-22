# Choose the right Centipede OS download

**Start here if you are not a developer.** Choose what you want to do, not the file extension.

> **Release status: experimental preview, not an installed daily-driver OS.** The files below are real assets from the [v1.0.1-rc.9 release (October 7, 2026)](https://github.com/wests-cmd/Centipede-os/releases/tag/v1.0.1-rc.9). They were built **before** the latest `main` updates, including the System Command Center. No download below is certified as a permanent installer or a complete Kingdom/phone deployment.

## Choose one

| Your computer or goal | Choose this file | Download size | What you actually get |
| --- | --- | --- | --- |
| **Windows or Linux PC, Intel/AMD 64-bit**. I want to **try Centipede from a USB without replacing my OS**. | **[1. Live USB — Centipede preview (.iso)](https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.1-rc.9/centipede-os-1.0.1-live-usb-x86_64.iso)** | **1.58 GiB** | Bootable *Debian live desktop* with the Centipede browser interface. Does not install to your internal drive. You need an expendable USB of at least **8 GB**. |
| **Windows or Linux PC with VirtualBox/VMware**. I want to **try it in a virtual machine**. | **[2. Virtual machine boot ISO (.iso)](https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.1-rc.9/centipede-os-1.0.1-x86_64.iso)** | **1.58 GiB** | The same live environment on virtual CD/DVD media; not an installed virtual disk. Add a virtual drive if you want to save your own data separately. |
| **QEMU/KVM advanced user**. I want a **QCOW2-format boot medium**. | **[3. QEMU optical-media image (.qcow2)](https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.1-rc.9/centipede-os-1.0.1-x86_64.qcow2)** | **1.57 GiB** | QCOW2 made from the live ISO. It is *not* a preinstalled writable hard drive. Attach it as optical boot media; for simpler VM setup, use option 2. |
| **Docker user on Linux/amd64**. I want to host the **Centipede web/API service**. | **[4. Docker image archive (.tar)](https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.1-rc.9/centipede-docker-image-1.0.1.tar)** | **391 MiB** | A loadable web/API container. **Not a bootable OS** and **does not install Kingdom**. Docker and configuration are required. |
| **Android phone**, for evaluation **only**. I want the **older app preview**. | **[5. Android preview (.apk)](https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.1-rc.9/centipede-android-1.0.1-release.apk)** | **3.14 MiB** | A published APK from RC9. Publisher certificate continuity, Play Store compliance, real phone pairing, and remote commands **are not certified**. Not a production companion. |
| **Developer**, familiar with servers and web files. I want only the **browser UI bundle**. | **[6. Desktop web bundle (.tar.gz)](https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.1-rc.9/centipede-os-1.0.1-desktop-web-bundle.tar.gz)** | **0.12 MiB** | Web assets for a server; **not** a double-click Windows, macOS, or Linux desktop installer. |

**Most people should start with option 1** on a compatible spare Intel/AMD PC. If you want to try the interface without preparing a physical USB, choose **option 2** in your virtualization software.

## Not available as a supported download

| I want... | Current answer |
| --- | --- |
| Install Centipede permanently instead of Windows/Linux | **Not supported.** There is no verified graphical, persistent disk installer or installed-OS rollback path. Do not format an internal drive for this preview. |
| A double-click **Windows .exe/.msi** or **macOS .dmg/.pkg** | **Not published.** The desktop `.tar.gz` is a developer *web* archive, not a native installer. |
| A working **iPhone/iPad IPA**, App Store or TestFlight link | **Not published.** iOS Simulator validation is not installable on a physical iPhone; Apple distribution signing remains blocked. |
| A production **Android app** that securely controls my computers | **Not certified.** RC9 APK is only an older preview. Real remotely authenticated pairing and command permissions still require device testing. |
| **ARM64/Raspberry Pi/Apple Silicon** boot media | **Not published.** The ISO and Docker downloads above target x86_64 or linux/amd64; an ARM device needs its own verified build. |
| A separate **Ultra-light, Full, Commander, Knight or Scout installer** | **No separate installer exists for each profile.** Those in-app profiles are configuration/UI concepts, not proven standalone OS images or worker installers. |
| The newest Command Center code as a ready-to-install file | **Not yet released as a new image.** GitHub `main` contains later source than RC9; running source requires developer tooling. |

**Important:** The GitHub **Code → Download ZIP** and automatic **Source code (zip/tar.gz)** links are *source files*, not bootable images. Do not flash them to a USB.

## Using the Live USB download (no terminal)

1. **Download option 1** above on your regular computer.
2. Get a spare **8 GB or larger USB drive**. Copy any files you want to keep off it. **Flashing will erase the selected USB.**
3. Open [balenaEtcher](https://etcher.balena.io/), then choose **Flash from file → the downloaded `.iso` → Select target → Flash**. Verify the target is the removable USB, **not** the computer's internal disk.
4. Restart the **compatible 64-bit Intel/AMD PC**. Open its one-time boot menu (often F12, F9, F11 or Esc) and select the USB. Choose the **live/start** option only.
5. Try Centipede. The published preview may lack recent `main` fixes, and Kingdom execution requires a **separately installed and authorized Kingdom** service.
6. When finished, shut down, remove the USB, and boot your usual OS. Data saved only in a temporary live session may be lost.

[Beginner installation walkthrough](docs/INSTALLATION_GUIDE.md) · [Illustrated tutorial](docs/media/quick-start.svg) · [Plain-language instructions](docs/VIDEO_GUIDE.md)

## Checks before using a downloaded file

- All links above were checked against the **published asset list** for release `v1.0.1-rc.9`; these are **not** dynamic “latest stable” redirects.
- If you care about file integrity, download the [published SHA256SUMS](https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.1-rc.9/SHA256SUMS) and compare the hash of the exact file you downloaded. The same checksums cannot prove a device is supported or that an installation is safe.
- **Image size is not installed footprint or runtime RAM use**: the ISO is under 5 GiB as a download, but has **not** been certified on a 4 GiB dual-core machine.
- Do not confuse **“BUILDABLE” in [release/targets.json](release/targets.json)** with “already released” or “ready for a nontechnical user.”

## What comes next for the project

1. Produce a **new RC candidate from the latest `main` commit**, not the October RC9 source; build and smoke-test USB/ISO, QEMU and Docker, then verify every downloadable asset and its checksums before publishing.
2. Finish **physical acceptance** on a real low-memory PC and DT1: no-terminal startup, Wi-Fi/video, Kingdom execution and recovery, over a sustained use period.
3. Only after the corresponding safety and signing gates are met, add verified permanent-install, native-desktop, and mobile release choices to the table above. **Do not create buttons for nonexistent targets.**

[View published releases](https://github.com/wests-cmd/Centipede-os/releases) · [Current physical acceptance checklist](docs/PHYSICAL_ACCEPTANCE.md) · [Release blockers](https://github.com/wests-cmd/Centipede-os/issues/150)
