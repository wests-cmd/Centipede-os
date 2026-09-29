# CENTIPEDE OS — CURRENT SHIP REALITY MATRIX

**Release identity:** Centipede `1.0.0` (from `package.json`)
**Kingdom compatibility:** Protocol major `1`; contract version `1.4.0`
**Authoritative target gates:** [`release/targets.json`](../release/targets.json)

| Target | Evidence in this repository | Gate | Publication status |
|---|---|---|---|
| Desktop web bundle | React/Vite app; `npm run build`; packaged `dist/` tarball with generated manifest and SHA-256 validation | BUILDABLE; release CI must pass | No release published by this change |
| Bootable ISO | Debian live-build config creates hybrid amd64 ISO; kiosk boots bundled web app. CI builds and verifies file output; QEMU smoke verifies kernel boot. | BUILDABLE; release job required | Awaiting platform CI |
| Live USB | Byte-identical hybrid ISO, suitable for writing to USB media. | BUILDABLE; release job required | Awaiting platform CI |
| VM image | Hybrid image converted to qcow2; qemu-img check and QEMU boot smoke. | BUILDABLE; release job required | Awaiting platform CI |
| Android | Capacitor Android project; debug APK on branch CI, release APK on tags with supplied signing key; apksigner verifies signature. | BUILDABLE; signing secrets required for stable release | Awaiting platform CI and Android key |
| iOS | Capacitor iOS project; Simulator build on branch CI, device IPA and TestFlight upload on tags with Apple signing and App Store Connect API secrets. | BUILDABLE; Apple/App Store Connect secrets required | Awaiting platform CI and Apple profile |
| Docker image | Bun multi-stage Docker build; container HTTP/CSS/healthcheck smoke; exported loadable Linux amd64 image tar. | BUILDABLE; release job required | Awaiting platform CI |
| Kingdom service | Not implemented in this repository; Compose no longer impersonates it with a Python base image | External dependency | Must be separately deployed and runtime-verified |

A bootable Debian ISO is an actual Linux live image, but it launches Centipede as a Chromium web kiosk and is not a host-control operating system. Android/iOS wrap the same web app; native remote-phone features remain unavailable. All matrix build paths are implemented but remain unverified until platform CI succeeds. No target includes Kingdom.
