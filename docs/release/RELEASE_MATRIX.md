# Centipede OS v1.0.0 target release matrix

**Core version:** `package.json` is the sole core version source.
**Target status and artifact names:** [`release/targets.json`](../../release/targets.json)
**Manifest/checksum producer:** `scripts/create-platform-release-manifest.ts`.

| Target | Artifact | Status | CI evidence / release gate |
|---|---|---|---|
| desktop | `centipede-os-{version}-desktop-web-bundle.tar.gz` | BUILDABLE | Web build archived; release packaging validates artifact bytes. |
| iso | `centipede-os-{version}-x86_64.iso` | BUILDABLE | Debian live-build plus QEMU desktop readiness smoke test. Current `main` adds the free daily-use application bundle; the public v1.0.0 ISO does not contain that update. |
| live-usb | `centipede-os-{version}-live-usb-x86_64.iso` | BUILDABLE | Same hybrid ISO bytes; byte comparison required. Writing it erases the selected USB. |
| vm | `centipede-os-{version}-x86_64.qcow2` | BUILDABLE | QEMU image structural and guest boot checks. |
| docker | `centipede-docker-image-{version}.tar` | BUILDABLE | Centipede web image build, HTTP/CSS/health smoke test, loadable tar. Kingdom is external. |
| android | `centipede-android-{version}-release.apk` | BLOCKED | Branch debug APK is validation only. Stable release requires retained signing secrets and explicit workflow enablement. |
| ios | `centipede-ios-{version}.ipa` | BLOCKED | Simulator app is validation only. Stable IPA requires Apple distribution provisioning/signing and explicit workflow enablement. |

Every target has an independent revision for artifact identity. The release workflow checks `v${package.json.version}`, packages only BUILDABLE targets, verifies downloaded build checksums, and creates one target manifest plus a combined manifest and checksum list. A missing or stale build artifact fails publication.

The stable `v1.0.0` GitHub Release is published. The refreshed desktop changes were merged to `main` as `f17a936`, with platform builds passing on the PR source commit. Those updated artifacts are not part of v1.0.0; a new version tag and successful publication workflow are required before users can download them. The live image has no internal-disk installer; consult the [beginner installation guide](../INSTALLATION_GUIDE.md) before writing a USB.
