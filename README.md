# [Centipede OS](https://github.com/wests-cmd/Centipede-os) — The AI Desktop Web Application

**[Centipede OS](https://github.com/wests-cmd/Centipede-os)** provides a browser-based desktop application with an AI assistant (**Segmentor**), platform packaging for Debian live images and native WebView clients, and an integration layer for a separately deployed Kingdom service. Platform build workflows are implemented but need successful CI runs before any stable image claims. Security and Kingdom execution behavior depend on the configured external Kingdom deployment.

Kingdom is a separate project and runtime. This repository contains a client and API contract; it does not bundle the Kingdom service.

---

# Current release status

Centipede `v1.0.0` has a desktop web bundle and platform build workflows for a Debian live ISO/USB image, QEMU VM disk, Android app, iOS app, and Docker image. The OS images launch the web app in a Chromium kiosk session; they do not add host-level Centipede execution or Kingdom. No stable GitHub release has been published. The synchronized tag workflow is designed to publish only verified BUILDABLE targets; Android device distribution and iOS device distribution remain BLOCKED until publisher credentials are configured.

Android and iOS use native Capacitor projects. Android release APKs require an Android signing key; iOS device builds require Apple distribution signing and provisioning. Branch builds produce only debug APK and simulator validation outputs. ISO, USB, VM, and Docker image jobs run on GitHub-hosted Linux runners. See [the ship reality matrix](docs/SHIP_REALITY_MATRIX.md) and [platform build guide](docs/PLATFORM_BUILD_GUIDE.md) for evidence and release prerequisites.

The desktop bundle requires a separately operated Kingdom service for Kingdom-backed actions. The Compose file does not install or implement Kingdom.

Several desktop panels are prototypes or use browser-local/example data. The application does not provide host file access, remote phone pairing, an OS installer, host storage management, or system rollback. Native mobile packages display the same web UI. Stable Android/iOS distribution remains BLOCKED until the matching signing assets and release gates are configured.

## Quick Navigation

- [What is Centipede OS?](#what-is-centipede-os)
- [Core Concepts Explained](#core-concepts-explained)
- [Choosing Your Profile](#choosing-your-profile)
- [How Do I Control Centipede OS From My Phone?](#phone-command-center)
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
- **Mobile companion prototype**: The pairing and ingestion screens are local simulations, not remote phone connectivity or native mobile applications.

---

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

## Mobile companion prototype

The pairing screen uses local browser state for demonstration. It does not pair a separate phone or provide mobile monitoring.

The mobile companion panel remains a local UI prototype. Native Android/iOS builds package the desktop web application in a native WebView; they do not add remote phone pairing or monitoring.

---

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

## Security FAQ

### Q: Can this application delete my files or execute system commands?
This browser application does not have host file or shell access. Kingdom-backed actions are handled by the separately deployed Kingdom service; review that deployment's authorization and policy configuration independently.

### Q: Does this release certify prompt-injection or host security protections?
No. The UI contains security-related demonstrations, but this release does not certify system-wide isolation, prompt-injection resistance, or Kingdom deployment security.

### Q: What happens if Kingdom is offline?
Kingdom-backed features cannot run while the service is unavailable. The client reports connection status; availability and fail-closed behavior for execution must be verified in the deployed Kingdom service.

### Q: Can I revoke a stolen phone or node here?
No. The mobile companion is a local prototype and this release does not pair remote phones or nodes.

---

## Recovery

This browser application does not manage operating-system updates, host storage, rollback, or emergency process termination. Browser-local preferences and demo data are not a backup. Manage the separately deployed Kingdom service using its own operational procedures.

---

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
