# Centipede OS

## Overview

Centipede is a browser desktop application and a separately built Debian live desktop image. The image launches the interface in Chromium under XFCE. It does **not** bundle the [Kingdom runtime](https://github.com/wests-cmd/kingdom), provide a supported internal-disk installer, or grant the browser control of the computer.

[Download the published v1.0.0 ISO](https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.0/centipede-os-1.0.0-x86_64.iso) · [All v1.0.0 assets](https://github.com/wests-cmd/Centipede-os/releases/tag/v1.0.0) · [Beginner USB guide](docs/INSTALLATION_GUIDE.md)

Writing an image erases the selected USB. Check its name and capacity before approving a writer. The live session does not install itself on the internal drive; session files may disappear at shutdown.

The published image contains the original desktop. Refreshed desktop and everyday-app configuration on main require a separately tested, tagged release before becoming updated stable downloads.

Source media controls are reviewed in [capture and capability notes](docs/JARVIS_CAPABILITY_REVIEW.md) and [Windows validation](docs/WINDOWS_AUDIT_VALIDATION.md). The optional Camera, screen & mic panel captures only after you start it; preview is not image understanding. Source changes do not update published download assets.

## Project map

| Area | Source | Responsibility |
| --- | --- | --- |
| Browser app | [App.tsx](src/App.tsx), [main.tsx](src/main.tsx) | Desktop views and browser state |
| Web/API server | [production.ts](src/server/production.ts), [routes.ts](src/server/routes.ts) | Bun SPA hosting, shared companion API and local-admin read proxy |
| Kingdom adapter | [adapter](src/api/kingdomAdapter.ts), [proxy](src/server/kingdomReadProxy.ts) | Optional separate service; no embedded Kingdom engine |
| Debian image | [live-build configuration](packaging/live-build/config), [builder](scripts/build-live-image.sh) | Boot media and image services |
| Mobile shells | [android](android), [ios](ios), [Capacitor config](capacitor.config.ts) | Native WebView projects and separate signing gates |
| Release/testing | [targets](release/targets.json), [scripts](scripts), [tests](tests), [workflows](.github/workflows) | Build, validation and publication |

See [Architecture](docs/ARCHITECTURE.md) for the difference between Bun hosting, the static live-image server and native mobile shells.

## Run locally

With Bun and Git installed, run from the repository root:

```sh
git clone https://github.com/wests-cmd/Centipede-os.git
cd Centipede-os
bun install --frozen-lockfile
bun start
```

This builds `dist/` and starts the Bun web/API server, default port **3000**. Open `http://localhost:3000` on that computer for local administration. Stop with Ctrl+C.

Set `HOST=127.0.0.1` in the process environment for loopback-only use. Without an explicit `HOST`, the production server selects loopback plus a detected network address; it prefers private IPv4 but can fall back to another non-link-local interface. Do not assume that default suits an untrusted network.

The two-process Vite setup is in [Development](docs/DEVELOPMENT.md).

## Configuration

| Variable | Actual consumer |
| --- | --- |
| `HOST`, `PORT` | Bun listening hosts and port; default port 3000 |
| `PUBLIC_URL` | Bun phone-facing advertised address, not administrative authority |
| `KINGDOM_API_URL`, `KINGDOM_API_TOKEN` | Server-side external Kingdom connection |
| `CENTIPEDE_API_PORT` | Vite proxy target, default 3001 |
| `CENTIPEDE_PUBLIC_URL` | Compose substitution into container `PUBLIC_URL`, not a native server variable |

Keep credentials in the server environment, outside source control. Never paste a Kingdom token into a browser URL. See [configuration details](docs/DEVELOPMENT.md).

## Verification

Documentation navigation: `python scripts/check_docs.py` (Python 3 standard library). CI checks the same local targets and required README sections; it does not check external URLs or prove runtime completion.

```sh
bun x tsc --noEmit
bun run test
bun run build
```

These cover types, the configured unit suite and the web bundle. They do not certify an ISO, physical hardware, device signing, installed-OS recovery or a live Kingdom task. Other checks are in [Development](docs/DEVELOPMENT.md).

## Operations and updates

[Operations](docs/OPERATIONS.md) covers service entrypoints, health, logs, pairing and release boundaries. Browser asset refresh, Docker replacement and OS-media updates are separate operations. No browser refresh installs or rolls back Kingdom or the OS.

Safe Graphics and QEMU smoke checks are in the image build; physical display, Wi-Fi, Secure Boot and low-memory results need separate evidence. See the [boot checklist](docs/BOOT_RECOVERY_CHECKLIST.md).

## Integrations

- [Kingdom](https://github.com/wests-cmd/kingdom) is independently operated. Centipede's server offers allowlisted **GET** observations to verified local-admin requests; execution, approvals and grants remain Kingdom's responsibility.
- Companion enrollment requires the Bun API, host-local administration and short-lived pairing on a trusted private network. It does not provide mobile task execution or distributed-worker enrollment.
- [Community Discord](https://discord.gg/4b8f9YS2Wp) provides help and approved reference notes, not bundled execution authority. Never share credentials or pairing codes there.

See [integration guide](KINGDOM_INTEGRATION.md), [API contract](KINGDOM_CENTIPEDE_API_CONTRACT.md) and [observation scope](docs/operations/KINGDOM_READ_OBSERVATIONS.md).

## Status and roadmap

[Project status](docs/PROJECT_STATUS.md) distinguishes source, published assets and physical/runtime gates. Stable remains **v1.0.0**, verified from the release listing on 2026-10-27. Android/iPhone stable distribution remains blocked in the target manifest pending signing and explicit enablement.

Draft visual, animation, Bluetooth or autonomous-work proposals are not implied by a dashboard screenshot or successful web build.

## Documentation

Start with the [documentation index](docs/README.md): [Architecture](docs/ARCHITECTURE.md) · [Development](docs/DEVELOPMENT.md) · [Operations](docs/OPERATIONS.md) · [Project status](docs/PROJECT_STATUS.md).

Historical reports remain dated evidence, not automatic proof about current source or installed devices. The [license](LICENSE) and Debian/package attribution remain applicable.
