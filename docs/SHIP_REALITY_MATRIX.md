# CENTIPEDE OS — CURRENT SHIP REALITY MATRIX

**Release identity:** Centipede `1.0.0` (from `package.json`)
**Kingdom compatibility:** Protocol major `1`; contract version `1.4.0`
**Authoritative target gates:** [`release/targets.json`](../release/targets.json)

| Target | Evidence in this repository | Gate | Publication status |
|---|---|---|---|
| Desktop web bundle | React/Vite app; packaged `dist/` tarball with generated manifest and SHA-256 validation | BUILDABLE; `v1.0.0` published | Stable assets are available from the [GitHub Release](https://github.com/wests-cmd/Centipede-os/releases/tag/v1.0.0) |
| Bootable ISO | Debian live-build creates a hybrid amd64 ISO; QEMU boots the image, reaches LightDM, starts Chromium, and confirms the local Centipede web app is ready. | BUILDABLE; `v1.0.0` published | This branch adds free everyday applications and a normal desktop app menu; CI is still required before shipping those changes. |
| Live USB | Byte-identical hybrid ISO, suitable for writing to USB media; byte comparison passed in CI. | BUILDABLE; `v1.0.0` published | Follow-on desktop/app changes on this branch are not released yet. |
| VM image | Hybrid image converted to qcow2; structural check and QEMU boot readiness passed. Attach as virtual optical media. | BUILDABLE; `v1.0.0` published | Follow-on desktop/app changes on this branch are not released yet. |
| Android | Capacitor Android project; branch debug APK built and signature-verified. | BLOCKED for stable distribution until retained signing key secrets and explicit workflow enablement | Debug APK is a CI validation artifact only |
| iOS | Capacitor iOS project; Simulator app built on branch CI. | BLOCKED for device distribution until Apple signing/provisioning and explicit workflow enablement | Simulator artifact is validation only; not installable on iPhone |
| Docker image | Bun multi-stage Docker build; container HTTP/CSS/healthcheck smoke passed; loadable Linux amd64 tar exported. | BUILDABLE; platform CI passed | Branch validation artifact; not pushed to a registry or published as a stable release |
| Kingdom service | Not implemented in this repository; Compose no longer impersonates it with a Python base image | External dependency | Must be separately deployed and runtime-verified |

The successful platform build is run [36599915906](https://github.com/wests-cmd/Centipede-os/actions/runs/36599915906) on commit `ef7ba3b`. The ISO is an actual Debian live image and reaches Centipede's browser-based first-run setup; it is not a host-control operating system. Android/iOS wrap the same web app; native remote-phone features remain unavailable. Kingdom is a separate service and was not deployed or live-integration-tested in this build. The stable `v1.0.0` release is published; this branch's changes require a new successful validation before a follow-on release. Blocked mobile targets are omitted from stable target manifests.
