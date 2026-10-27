# Architecture

Source audit: main snapshot `7acda98`, 2026-10-27. Implementation locations are not certification of a deployed machine.

## Product boundaries

```text
React browser application
  -> Bun server: dist + /api/v1
     -> host-local companion administration
     -> allowlisted GET proxy -> separate Kingdom service

Debian live image:
  XFCE/LightDM -> Chromium -> Python static server -> dist
  (this image service is not the Bun API)

Capacitor Android/iOS:
  bundled dist in native WebView; separate signing/deployment gates
```

| Area | Implementation | Boundary |
| --- | --- | --- |
| Browser desktop | [main.tsx](../src/main.tsx), [App.tsx](../src/App.tsx), [components](../src/components) | Rendering does not imply host privileges |
| Workflows/AI/tools | [workflow](../src/workflow), [ai](../src/ai), [tools](../src/tools), [skills](../src/skills) | Interfaces/local state machines do not prove an external task completed |
| Knowledge/search | [learning](../src/learning), [search](../src/search), [ingest](../src/ingest) | User records stay separate from source/release artifacts |
| Web/API | [production.ts](../src/server/production.ts), [routes.ts](../src/server/routes.ts) | Bun hosts SPA and shared API |
| Request trust | [requestTrust.ts](../src/server/requestTrust.ts), [deviceTrust.ts](../src/security/deviceTrust.ts) | Socket/host/origin checks; headers alone cannot confer authority |
| Kingdom integration | [adapter](../src/api/kingdomAdapter.ts), [proxy](../src/server/kingdomReadProxy.ts), [observations](../src/api/kingdomObservations.ts) | Server-side token; allowlisted read-only proxy |
| Detection/updates | [platform](../src/platform) | Browser quota is not physical disk capacity; reload is not OS activation |
| Debian media | [configuration](../packaging/live-build/config), [builder](../scripts/build-live-image.sh) | Bookworm amd64 live system, not an internal-disk install |
| Mobile | [Capacitor](../capacitor.config.ts), [android](../android), [ios](../ios) | WebView projects, not signed-device distribution by themselves |

## Serving paths

`bun start` invokes [start-centipede.ts](../scripts/start-centipede.ts): build `dist/`, probe optional Kingdom status, then launch the Bun server on port 3000 by default. Kingdom unavailability does not stop local startup.

Vite's [configuration](../vite.config.ts) serves development UI on port 3000 and proxies `/api` to a separate API process on `127.0.0.1:3001` by default. Vite alone does not supply pairing/proxy routes.

The live image's [centipede-web.service](../packaging/live-build/config/includes.chroot/etc/systemd/system/centipede-web.service) runs Python's static server at `127.0.0.1:3000`, serving `/opt/centipede/web`. [centipede-desktop](../packaging/live-build/config/includes.chroot/usr/local/bin/centipede-desktop) waits for the page and starts Chromium. This server has no Bun API: pairing or authenticated proxy behavior is not established in the unmodified live image.

[server.ts](../src/server/server.ts) is a Node/in-process abstraction, not the production entrypoint selected by `bun start` or Docker.

## Identity, data and execution

Companion records are in-memory server state. Browser preferences and application persistence are separate; consult [workflow persistence](../src/workflow/persistence.ts) and [learning](../src/learning) before promising durability. Creating `data/` alone does not establish a persistent host database.

The router has public health/runtime reads and separately gated companion/Kingdom routes. Phone pairing uses HTTP and short-lived codes on a trusted private network. A paired phone is not a Kingdom Knight and gains no task/approval authority.

Kingdom remains a separate service with its own policy, grants and approvals. Protocol major `1` and contract version `1.4.0` are compatibility identifiers, not product versions or proof of a live connection.

## Delivery

The [Dockerfile](../Dockerfile) runs the Bun application as a non-root container user; it does not include XFCE, an OS installer or Kingdom. The [desktop builder](../scripts/build-release.ts) produces the web tarball; [platform CI](../.github/workflows/platform-builds.yml) owns image/container/mobile builds.

ISO and Live USB targets use identical hybrid ISO bytes. The converted qcow2 is live optical media, not an installed-system disk. Physical compatibility and installed recovery need separate verification.
