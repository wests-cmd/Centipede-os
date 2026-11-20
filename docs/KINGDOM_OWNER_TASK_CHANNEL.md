# Owner-verified Kingdom task channel (P0)

Centipede OS is **not** a finished daily-driver operating system. This change makes the first real owner-authorized task path available without turning the read-only Kingdom proxy into an unrestricted write proxy.

## Trust boundary and request lifecycle

1. On the **Centipede host only** (verified loopback peer AND localhost Host/Origin by `requestTrust.ts`), the owner enters the existing `KINGDOM_API_TOKEN` in the native/local UI once per session. It is never written to browser local storage, logs, or returned to the caller.
2. `POST /api/v1/kingdom/actions/unlock` requires `X-Centipede-Owner-Intent: 1`, a configured server-side Kingdom endpoint/token, and the correct owner code. Incorrect codes are throttled. On success the server issues an unguessable in-memory action session expiring after fifteen minutes.
3. `POST /api/v1/kingdom/actions/tasks` requires that session and the exact same local-admin boundary; only a bounded string prompt is accepted. The server forwards to `Kingdom POST /tasks` with the configured server-side bearer token and fixed safe metadata. Server errors, invalid confirmation IDs, timeouts and lost connections never result in fabricated task success.
4. `POST /api/v1/kingdom/actions/tasks/:id/cancel` requires the same authentication. `POST /api/v1/kingdom/actions/lock` revokes the local session.
5. Segmentor and the Tasks screen use that **same** action channel. Existing `GET /api/v1/kingdom/*` remains local-admin, allowlisted and read-only, and it is the authoritative source for subsequent task state. Segmentor does not infer success from an optimistic client response.
6. Remote/LAN/phone clients cannot unlock or submit through this local-only channel. A separate identity-bound mobile authorization design is required later. This is not a generic action proxy.

## Remaining ship gates

- Independently authenticate each mobile/device principal with revocable, least-privilege grants; do not expose owner token remotely.
- Bind native file manager, apps, sensors, workflow and skills controls to constrained, authenticated host/Kingdom services.
- Confirm Kingdom protocol compatibility and cross-machine task/run reconciliation after restarts, network partitions and partial outcomes.
- Harden Debian systemd/AppArmor/kiosk, implement rollback and recovery and produce verified installer/native-phone release artifacts.
- Execute full hardware trials on DT1 and Laptop 2; complete novice-user acceptance, resource budgets and public release checks.

## Tests added

See `tests/unit/kingdom_owner_actions.test.ts` for local-only enforcement, unlock rejection, credential secrecy, task confirmation, unauthorized mutation rejection, and unknown-outcome handling. No live DT1/Laptop 2 validation is claimed.
