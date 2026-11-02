# Kingdom integration: current scope and production requirements

This package adds a read-only connection status bridge. It does not perform pairing, authorization, task execution, or compatibility negotiation. The health endpoint defaults to `/health` but must be checked against the deployed Kingdom version.

## Development preview

Set `KINGDOM_BASE_URL` to your HTTPS Kingdom URL (or localhost HTTP), optionally set `KINGDOM_HEALTH_PATH` to the verified health endpoint, and run `python3 backend/kingdom_bridge.py`. Open http://127.0.0.1:8765. No credentials are stored in browser code. The preview binds only to localhost.

## Production work

1. Inspect latest Kingdom API and protocol contracts; implement a versioned, typed adapter in Centipede's existing Bun server.
2. Implement explicit approved pairing, OS-keystore token storage, revocation and secure reconnect.
3. Negotiate capability versions; reject unsupported or downgraded contracts.
4. Route all sensitive tasks through Kingdom's authorization system, never direct browser execution.
5. Add integration tests for real Kingdom pairing, approvals, denial, revoke, reconnect and version mismatch.
6. Verify release builds on actual desktop and mobile devices.

A successful health check proves only network reachability, not compatibility or security.
