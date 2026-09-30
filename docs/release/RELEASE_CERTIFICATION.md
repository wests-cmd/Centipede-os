# Centipede OS v1.0.0 release gate report

**Status: RELEASE BLOCKED pending synchronized-branch CI and stable-tag validation.** No stable GitHub Release has been published.

## Proven on the previous branch head

At commit `127f0e1e40bc8c3c39e99926c293a4d0cf06d5dd`, GitHub Actions built and validated the Debian live ISO/USB image, qcow2 VM image, Docker web image, Android debug APK, and iOS Simulator app. QEMU reached the Centipede kiosk readiness marker. Main CI and CodeQL passed. These checks must rerun against the synchronized/fixed PR head.

## Stable target decisions

- Desktop bundle, ISO, Live USB, VM, and Docker are configured BUILDABLE and are eligible for the stable target manifest after the new release workflow passes.
- Android stable APK is BLOCKED until the project configures the long-lived signing secrets and explicitly enables its signed release job. The branch debug APK is not a user-updateable stable release.
- iOS device IPA is BLOCKED until Apple distribution certificate/profile secrets and explicit job enablement are configured. Simulator output is not installable on iPhone; App Store Connect/TestFlight upload is not part of the GitHub release gate.
- Kingdom is an external dependency. The Docker image contains the Centipede web app and does not claim to run Kingdom. No live Kingdom deployment was tested.

The release publisher has only the permissions it needs. Build jobs are read-only. One aggregate validator owns release manifests and checksums and excludes BLOCKED targets. A stable release is not certified until the synchronized branch passes CI, security, image boot, Docker smoke, artifact-integrity, and tag/version checks.
