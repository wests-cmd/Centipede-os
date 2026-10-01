# Centipede OS

Centipede OS is a Debian live desktop with the Centipede web app. Kingdom is a separate service; it is not included in the download.

## Try Centipede on another PC

<p><a href="https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.0/centipede-os-1.0.0-x86_64.iso"><strong>⬇️ Download Centipede OS v1.0.0 (ISO)</strong></a></p>

This starts a **temporary live session from a USB drive**. It does not install Centipede onto the PC’s internal drive. Anything saved in the live session may be lost when you shut down. Do not use this as a replacement for Windows or another installed system.

### Make the USB (Windows, Mac, or Linux)

You need an empty USB drive with at least 8 GB free; 16 GB is a comfortable choice. **Flashing erases everything on the USB drive.** Copy anything you need from it first.

1. Click **Download Centipede OS** above and save the `.iso` file.
2. Download and open [balenaEtcher](https://etcher.balena.io/). It is a free USB writing app; Debian also recommends it for writing live images.
3. In Etcher, click **Flash from file** and choose the Centipede `.iso` you downloaded.
4. Click **Select target**. Choose your USB drive by its name and size. Check carefully that it is the USB drive, not another drive.
5. Click **Flash!** and approve the erase warning. Wait for Etcher to say the flash is complete, then close it and safely eject the USB.

### Start Centipede from the USB

1. Save and close anything open on the other PC. Leave its internal drive connected; do not choose an install or erase option.
2. Shut the PC down. Insert the Centipede USB and turn the PC on.
3. Immediately tap the PC maker’s **boot menu** key. Common keys are `F12`, `F9`, `F11`, or `Esc`; the right key depends on the PC and may briefly appear on its startup screen.
4. Use the arrow keys to select the USB drive (often shown as `UEFI: <USB name>`) and press `Enter`.
5. Choose the default live/start option if a menu appears. Wait for the desktop to load.
6. To leave, shut down Centipede, remove the USB when the PC is off, and turn the PC on again. It should start its usual system.

If the PC does not show a boot menu, restart and try the other common key or look up “boot menu” plus the PC maker and model. Do not change Secure Boot or firmware settings as a first troubleshooting step.

> **Important:** The published v1.0.0 image is the verified stable download. The refreshed desktop and free everyday app set are merged into `main` but have not yet been published as a new release. The stable download link above still serves v1.0.0.

### Desktop preview (merged, not yet in the download)

![Centipede desktop preview. The public v1.0.0 download still contains the older desktop.](docs/images/centipede-desktop-preview.png)

## What is included

The project contains a browser-based desktop application, a Debian live image, a Docker image, and Android/iOS app projects. The live desktop runs Centipede in Chromium. The new desktop design separates common apps from Centipede tools. Its Debian image build includes Chromium, LibreOffice Writer/Calc, Thunderbird, and VLC; these changes need a new tagged release before they become the public stable USB download.

The interface is a client for Kingdom, a separately operated service. Centipede does not include Kingdom or gain control of the host PC. Some panels are prototypes or use local example data; the phone pairing screens do not pair a real second phone. The live image has limited hardware firmware and may not support every Wi-Fi or graphics device.

## Current release and target status

- The current public release is [Centipede OS v1.0.0](https://github.com/wests-cmd/Centipede-os/releases/tag/v1.0.0).
- ISO, USB, QEMU VM, desktop bundle, and Docker assets are published for v1.0.0.
- Android device distribution is blocked until the protected signing key and publisher fingerprint are configured.
- iPhone distribution is blocked until Apple distribution signing and provisioning are configured. The iOS Simulator app is not installable on an iPhone.
- Docker contains the Centipede web app, not Kingdom. Running it requires Docker and does not provide the USB desktop experience.

See the [ship reality matrix](docs/SHIP_REALITY_MATRIX.md), [platform build guide](docs/PLATFORM_BUILD_GUIDE.md), and [release certification](docs/release/RELEASE_CERTIFICATION.md) for validation evidence and limits.

## Running the web app (developers)

Requires Bun and Node-compatible tooling:

```bash
git clone https://github.com/wests-cmd/Centipede-os.git
cd Centipede-os
bun install --frozen-lockfile
bun start
```

The app prints its local URL. Kingdom-backed features need a separately deployed Kingdom service and a reachable API endpoint.

## Developer checks

```bash
bun x tsc --noEmit
bun test
npm run build
npm run test:e2e
```

The release workflow also builds ISO/USB/VM and Docker targets, generates a release manifest and SHA-256 checksums, and fails on missing or mismatched build outputs. Mobile release builds remain blocked until signing is configured.

## Kingdom compatibility

- Protocol major: `1`
- Minimum contract version: `1.4.0`
- Kingdom remains the execution authority. These compatibility identifiers are independent of Centipede's product version.
