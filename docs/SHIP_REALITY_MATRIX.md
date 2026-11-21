# CENTIPEDE OS — CURRENT SHIP REALITY MATRIX

**Published identities:** `v1.0.0` historical stable-labelled prototype and `v1.0.1-rc.9` preview (older tag commit `2261b27d`, not current main). Current main core version is `1.0.1`; GA certification remains NO.
**Kingdom compatibility:** Protocol major `1`; contract version `1.4.0`
**Authoritative target gates:** [`release/targets.json`](../release/targets.json)

| Target | Evidence in this repository | Gate | Publication status |
|---|---|---|---|
| Desktop web bundle | React/Vite archive; release manifest and SHA-256 checksums | Published `v1.0.0` artifact | Published historical bundle; current `main` not released |
| Bootable ISO | Debian hybrid live-build image; QEMU kiosk smoke evidence from older build | Published `v1.0.0` artifact | Historical live ISO; not a persistent installer |
| Live USB | Hybrid ISO for removable USB boot | Published `v1.0.0` artifact | Historical live USB; no install-to-disk workflow |
| VM image | qcow2 artifact; previous QEMU startup smoke test | Published `v1.0.0` artifact | Historical VM media; current `main` not included |
| Android | Capacitor Android project; branch debug APK built and signature-verified. | BLOCKED for stable distribution until retained signing key secrets and explicit workflow enablement | Debug APK is a CI validation artifact only |
| iOS | Capacitor iOS project; Simulator app built on branch CI. | BLOCKED for device distribution until Apple signing/provisioning and explicit workflow enablement | Simulator artifact is validation only; not installable on iPhone |
| Docker image | Bun web-server image (Kingdom service external) | Published `v1.0.0` tar archive | Loadable Docker tar available; no registry claim |
| Kingdom service | Not implemented in this repository; Compose no longer impersonates it with a Python base image | External dependency | Must be separately deployed and runtime-verified |

The successful platform build is run [36599915906](https://github.com/wests-cmd/Centipede-os/actions/runs/36599915906) on commit `ef7ba3b`. The new local Files workspace still requires real OS and installation verification. The ISO is an actual Debian live image and reaches Centipede's browser-based first-run setup; it is not a host-control operating system. Android/iOS wrap the same web app; native remote-phone features remain unavailable. Kingdom is a separate service and was not deployed or live-integration-tested in this build. The GitHub Release [`v1.0.0`](https://github.com/wests-cmd/Centipede-os/releases/tag/v1.0.0) was published on September 30, 2026 with the five nonmobile targets and checksums. This is historical release evidence only; it does not validate today's `main` or constitute a complete daily-driver OS. Blocked mobile targets are omitted from the stable target manifest; a tag release can publish only the verified buildable targets after the synchronized branch passes CI.
