# Centipede OS v1.0.0 Release Certification

**Gate status: NOT YET RELEASED.** PR #98 is under final review. No `v1.0.0` tag or stable GitHub Release exists yet. The tag-triggered release workflow must finish and its published assets must pass manifest and SHA-256 verification before release certification.

## Current PR verification

At PR head `06bfaacba4258a4ddeaddada0fd9d0d34842a3f4`:

- Main CI passed, including typecheck, unit/security suite, companion interaction E2E, and release build.
- CodeQL and JavaScript/TypeScript and Actions analyses passed.
- Platform build workflow passed: Debian live ISO/USB image, QEMU qcow2 image, Docker image smoke test, Android debug APK, and iOS Simulator build/startup smoke test.
- Signed Android APK and signed iPhone IPA jobs were skipped because distribution signing credentials and explicit release enablement are not configured.
- The separate optional Code Scanning AI Findings workflow failed because its runner rejected the requested model; this is an infrastructure/configuration failure. CodeQL completed successfully.
- Local two-client UI test passed and confirmed the current mobile companion demo keeps pairing state local to each client. Server API tests exercised two client credentials, loss of endpoint connectivity, reconnect, and independent revocation. These tests do not demonstrate native Android/iOS app interoperability.

## Stable target publication policy

The authoritative target list is `release/targets.json`. Only targets marked `BUILDABLE` are eligible for publication after the tagged workflow builds and validates them.

- **Desktop:** web application bundle; requires an independently operated web server and Kingdom service.
- **ISO:** Debian live boot image with Centipede application.
- **Live USB:** byte-validated USB-named copy of the hybrid ISO.
- **VM:** QEMU qcow2 disk image built from the live system.
- **Docker:** Centipede web application image. It does not contain or claim to run Kingdom.
- **Android:** blocked for stable distribution until protected signing configuration is supplied and the signed release job is enabled. A debug APK is validation output only.
- **iOS:** blocked for iPhone distribution until Apple signing/provisioning configuration is supplied. Simulator output is not an iPhone installable release.

Kingdom remains a separately operated external dependency. No live Kingdom deployment was verified in this release workflow. Preserve its real protocol/API compatibility identifiers; do not describe the Centipede Docker image as a Kingdom image.

## Required follow-up gate: native cross-client behavior

The current companion UI is a local browser demonstration and is not wired to the shared pairing API. Keep native mobile interoperation **uncertified** until all of these pass against one shared service:

1. Pair a real Android client and a real iOS client independently; confirm each receives a distinct device identity and credential.
2. Verify the clients see the same service-side trust/device state and cannot see each other's private credentials.
3. Drop one client's connectivity, keep the other operating, then reconnect and verify expected session recovery.
4. Revoke one device and prove only that device is denied after retry/reconnect.
5. Run this workflow in Android and iOS simulators (and on physical devices before store distribution), then require signed release artifacts before marking either target publishable.

## Final certification gate

Do not call v1.0.0 released until the PR is merged, the stable tag workflow succeeds, every published asset corresponds to a `BUILDABLE` target, the release manifest and SHA-256 checksums validate, and the resulting GitHub Release assets are downloadable and smoke-tested.