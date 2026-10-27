# Operations

Current entrypoints and boundaries supersede assumptions in older readiness reports. This guide does not certify an installed machine.

## Select the actual deployment

| Deployment | Control | Health/diagnostics |
| --- | --- | --- |
| Local Bun web/API | `bun start`; Ctrl+C stops the child server | `http://127.0.0.1:3000/api/v1/health` and process output |
| Docker web/API | [Compose](../docker-compose.yml), existing Docker environment | Container health and `docker compose logs centipede-web` |
| Debian live desktop | Image systemd service and XFCE autostart | Static page `http://127.0.0.1:3000/`, service journal, desktop log |
| Native mobile | Platform-specific debug/simulator/signed build | Native platform diagnostics, not host OS service management |

The image web service is Python static hosting, **not** the Bun API. Its home page does not prove health/API/pairing routes exist. Files are at `/opt/centipede/web`; the image launcher logs to `~/.cache/centipede-desktop.log`. See [Architecture](ARCHITECTURE.md).

Docker binds `0.0.0.0:3000`; default Compose mapping exposes host port 3000. Choose bindings deliberately. This is the web/API app, not the Debian desktop or bundled Kingdom.

## Pairing and security

Use the Bun service on a trusted private network. Open `http://localhost:3000` on its host to create a short-lived code, then use the printed phone address. Pairing records are in memory and disappear when that server restarts. A phone can revoke its own session; host-local administration manages devices.

Authority requires a loopback socket peer and localhost request host, with Origin/Fetch Metadata checks. Headers alone cannot confer it. Bridge/proxy deployments may fail the gate; do not weaken it to make pairing work. Plain HTTP enrollment must not be exposed to the public internet.

Keep `KINGDOM_API_TOKEN` server-side. The proxy permits allowlisted GET reads for verified local-admin requests, not task submission, grants, service controls or privileged updates. Activity counts are observation metadata, not proof of productive work. [Observation scope/freshness](operations/KINGDOM_READ_OBSERVATIONS.md) defines stale/unavailable states.

## Updates and recovery

| Change | Actual scope |
| --- | --- |
| Browser refresh | Newer page/JavaScript/styles already served; same-line patches refresh, major/minor changes prompt |
| Web/server deployment | Rebuild/restart the intended process; no automatic migration of pairing sessions |
| Docker replacement | Replace the intended container/image from verified artifacts |
| New ISO/USB/VM release | Build/verify new boot artifacts, followed by an explicit media-writing decision |

None of those browser operations installs or rolls back Kingdom or an installed OS. Back up user-selected files and exported/browser state before changing deployments. Health alone is not an end-to-end recovery test.

This source has no supported persistent disk installer, signed atomic installed-OS updater or automatic rollback. Live-session files may not persist. USB writing erases the exact selected target; use [the guide](INSTALLATION_GUIDE.md) and explicit owner target confirmation. No repair plan authorizes a silent disk write.

## Boot diagnosis

Use normal boot first; current image configuration also has a **Safe Graphics** choice. Record image hash, firmware, GPU/display and actual result. QEMU does not establish physical monitor, Wi-Fi or Secure Boot compatibility. See [boot/recovery checklist](BOOT_RECOVERY_CHECKLIST.md).

Configured `Restart=on-failure` or Compose `restart: unless-stopped` is not proof all failures recover. Broader recovery needs explicit fault-injection and physical results.

## Releases

[Target gates](../release/targets.json), [release workflow](../.github/workflows/release.yml) and [platform workflow](../.github/workflows/platform-builds.yml) distinguish buildable targets, branch artifacts and publication. Follow [release guidance](RELEASE_WORKFLOW_GUIDE.md), [platform guide](PLATFORM_BUILD_GUIDE.md) and [certification](release/RELEASE_CERTIFICATION.md), preserving signing keys and original evidence.

Do not reinterpret old zero-loss or five-second recovery claims as guarantees. Record revision, artifact/hash, deployment path, observed failure and verified outcome.
