# Centipede OS v1.0.0 Release Certification

**Status: RELEASED AND VERIFIED.** The stable GitHub Release is published at [v1.0.0](https://github.com/wests-cmd/Centipede-os/releases/tag/v1.0.0).

- Tag: `v1.0.0`
- Release source commit: `e0051a65656cf7678d3d5d814243c0e3a5f44cae`
- Release workflow: [run 36790072167](https://github.com/wests-cmd/Centipede-os/actions/runs/36790072167) — success
- Manifest and checksum validation completed before publishing. The published manifest commit matches the stable tag target.
- Android stable APK and iOS device IPA remain blocked and were not published.

## Published and verified targets

The release manifest lists these `BUILDABLE` targets. GitHub’s published asset digest and byte size match the manifest for each artifact. Each SHA-256 entry also matches `SHA256SUMS`.

| Target | Published artifact | Size | SHA-256 |
|---|---|---:|---|
| Desktop | `centipede-os-1.0.0-desktop-web-bundle.tar.gz` | 110,264 bytes | `f227a499636bf79539516578a4222f842e067e8328fe4b69f32bfed3faf4e628` |
| ISO | `centipede-os-1.0.0-x86_64.iso` | 778,043,392 bytes | `41c46f01e7cabb0be89dedeb29010ae622df953f629550283424a9e396cc5e1b` |
| Live USB | `centipede-os-1.0.0-live-usb-x86_64.iso` | 778,043,392 bytes | `41c46f01e7cabb0be89dedeb29010ae622df953f629550283424a9e396cc5e1b` |
| VM | `centipede-os-1.0.0-x86_64.qcow2` | 777,322,496 bytes | `81bfda07d88d0ba011299a505b85082bdacbcbf2b9706aa88b474e4ec88c7d04` |
| Docker | `centipede-docker-image-1.0.0.tar` | 187,497,472 bytes | `1dc3aac8bae337fc8559512c2b1a2a33b541695d0c8a93c6f0732c09b828fc28` |

The ISO and Live USB assets are byte-identical, as recorded by their matching SHA-256 values. The Docker image is a Centipede web application image for `linux/amd64`; it does not contain or claim to run Kingdom.

## Verification performed

- Main CI passed typecheck, unit/security tests, companion interaction E2E, release lint, and desktop release build.
- CodeQL and JavaScript/TypeScript and Actions analysis passed on the merged source.
- Tag release workflow passed desktop build, Docker image build and HTTP smoke test, live ISO/USB/QEMU image build and validation, QEMU boot smoke test, manifest generation, artifact validation, and publication.
- Android debug APK and iOS Simulator build/startup smoke test passed in the branch-validation platform workflow. These are validation builds, not signed distribution packages.
- No live Kingdom deployment was tested. Kingdom is an independently operated dependency. The release manifest preserves Kingdom compatibility values: protocol `v1.0+`, protocol major `1`, contract version `1.4.0`.

## Blocked mobile distribution targets

- **Android stable APK:** blocked until the protected signing keystore, pinned `ANDROID_EXPECTED_CERT_SHA256`, and explicit signed-release enablement are configured.
- **iOS device IPA:** blocked until Apple distribution signing and provisioning are configured. Simulator output is not installable on iPhone.

Neither target appears as a published stable artifact.

## Required follow-up gate: native cross-client behavior

The current companion UI is a local browser demonstration and is not wired to the shared pairing API. A two-client browser E2E test confirms the pairing UI state remains isolated per client. Separate server API tests cover two client credentials, endpoint loss, reconnection, and independent revocation. Neither proves native Android/iOS app interoperability.

Before certifying native mobile interoperability:

1. Wire Android and iOS clients to the shared service pairing API.
2. Pair both clients independently and verify distinct device identities and credentials, shared service-side device state, and credential isolation.
3. Drop one client's connectivity while its peer remains online; reconnect and verify session recovery.
4. Revoke one device and verify only that device is denied after retry/reconnect.
5. Run the workflow in Android and iOS simulators, then on physical devices before store distribution; require signed release artifacts before marking either target publishable.

The stable v1.0.0 core release is complete for the five published targets above. The mobile interoperability checklist is a follow-up gate for native mobile certification, not a claim that those native features shipped.
