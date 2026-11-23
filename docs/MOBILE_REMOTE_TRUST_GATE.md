# Phone pairing transport — experimental boundary and release gate

**Status: source-level hardening only, NOT certified remote phone pairing.** This document extends [issue #183](https://github.com/wests-cmd/Centipede-os/issues/183) and [GA gate #150](https://github.com/wests-cmd/Centipede-os/issues/150). Signed mobile packages, durable trusted-device identity, and verified remote TLS hosting remain blocked.

## Implemented constraints

- The local Centipede owner unlock must authorize pairing-code issuance, device listing and administrative revocation. A phone joining by code never receives that owner session.
- A pairing confirmation returns a bearer credential. When the transport peer is **not confirmed loopback**, that endpoint now rejects HTTP without a transport-adapter-confirmed TLS property. `Host`, `Origin`, `Forwarded` and `X-Forwarded-Proto` headers cannot claim secure transport.
- A remote device bearer action (including self-revocation) also refuses unverified plaintext transport. Legitimate localhost-only development pairing can continue on the same device without TLS.
- The pairing QR's `centipedeEndpoint` comes from the **trusted server configuration/transport adapter**, not a request JSON `endpoint` or arbitrary HTTP Host header. Legacy local testing falls back to localhost only.
- A device can revoke **only its own** session unless the actual host owner is unlocked. A six-digit code is single-use and subject to bounded attempts and expiry; device-session tokens are random 256-bit values with bounded lifetime.
- **A configuration flag, forwarded header or test fixture cannot substitute for independently verified TLS identity**. This code does not implement HTTPS hosting, mobile certificate verification, encrypted backups, persisted revocation, push notifications, or authenticated vault uploads.

## Required before enabling production remote pairing

1. Deploy a verifiably authenticated TLS endpoint (or an equivalently trusted encrypted authenticated mesh connection) with fixed canonical hostname and correct certificate/public-key validation on the phone.
2. Prove the server receives a trustworthy TLS indicator from its own socket. A reverse proxy must be explicitly trusted and bound to a private socket; never infer security solely from user-supplied headers.
3. Bind device/session identity to owner, device, permissions and expiry; make revocation durable across restarts and other authorized nodes. No unexpected automatic privilege grants.
4. Test a real Android device, iPhone if supported, and DT1/Laptop 2 over normal and adversarial networks, including DNS rebinding, header spoofing, plaintext downgrade, code replay and session expiry.
5. Validate publisher signing identity and Play Store/App Store compliance before distributing device packages; never bypass an Android certificate mismatch.
6. Recheck all exact-commit CI and physical-matrix gates, then explicitly approve any capability/status change in `release/targets.json`.

**Current deployment caveat:** The experimental Centipede preview may advertise a LAN HTTP address in onboarding, but it is **not** a secure remote pairing endpoint. Off-device token issuance now fails closed on that transport. The on-screen connection guidance must not promise successful insecure remote pairing as a product feature. See [DOWNLOADS](../DOWNLOADS.md) for currently published products; do not claim the immutable RC11 files include these changes.
