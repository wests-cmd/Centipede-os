# Development

Run from the repository root. Commands follow [package.json](../package.json), [startup](../scripts/start-centipede.ts), [Vite](../vite.config.ts) and [browser-test configuration](../playwright.config.ts).

## Local web/API service

With Bun and Git installed:

```sh
bun install --frozen-lockfile
bun start
```

This rebuilds `dist/` and starts the Bun server, default port 3000. Open `http://localhost:3000` for host administration. Set `HOST=127.0.0.1` for loopback-only access.

For hot reload, use two terminals. Examples use POSIX environment syntax:

```sh
HOST=127.0.0.1 PORT=3001 bun run src/server/production.ts
```

```sh
bun run dev --host 127.0.0.1 --port 3000
```

Vite forwards `/api` to `CENTIPEDE_API_PORT`, default 3001. Run `bun run build` if production assets are needed directly. Vite alone is not the complete shared API service.

On PowerShell, set `$env:HOST='127.0.0.1'` and `$env:PORT='3001'` before the API command; use separate shells for different ports.

## Configuration consumers

| Setting | Consumer |
| --- | --- |
| `HOST` | Bun server, comma-separated listening hosts |
| `PORT` | Startup/production server, default 3000 |
| `PUBLIC_URL` | Server-advertised phone-facing address |
| `KINGDOM_API_URL` | Startup probe and read proxy |
| `KINGDOM_API_TOKEN` | Server-side authorization header, never a frontend build variable |
| `CENTIPEDE_API_PORT` | Vite proxy, default 3001 |
| `CENTIPEDE_PUBLIC_URL` | [Compose](../docker-compose.yml) substitutes into container `PUBLIC_URL` |
| `CENTIPEDE_E2E_PORT`, `CENTIPEDE_E2E_API_PORT`, `CENTIPEDE_E2E_KINGDOM_PORT` | Browser test ports, defaults 3000/3001/8100 |
| `CENTIPEDE_BUN`, `CENTIPEDE_E2E_PYTHON` | Explicit Bun/Python test executables |

[src/config/index.ts](../src/config/index.ts) provides in-app defaults, not a general same-named environment loader. Do not commit credentials or populated user `data/`.

Optional Kingdom observation requires its actual URL and credential in the Centipede server environment. The proxy requires both. Startup's availability probe does not prove credentials or all contract routes work.

## Verification

```sh
bun x tsc --noEmit
bun run test
bun run build
bun run test:contract
```

The package unit command selects `tests/unit/*.test.ts`; CI also runs `bun test`. Contract fixtures are not measurements of the owner's live backend.

Browser tests require Python 3, Bun, Node/npm-compatible tooling and installed Playwright Chromium:

```sh
bun x playwright install chromium
bun run test:e2e
```

The suite starts Vite, Bun API and a Python Kingdom contract fixture. CI installs browser system dependencies separately. Passing fixtures do not certify a physical desktop or signed phone app.

Additional checks include `bun run lint:reality` and the model-free benchmark safety harness:

```sh
python3 -m unittest discover -s scripts -p test_local_inference_benchmark.py -v
```

That harness test downloads no model and measures no inference throughput.

## Platform work

- `bun run build:release` produces the desktop web tarball under `release/desktop/`, not every platform.
- [Image builder](../scripts/build-live-image.sh) requires Linux live-build/QEMU tools, recreates `build/live/` and writes under `release/`. It is not a quick documentation check.
- [Platform CI](../.github/workflows/platform-builds.yml) owns ISO/USB/VM, Docker and mobile jobs.
- `bun run mobile:sync` rebuilds and mutates generated native assets; it is unnecessary for docs changes.
- [Mobile signing](MOBILE_SIGNING.md) explains protected distribution credentials; no keys belong in source.

A documentation refactor requires no moved imports, physical disk writes or OS installation.
