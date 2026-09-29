# CENTIPEDE OS — CURRENT SHIP REALITY MATRIX

**Release identity:** Centipede `1.0.0` (from `package.json`)
**Kingdom compatibility:** Protocol major `1`; contract version `1.4.0`
**Authoritative target gates:** [`release/targets.json`](../release/targets.json)

| Target | Evidence in this repository | Gate | Publication status |
|---|---|---|---|
| Desktop web bundle | React/Vite app; packaged `dist/` tarball with generated manifest and SHA-256 validation; desktop typecheck and unit tests passed in PR CI for the verified branch commit | BUILDABLE; release tag still required | No stable GitHub Release published |
| Bootable ISO | Debian live-build creates a hybrid amd64 ISO; QEMU boots the image, reaches LightDM, starts Chromium, and confirms the local Centipede web app is ready. Final screen shows first-run setup. | BUILDABLE; platform CI passed | Branch validation artifact; not yet published as a stable release |
| Live USB | Byte-identical hybrid ISO, suitable for writing to USB media; byte comparison passed in CI. | BUILDABLE; platform CI passed | Branch validation artifact; not yet published as a stable release |
| VM image | Hybrid image converted to qcow2; structural check and QEMU kiosk-readiness smoke passed. Attach as virtual optical media. | BUILDABLE; platform CI passed | Branch validation artifact; not yet published as a stable release |
| Android | Capacitor Android project; branch debug APK built and signature-verified. Device release requires project signing key secrets. | BUILDABLE; signing secrets required for stable release | Branch debug artifact passed; stable APK blocked until key secrets are configured |
| iOS | Capacitor iOS project; Simulator app built on branch CI. iPhone IPA and TestFlight upload require Apple signing and App Store Connect credentials. | BUILDABLE; Apple account and secrets required for stable release | Simulator artifact passed; device release blocked until credentials are configured |
| Docker image | Bun multi-stage Docker build; container HTTP/CSS/healthcheck smoke passed; loadable Linux amd64 tar exported. | BUILDABLE; platform CI passed | Branch validation artifact; not pushed to a registry or published as a stable release |
| Kingdom service | Not implemented in this repository; Compose no longer impersonates it with a Python base image | External dependency | Must be separately deployed and runtime-verified |

The successful platform build is run [36599915906](https://github.com/wests-cmd/Centipede-os/actions/runs/36599915906) on commit `ef7ba3b`. The ISO is an actual Debian live image and reaches Centipede's browser-based first-run setup; it is not a host-control operating system. Android/iOS wrap the same web app; native remote-phone features remain unavailable. Kingdom is a separate service and was not deployed or live-integration-tested in this build. A stable GitHub Release has not been published. The tag release workflow remains fail-closed until Android and iOS signing requirements are supplied.
