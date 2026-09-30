# Centipede OS v1.0.0 release candidate reality

**Core version source:** `package.json` (`1.0.0`)
**Target release gate:** `release/targets.json`
**Kingdom compatibility:** protocol major `1`; contract version `1.4.0`; Kingdom remains an external service.
**Release state:** candidate only. No stable GitHub Release has been published.

## Verified on the prior branch head

The GitHub-hosted workflow run [36601824289](https://github.com/wests-cmd/Centipede-os/actions/runs/36601824289) completed the platform matrix at commit `127f0e1e40bc8c3c39e99926c293a4d0cf06d5dd`. It built and checked the Debian live ISO, byte-identical Live USB image, qcow2 VM media, Docker image, Android debug APK, and iOS Simulator app. QEMU reached the Centipede kiosk and local web app readiness marker. The main CI and CodeQL workflows also passed on that commit. These results predate the current synchronization/fixes and must be rerun before release.

## Target status

| Target | Current status | What the evidence means |
|---|---|---|
| Desktop web bundle | BUILDABLE | Static web app archive; requires an independently operated Kingdom service for Kingdom-backed actions. |
| ISO | BUILDABLE | Debian hybrid live image; boots to XFCE/Chromium kiosk and Centipede setup UI. Not a host-control OS. |
| Live USB | BUILDABLE | Byte-identical ISO image suitable for writing to USB media. |
| VM | BUILDABLE | qcow2 virtual optical-media image; boot validation passed on the prior branch head. |
| Docker | BUILDABLE | Centipede web app container; smoke-tested. It does not run Kingdom and is not published to a registry. |
| Android stable APK | BLOCKED | A debug APK was built for CI only. Stable distribution needs the project signing key and explicit enablement. |
| iOS device IPA | BLOCKED | Simulator app was built for CI only. Device distribution requires Apple signing/provisioning and explicit enablement. |
| Kingdom service | EXTERNAL | No live Kingdom deployment was available in the build verification. The Compose stack no longer impersonates it. |

The release manifest and `SHA256SUMS` are produced by the aggregate release validator only. It consumes artifacts from the same workflow run and checks build-job checksums against the downloaded files before packaging. Blocked targets are omitted. A stable release can contain only configured BUILDABLE targets after the synchronized branch passes all release gates.

## Known limitations

The live image is a browser kiosk and has a limited firmware set; it does not install an operating system or add host-control capabilities. Android/iOS packages wrap the web application and do not add remote phone pairing. The Kingdom client can only report a live connection when configured against an actual external endpoint; this CI run did not validate a deployed Kingdom service.
