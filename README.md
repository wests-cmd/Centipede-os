# [Centipede OS](https://github.com/wests-cmd/Centipede-os) — The AI Desktop Web Application

**[Centipede OS](https://github.com/wests-cmd/Centipede-os)** provides a browser-based desktop application with an AI assistant (**Segmentor**), platform packaging for Debian live images and native WebView clients, and an integration layer for a separately deployed Kingdom service. Platform build workflows are implemented but need successful CI runs before any stable image claims. Security and Kingdom execution behavior depend on the configured external Kingdom deployment.

Kingdom is a separate project and runtime. This repository contains a client and API contract; it does not bundle the Kingdom service.

---

## Download Centipede: choose by device and what you want to do

**[OPEN THE SIMPLE DOWNLOAD CHOOSER — FILES, SIZES & INSTRUCTIONS](DOWNLOADS.md)**

The newest **published preview**, [v1.0.1-rc.9](https://github.com/wests-cmd/Centipede-os/releases/tag/v1.0.1-rc.9), is from **October 7, 2026**. It does **not** contain the current `main` branch, including the newer System Command Center. All download options below are **previews, not permanent operating-system installers**.

| I want to... | Pick this download | Who it is for |
| --- | --- | --- |
| **Try Centipede from a USB** without replacing Windows or Linux | **[Download USB preview (.iso, 1.58 GiB)](https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.1-rc.9/centipede-os-1.0.1-live-usb-x86_64.iso)** | Intel/AMD 64-bit PCs; blank **8 GB+ USB** needed. Writing it **erases the selected USB**, not the internal drive if you choose correctly. |
| **Try it inside a VM** | **[Download VM boot ISO (.iso, 1.58 GiB)](https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.1-rc.9/centipede-os-1.0.1-x86_64.iso)** | VirtualBox/VMware users; live virtual CD, **not a preinstalled disk**. |
| **Run the web/API server in Docker** | **[Download Docker image (.tar, 391 MiB)](https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.1-rc.9/centipede-docker-image-1.0.1.tar)** | Developers with Docker on linux/amd64; **Kingdom not included**. |
| **Try the experimental Android app** | **[Download preview APK (3.14 MiB)](https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.1-rc.9/centipede-android-1.0.1-release.apk)** | Android testers only; **not a verified, signed production remote-control companion**. |
| **Get a permanent OS installer, Windows .exe, Mac app, or iPhone IPA** | **Not yet available** | No verified permanent install, native desktop installer, or signed device distribution is published. |

**Not sure?** Use the **[download chooser](DOWNLOADS.md)**. It also covers QEMU, the developer web bundle, supported CPU types, the Ultra-light/Full/Commander/Knight/Scout profile distinction, and exactly which missing installers are blocked. **Do not download `Source code (zip)` expecting a bootable operating system.**

### Start your USB preview — no command line

1. Download the **USB ISO** using the first row above.
2. Download [balenaEtcher](https://etcher.balena.io/). Insert an **8 GB or larger USB you can erase** and choose **Flash from file → Select target → Flash**. Double-check it is the removable USB.
3. Start a compatible PC using the one-time boot menu (often F12, F9, F11, or Esc). Choose the USB and its **live/start** mode; never an install/format option.
4. Explore **Home**, **Segmentor** and **System Command Center** where available. A separately deployed, authorized **Kingdom** service is required for real remote work. Shut down and remove the USB afterward.

**[Illustrated beginner tutorial](docs/media/quick-start.svg)** · **[Step-by-step installation guide](docs/INSTALLATION_GUIDE.md)** · **[Text walkthrough](docs/VIDEO_GUIDE.md)** · **[Preview SHA-256 checksums](https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.1-rc.9/SHA256SUMS)**

### What is genuinely ready?

- **GitHub source** includes the latest approved Command Center, test and security improvements, but **no new public RC** built from these changes yet.
- **USB/ISO, QEMU and Docker** have historical published preview assets; they are **not** certified as daily-driver installs.
- The preview **Android APK** exists, but real authenticated phone control, publisher signing continuity and store distribution are **not certified**. **iOS is blocked** until Apple distribution signing and device acceptance.
- The downloadable ISO is **below 5 GiB** as a file, but this does not establish an installed storage requirement, Ultra-light profile, or verified 4 GiB RAM performance.
- **[Release and physical-hardware blockers](https://github.com/wests-cmd/Centipede-os/issues/150)** remain open; do not erase an internal drive to use this preview.

[All releases (including older historical prototypes)](https://github.com/wests-cmd/Centipede-os/releases) · [Current release target manifest](release/targets.json) · [Platform signing/build requirements](docs/PLATFORM_BUILD_GUIDE.md)

---

## Status and roadmap

The **System Command Center and new user-visibility features are implemented in GitHub source**, not in the October 2026 RC9 download. The next release milestone is to build a new preview from the current reviewed source, validate every published target and its SHA-256 checksum, and only then point this download chooser to those new files. See the [device-specific choices](DOWNLOADS.md) and [release blockers](https://github.com/wests-cmd/Centipede-os/issues/150).

**Still not general-availability ready:** secure permanent graphical installation/recovery, hardware testing on low-memory PCs, signed/native phone distribution, and real multi-machine Kingdom task acceptance. A green web-build test does not close those requirements.

## Overview

Centipede provides the user-facing desktop and assistant. Kingdom supplies the separately deployed task and security authority. The default local-admin Kingdom proxy allows only read operations. Actions require a separately authenticated, owner-authorized connection; connecting to a read proxy does not grant write privileges.

## Quick Navigation

- [What is Centipede OS?](#what-is-centipede-os)
- [Core Concepts Explained](#core-concepts-explained)
- [Choosing Your Profile](#choosing-your-profile)
- [How Do I Control Centipede OS From My Phone?](#phone-command-center)
- **[Choose a download for your device](DOWNLOADS.md)**
- [Installation Guide](docs/INSTALLATION_GUIDE.md)
- [Security & Privacy FAQ](#security-faq)
- [Troubleshooting & Recovery](#recovery)
- [Developer & Testing Documentation](#developer-info)

---

## What is Centipede OS?

Centipede is currently a browser-based desktop application. Its verified live integration is the Kingdom REST API client; other panels may be local prototypes or example data:

- **Segmentor UI**: A local intent and permission-gating interface; it does not provide host file or shell access.
- **Kingdom API client**: The app can query the separately deployed Kingdom API and submit tasks or approval requests. Kingdom deployment and policy must be verified independently.
- **Browser storage**: Client preferences are stored in browser local storage. Other memory views are not a promise of durable host storage.
- **Local Files**: Owner-unlocked real files in a private service-owned directory, no overwrite/delete or arbitrary system file access. See [Files limitations](docs/LOCAL_FILES_WORKSPACE.md).
- **Mobile companion prototype**: Capacitor Android/iOS project shells exist, but signed production devices, complete remote workflows, and store distribution remain blocked.

---

## Project map

- `src/components/` contains the browser desktop and app panels.
- `src/ai/` contains Segmentor's intent, planning and policy/request pipeline.
- `src/api/` contains Kingdom compatibility negotiation and the API client.
- `src/server/kingdomReadProxy.ts` exposes a local-admin, GET-only Kingdom view.
- `src/workflow/`, `src/learning/` and `src/tools/` contain local workflow, memory and capability implementations; these are not equivalent to Kingdom's central durable services.
- `docs/INTEGRATION_COHESION_AUDIT.md` records the verified integration gaps and acceptance gates.

## Core Concepts Explained

### What is Kingdom?
**Kingdom** is a separately deployed service in the `wests-cmd/kingdom` project. This repository contains the Centipede client and compatibility contract. Deploy and verify Kingdom independently; this web application does not implement or include its execution authority.

### What is a Knight?
A **Knight** is a Kingdom worker node. This Centipede repository does not provision Knight nodes.

### What is a Scout?
A **Scout** is a Kingdom discovery role. The profile selector in this app only stores a browser client preference; it does not deploy a Scout.

### What is Segmentor (Centipede Assistant)?
**Segmentor** is the assistant interface in this web app. Protected work requires the external Kingdom API; this app does not execute arbitrary host operations.

---

## Choosing a deployment

Platform build jobs are available in GitHub Actions. Stable-tag publishing waits for the desktop, ISO/USB/VM, and Docker release jobs, then fails closed on missing artifacts or checksum mismatches. Signed Android/iOS jobs are disabled until their target status, publisher credentials, and repository enablement are deliberately updated. Review [current target status](docs/SHIP_REALITY_MATRIX.md) and [release prerequisites](docs/PLATFORM_BUILD_GUIDE.md).

## Integrations

Kingdom is a separate deployment. Allowlisted reads are proxied through the local-admin GET-only endpoint. For **real Kingdom task submission and cancellation**, the local Centipede host now has a separate fixed-surface owner-unlock action service, using the configured server-side `KINGDOM_API_TOKEN`. It requires re-entry of the Kingdom owner access code every 15 minutes; the owner code is never saved to browser storage and LAN/phone clients cannot use this local action channel. Runtime admin actions, remote mobile actions and arbitrary skills are NOT enabled through it. See [the owner action security design](docs/KINGDOM_OWNER_TASK_CHANNEL.md). The Memory screen also shows live Kingdom memory records, and the Skills screen shows Kingdom's registered skills and lifecycle states when connected. Workspace, Segmentor, and Tasks now share the owner-authorized Kingdom task submission path; local workflow examples are only proposals, not real Kingdom workflow executions. These are distinct from browser-local notes and skill demonstrations; both Kingdom views are read-only. Local integrations and browser prototypes must not be described as executed Kingdom work. See the [integration audit](docs/INTEGRATION_COHESION_AUDIT.md).

## Mobile companion prototype

The pairing screen uses local browser state for demonstration. It does not pair a separate phone or provide mobile monitoring.

The mobile companion panel remains a local UI prototype. Native Android/iOS builds package the desktop web application in a native WebView; they do not add remote phone pairing or monitoring.

---

## Run locally

The following commands run the **browser desktop client**. They do not install Centipede as a standalone Linux OS or deploy Kingdom. A supported Bun runtime must be installed first.

## Installation Guide

For detailed non-technical installation steps, see our [Installation Guide](docs/INSTALLATION_GUIDE.md).

### Option A: Launch the browser application
```bash
# Clone repository
git clone https://github.com/wests-cmd/Centipede-os.git
cd Centipede-os

# Install dependencies and start the local web application
bun install
bun start
```
Open `http://localhost:3000` in your browser. Kingdom-backed operations require a separately deployed Kingdom service.

### Option B: Build the desktop web application
```bash
# Clone repository
git clone https://github.com/wests-cmd/Centipede-os.git
cd Centipede-os

 # Build the web application bundle
npm install
npm run build
```
Serve the generated `dist/` directory with a static web server. Kingdom-backed features require a separately configured Kingdom endpoint.

---

## Configuration

Configure Kingdom in the first-run wizard. The default local server's `/api/v1/kingdom` URL provides read-only, local-admin access using a server-side token. It is not a write/action gateway. Set `KINGDOM_API_URL` and `KINGDOM_API_TOKEN` on the server for authorized local read access. Do not put an owner token in publicly shipped browser JavaScript or share it with mobile clients.

## Security FAQ

### Q: Can this application delete my files or execute system commands?
The browser UI has no unrestricted host file or shell access. The newly merged local-only Files broker supports limited operations in a dedicated folder after owner unlock; the older published v1.0.0 image does not contain that feature. Kingdom-backed actions are handled by the separately deployed Kingdom service; review that deployment's authorization and policy configuration independently.

### Q: Does this release certify prompt-injection or host security protections?
No. The UI contains security-related demonstrations, but this release does not certify system-wide isolation, prompt-injection resistance, or Kingdom deployment security.

### Q: What happens if Kingdom is offline?
Kingdom-backed features cannot run while the service is unavailable. The client reports connection status; availability and fail-closed behavior for execution must be verified in the deployed Kingdom service.

### Q: Can I revoke a stolen phone or node here?
No. The mobile companion is a local prototype and this release does not pair remote phones or nodes.

---

## Operations and updates

The browser bundle cannot update its host OS or Kingdom. Update Kingdom and the Debian host using their own authenticated, tested recovery procedures. Centipede's release tooling is not evidence of a published, tested daily-driver installer.

## Recovery

This browser application does not manage operating-system updates, host storage, rollback, or emergency process termination. Browser-local preferences and demo data are not a backup. Manage the separately deployed Kingdom service using its own operational procedures.

---

## Verification

Run typechecking, unit tests, contract validation and browser tests before claiming readiness. A successful CodeQL analysis does not replace a successful build, a native installation test, or a live owner-approved Kingdom action. The [cohesion audit](docs/INTEGRATION_COHESION_AUDIT.md) tracks these separate gates.

## Developer Info

```bash
# Install dependencies
bun install

# Run unit and compatibility tests
bun test

# Run contract verification against live Kingdom server
bun run test:contract

# Run Playwright E2E browser tests
bun run test:e2e
```

### Kingdom ↔ Centipede Capability Negotiation & Compatibility
- **Contract Specification**: `src/api/contractSpec.ts`
- **Capability Negotiator**: `src/api/capabilityNegotiator.ts`
- **Compatibility**: Kingdom protocol major `1`, minimum contract version `1.4.0`; runtime Kingdom release versions are discovered dynamically. The protocol and contract identifiers are independent of the Centipede product version.
- **ZeroTrust Boundary**: Capability negotiation classifies version/capability status (`SUPPORTED`, `UNSUPPORTED`, `DEGRADED`, `INCOMPATIBLE`, `UNKNOWN`, `REQUIRES_UPDATE`), but NEVER acts as an authorization authority. Kingdom remains authoritative.

## Documentation

- [Project architecture](docs/ARCHITECTURE.md)
- [Development guide](docs/DEVELOPMENT.md)
- [Operations](docs/OPERATIONS.md)
- [Current status](docs/PROJECT_STATUS.md)
- [Kingdom integration cohesion audit](docs/INTEGRATION_COHESION_AUDIT.md)
