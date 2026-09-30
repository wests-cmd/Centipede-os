# Centipede OS v1.0.0 target release matrix

**Core version:** `package.json` is the sole core version source.
**Target status and artifact names:** [`release/targets.json`](../../release/targets.json)
**Manifest/checksum producer:** `scripts/create-platform-release-manifest.ts`.

| Target | Artifact | Status | CI evidence / release gate |
|---|---|---|---|
| desktop | `centipede-os-{version}-desktop-web-bundle.tar.gz` | BUILDABLE | Web build archived; release packaging validates artifact bytes. |
| iso | `centipede-os-{version}-x86_64.iso` | BUILDABLE | Debian live-build plus QEMU kiosk readiness smoke test. |
| live-usb | `centipede-os-{version}-live-usb-x86_64.iso` | BUILDABLE | Same hybrid ISO bytes; byte comparison required. |
| vm | `centipede-os-{version}-x86_64.qcow2` | BUILDABLE | QEMU image structural and guest boot checks. |
| docker | `centipede-docker-image-{version}.tar` | BUILDABLE | Centipede web image build, HTTP/CSS/health smoke test, loadable tar. Kingdom is external. |
| android | `centipede-android-{version}-release.apk` | BLOCKED | Branch debug APK is validation only. Stable release requires retained signing secrets and explicit workflow enablement. |
| ios | `centipede-ios-{version}.ipa` | BLOCKED | Simulator app is validation only. Stable IPA requires Apple distribution provisioning/signing and explicit workflow enablement. |

Every target has an independent revision for artifact identity. The release workflow checks `v${package.json.version}`, packages only BUILDABLE targets, verifies downloaded build checksums, and creates one target manifest plus a combined manifest and checksum list. A missing or stale build artifact fails publication.

A successful branch validation run is not a published stable release. No stable GitHub Release exists until a version tag completes the synchronized release workflow.
