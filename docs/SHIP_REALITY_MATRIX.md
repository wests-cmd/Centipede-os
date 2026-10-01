# CENTIPEDE OS — SHIP REALITY MATRIX

**Public release:** Centipede `1.0.0` (`package.json`)
**Desktop refresh merge:** `f17a9365f223572dc0ea411dfbfdf214eee3ed5a`
**Kingdom compatibility:** protocol major `1`; contract version `1.4.0`
**Authoritative target gates:** [`release/targets.json`](../release/targets.json)

| Target | What actually exists | Gate | Publication status |
|---|---|---|---|
| Desktop web bundle | React/Vite app; tarball published in v1.0.0 | BUILDABLE | The updated desktop design is on `main`, but only the earlier bundle is published. |
| Bootable ISO | Debian live-build hybrid amd64 ISO; QEMU reached the refreshed desktop readiness marker | BUILDABLE | v1.0.0 image is public. Updated image built in [platform run 36805229329](https://github.com/wests-cmd/Centipede-os/actions/runs/36805229329), not yet in a new release. |
| Live USB | Same hybrid ISO bytes as the ISO asset | BUILDABLE | v1.0.0 image is public. Updated output is validated but unpublished. Flashing it erases the selected USB. |
| VM image | QEMU qcow2 virtual optical-media image; structural and guest boot checks pass | BUILDABLE | v1.0.0 image is public. Updated output is validated but unpublished. Attach it as virtual CD media; it is not an installed hard disk. |
| Docker image | Centipede web app container; HTTP/CSS/health check passed | BUILDABLE | v1.0.0 archive is public. The updated image is CI-only and is not pushed to a registry. It does not include Kingdom. |
| Android | Capacitor project; debug APK built and verified in CI | BLOCKED for stable distribution | No signed release APK. Signing keystore, pinned certificate fingerprint, and explicit workflow enablement are needed. |
| iOS | Capacitor project; iOS Simulator app launched in CI | BLOCKED for device distribution | Simulator build is not installable on iPhone. Apple distribution signing/provisioning and explicit enablement are needed. |
| Kingdom service | Separate project and deployment | EXTERNAL | No live Kingdom deployment was connected for the platform build. |

The successful current-main candidate checks ran on PR source commit `1f99f79eddb3dd06bd86dbc55074b20993f87d0b`; that source was merged as `f17a9365f223572dc0ea411dfbfdf214eee3ed5a`. CodeQL and primary CI passed. A separate Copilot reviewer failed before analysis because its configured model was unsupported. That result is not a clean review; it reported no source finding.

The current images are live boot media. They do not install to an internal drive and do not provide a disk installer or persistent user storage. The refreshed ISO/USB/VM build artifact is approximately 3.35 GB combined. See the [beginner USB guide](INSTALLATION_GUIDE.md) before writing the image to removable media.
