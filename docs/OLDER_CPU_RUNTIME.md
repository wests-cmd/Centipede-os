# Running the same server on an older CPU

DT1's Core 2 Duo E7500 exits with SIGILL even with the Bun Linux x64 baseline binary. Do not replace a working service when its compiled-process smoke test fails. Containerization does not add missing CPU instructions.

The production HTTP adapter also supports Node 22 or later. It uses the same API routes, socket-derived local-owner checks, pairing rate limits, selected knowledge store and locked Files boundary. This does not grant new execution permissions.

Build the frontend and server bundle on a compatible development machine with the repository's pinned dependencies:

```sh
bun install --frozen-lockfile
bun run build
bun build --target=node src/server/production.ts --outfile centipede-server-node.mjs
```

Copy the bundle and `dist/` to the older machine using authenticated transport. Record their checksums and source commit. Verify the installed Node runtime starts on that CPU, then run a separate loopback-only canary with private disposable Files and knowledge directories before changing its service. A passing build on a newer machine is insufficient.

```sh
HOST=127.0.0.1 PORT=3000 CENTIPEDE_WEB_ROOT=/absolute/path/to/dist \
CENTIPEDE_FILES_ROOT=/private/service-state/files \
CENTIPEDE_KNOWLEDGE_HOME=/private/service-state/knowledge \
node /absolute/path/to/centipede-server-node.mjs
```

Use the existing unprivileged service and its filesystem, address-family and resource restrictions; only replace its fixed executable command. Retain the previous code and service unit for rollback. Do not expose a Docker socket or enable owner actions to make the fallback start.

`tests/unit/node_runtime.test.ts` launches the actual Node process and checks API readiness, static content and HEAD responses, locked Files, foreign-origin rejection even with a forged forwarding header, malformed JSON and the request-body ceiling. This is separate from physical-machine acceptance and does not assert a stable OS release.
