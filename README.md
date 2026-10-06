# Centipede OS

Centipede OS is a free desktop operating system with a custom Centipede-branded live workspace and the Centipede web app. Kingdom is a separate service; it is not included in the download.

## Download and try Centipede

**New to this?** Download the ISO, write it to an empty USB drive, and start the other computer from that USB. The live session does not install Centipede or replace Windows.

<p><a href="https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.1-rc.3/centipede-os-1.0.1-live-usb-x86_64.iso"><strong>⬇️ Try the Centipede OS 1.0.1 preview for USB</strong></a></p>

This is a **preview release**. For the current stable download, use [Centipede OS v1.0.0](https://github.com/wests-cmd/Centipede-os/releases/tag/v1.0.0). To see every preview file, including the VM and Docker image, visit the [Centipede OS v1.0.1-rc.3 downloads page](https://github.com/wests-cmd/Centipede-os/releases/tag/v1.0.1-rc.3).

**Before you start:** The USB needs at least 8 GB free. Writing the image erases the USB. Files saved during a live session may be lost when you shut down. Keep the PC’s internal drive connected and do not choose an install or erase option.

### Make the USB (Windows, Mac, or Linux)

Use an empty USB drive with at least 8 GB free (16 GB is a comfortable choice). Copy anything you need from it first; writing the image erases the USB.

1. Click **Download Centipede OS v1.0.0 for USB** above and save the `.iso` file.
2. Download and open [balenaEtcher](https://etcher.balena.io/). It is a free USB writing app for operating system images.
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

> **What you download:** v1.0.1-rc.3 is a custom Centipede-branded live preview. The default live option was tested in virtual machines, but the installer has not passed installation to a separate test disk, reboot, and source-media safety checks. Choose **Try Centipede / Live** only. Do not start the disk installer or use it on a real disk. The current stable release remains v1.0.0.

> **Disk installer status:** The preview contains a guided installer, but it is not certified for disk installation yet. Installation to a separate test disk, reboot, and proof that the boot USB cannot be selected as the target are still required. Do not use it to install or erase a disk.

### Centipede OS 1.0.1 preview desktop

![Centipede OS 1.0.1 preview desktop, captured during the full-use browser check.](docs/images/centipede-desktop-preview.png)

## What is included

The project contains a browser-based desktop application, a Centipede live image, a Docker image, and Android/iOS app projects. The live desktop runs Centipede in Chromium. The desktop design separates common apps from Centipede tools. The preview image includes Chromium, LibreOffice Writer/Calc, Thunderbird, and VLC. These assets are published as a prerelease preview and have not replaced the v1.0.0 stable download.

The interface is a client for Kingdom, a separately operated service. Centipede does not include Kingdom or gain control of the host PC. Some panels are prototypes or use local example data. The browser companion can enroll a phone against the running Centipede service: open Centipede on the host computer at `http://localhost:3000`, create a one-time code, then open the printed phone address on the same network and enter the code there. The API requires a loopback socket peer and a localhost request host for code creation and device administration; browser origin and Fetch Metadata checks further reject cross-origin requests. Request headers alone cannot grant local authority. Pairing uses plain HTTP, so keep it on a private, trusted network and never expose the port to the internet. Pairing records last only for the current server session. Docker or reverse-proxy setups are not certified for host device administration when their API sees a bridge/proxy peer instead of loopback. This is device enrollment only; the native Android/iOS apps and mobile task/approval workflows are not ready. The live image has limited hardware firmware and may not support every Wi-Fi or graphics device.


## App updates

When a newer browser app is served by the Centipede server, same-line patch updates refresh automatically. Minor or major version changes show a prompt first. The notice names the updated browser page, JavaScript, and styles; the browser controls the transfer and does not expose a reliable byte count. This refresh updates the browser app only. Updating an installed OS image, USB, Docker image, Kingdom service, or user files requires a separate release/install process.
## Boot troubleshooting

The live-image build keeps normal graphics enabled and provides a separate **Centipede OS (Safe Graphics)** boot choice with `nomodeset` and conservative video settings. If normal startup shows a black screen or an unsupported display mode, reboot the USB, choose **Safe Graphics**, and report the result. The ISO build targets legacy BIOS and UEFI; its build now requires signed UEFI components for Secure Boot and fails if those packages are unavailable. This candidate still needs its tagged CI boot tests before it can replace the public download.

The operating system uses Centipede OS identity across the boot menu, startup splash, login screen, desktop, and installer. Required notices for included upstream components remain available in the system's legal documentation. See [branding details](docs/BRANDING.md) and the [boot and recovery checklist](docs/BOOT_RECOVERY_CHECKLIST.md) for what's included, what's unverified, and what blocks a production claim.
## Current release and target status

- The current stable release is [Centipede OS v1.0.0](https://github.com/wests-cmd/Centipede-os/releases/tag/v1.0.0).
- The custom-branded [v1.0.1-rc.3 preview](https://github.com/wests-cmd/Centipede-os/releases/tag/v1.0.1-rc.3) publishes a web bundle, hybrid live ISO, byte-identical Live USB image, QEMU optical-media image, and smoke-tested Docker image. See its release manifest and SHA-256 file for exact artifact identities and checksums.
- Both the stable image and preview should be treated as live-only. The preview's guided installer has not passed separate-target installation, reboot, and source-media safety checks; do not use it on a real disk.
- Android device distribution is blocked until the protected signing key and publisher fingerprint are configured.
- iPhone distribution is blocked until Apple distribution signing and provisioning are configured. The iOS Simulator app is not installable on an iPhone.
- Docker contains the Centipede web app, not Kingdom. Running it requires Docker and does not provide the USB desktop experience.

See the [ship reality matrix](docs/SHIP_REALITY_MATRIX.md), [platform build guide](docs/PLATFORM_BUILD_GUIDE.md), and [release certification](docs/release/RELEASE_CERTIFICATION.md) for validation evidence and limits.

## Discord community

[Join the Centipede / Kingdom Discord](https://discord.gg/4b8f9YS2Wp) for community discussion and help. The invite currently points to **Kingdom's server**.

The server's **Kingdom Centipede Skill Bot** can show approved project notes:

- `/skillmap` lists approved Kingdom or Centipede skills.
- `/ask` looks up approved notes; choose a project and ask a specific question.
- `/aiask` drafts an answer with local AI and approved notes. Check AI drafts before relying on them.
- `/botstatus` checks the bot. Administrators can add approved notes with `/teach`.

The bot is for help and reference; it does not execute Kingdom tasks or grant permissions. Never share pairing codes, owner tokens, or API keys in Discord.

## Running the web app (developers)

Requires Bun and Node-compatible tooling:

```bash
git clone https://github.com/wests-cmd/Centipede-os.git
cd Centipede-os
bun install --frozen-lockfile
bun start
```

The app prints its local URL. It listens on the loopback address and the first private IPv4 interface it finds so a phone can reach it without opening every interface. The browser uses Centipede&apos;s same-origin, read-only Kingdom proxy so the Kingdom credential stays on the server.

To connect Kingdom, configure `KINGDOM_API_URL` and `KINGDOM_API_TOKEN` in the Centipede server environment. A host process can use `http://127.0.0.1:8000`; a Centipede container can use `http://host.docker.internal:8000` when Kingdom is published on the host at port 8000. Use a least-privilege credential where Kingdom supports it, keep it out of source control, and never paste it into the browser URL field. The proxy exposes read-only status/catalog data from localhost requests; it does not forward task submissions or privileged changes.

For phone pairing, keep the app running and open it on the host computer using `http://localhost:3000`. Create a pairing code there, then open the printed phone address on a phone connected to the same trusted network and enter the one-time six-digit code. If a firewall asks, allow Centipede only on your private network. Pairing uses plain HTTP. Docker users can set `CENTIPEDE_PUBLIC_URL` to the PC's LAN address (for example, `http://192.168.1.20:3000`) for the phone-facing address, but the current loopback-only admin gate means Docker bridge/reverse-proxy management may be unavailable; that setup is not certified yet.

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
