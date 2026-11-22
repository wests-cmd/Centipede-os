# [Centipede OS](https://github.com/wests-cmd/Centipede-os) — The AI Desktop Web Application

**[Centipede OS](https://github.com/wests-cmd/Centipede-os)** provides a browser-based desktop application with an AI assistant (**Segmentor**), platform packaging for Debian live images and native WebView clients, and an integration layer for a separately deployed Kingdom service. Platform build workflows are implemented but need successful CI runs before any stable image claims. Security and Kingdom execution behavior depend on the configured external Kingdom deployment.

Kingdom is a separate project and runtime. This repository contains a client and API contract; it does not bundle the Kingdom service.

---

## Download Centipede: choose by device and what you want to do

**[CHOOSE YOUR DOWNLOAD — BEGINNER GUIDE, SIZES AND INSTRUCTIONS](DOWNLOADS.md)**

The newest **published preview** is **[v1.0.1-rc.11 (November 22, 2026)](https://github.com/wests-cmd/Centipede-os/releases/tag/v1.0.1-rc.11)**. It is built from commit `63b4b63d7af104cb456a86530e43d16e8b5a699d` and includes the System Command Center. Files are **experimental live previews, not permanent OS installers**. Changes made after that commit are not inside these files.

| I want to… | Correct, actually published download | Who it is for |
| --- | --- | --- |
| **Try Centipede from a USB** without replacing Windows/Linux | **[Live USB preview — .iso, 1.56 GiB](https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.1-rc.11/centipede-os-1.0.1-live-usb-x86_64.iso)** | Intel/AMD 64-bit PC; spare **8 GB+ USB**. Flashing **erases the chosen USB**. |
| **Try it in a VM** | **[VM boot ISO — .iso, 1.56 GiB](https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.1-rc.11/centipede-os-1.0.1-x86_64.iso)** | VirtualBox/VMware users; this is a live optical boot image, **not an installed VM disk**. |
| **Run the web/API service in Docker** | **[Docker image — .tar, 54 MiB](https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.1-rc.11/centipede-docker-image-1.0.1.tar)** | Developers with linux/amd64 Docker. **Kingdom not included.** |
| **Install permanent Centipede, a native Windows/Mac app, or an iPhone/production Android app** | **Not yet available** | No verified permanent installer or supported, signed phone app is published in RC11. |

**More options:** [All six real RC11 assets and supported uses](DOWNLOADS.md), including QEMU and the developer web bundle. **Do not flash GitHub's `Source code (zip)` to a USB.**

### Boot the USB preview without commands

1. Download the **Live USB ISO** using the first link.
2. Open [balenaEtcher](https://etcher.balena.io/); select the ISO, **a removable 8 GB+ USB**, then Flash. Double-check the target is **not your internal disk**.
3. Restart a compatible PC and choose the USB from its boot menu (commonly F12, F9, F11 or Esc); select **Live/Start**, never an erase/installation option.
4. Use Centipede's Home, Segmentor and System Command Center. Actual remote Kingdom work needs a **separately installed and authorized Kingdom**. The live session may forget work after shutdown.

**[Illustrated guide](docs/media/quick-start.svg)** · **[Installation steps](docs/INSTALLATION_GUIDE.md)** · **[Video script](docs/VIDEO_GUIDE.md)** · **[RC11 SHA256SUMS](https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.1-rc.11/SHA256SUMS)**

### Ready vs. not ready

- **YES — published preview:** RC11 USB/ISO, QEMU optical-media QCOW2, Docker web/API and desktop *web bundle* passed release pipeline checks and have matching release manifest/SHA-256 entries. They are NOT permanent installers.
- **NO — certified daily driver:** no hardware acceptance on ~4 GiB low-power PC, no verified installed-OS rollback, no sustained connected Kingdom acceptance, no verified permission-safe autonomous computer-use worker in this published image.
- **NO — supported phone installers:** Android and iOS are **BLOCKED** in `release/targets.json`; there is no RC11 phone download. Historical RC9 APK must not be presented as the current secure phone companion.
- **NO — no-terminal full install:** live USB is tested through virtual boot. A graphical, safely recoverable persistent-disk install still requires separate acceptance.

[All GitHub releases](https://github.com/wests-cmd/Centipede-os/releases) · [Platform target matrix](release/targets.json) · [Release blockers](https://github.com/wests-cmd/Centipede-os/issues/150)

---

## Status and roadmap

The **System Command Center is now in the published RC11 preview**. The next project milestone is an owner-supervised, isolated, persistent background browser harness plus real low-memory hardware and Kingdom acceptance. The new worker is developed separately from published RC11 until its own verified release.

**General availability remains blocked** on permanent install/recovery, hardware testing, signed distribution, dependable multi-device execution, and security evidence. A passed browser CI suite is not a physical acceptance certificate.

## Overview

Centipede provides the user-facing desktop and assistant. Kingdom supplies the separately deployed task and security authority. The default local-admin Kingdom proxy allows only read operations. Actions require a separately authenticated, owner-authorized connection; connecting to a read proxy does not grant write privileges.

## Quick Navigation

- [What is Centipede OS?](#what-is-centipede-os)
- [Core Concepts Explained](#core-concepts-explained)
- [Choosing Your Profile](#choosing-your-profile)
- [How Do I Control Centipede OS From My Phone?](#phone-command-center)
- **[Choose a download for your device](DOWNLOADS.md)**
- **[Background Work — isolated autonomous browser worker (source preview)](docs/BACKGROUND_HARNESS.md)**
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
- `harness/`, `Dockerfile.harness`, and `src/server/harnessProxy.ts` add a separate opt-in, constrained browser-work queue, not native host/desktop input control. See [Background Work guide](docs/BACKGROUND_HARNESS.md).
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
