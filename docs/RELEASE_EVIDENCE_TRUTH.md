# Centipede release evidence and daily-driver status

As of November 20, 2026, the public [`v1.0.0` GitHub Release](https://github.com/wests-cmd/Centipede-os/releases/tag/v1.0.0) exists and contains desktop-web, live ISO, Live USB, qcow2 VM, Docker tar and SHA-256 manifest/checksums. It was published on September 30, 2026. It is a real *live/prototype distribution* but is not a complete permanent-install operating system.

PRs #149, #151 and #152 were merged into `main` **after** the published `v1.0.0` release. Their owner task channel, Workspace improvements and on-disk Files workspace are source changes, **not** deployed release assets.

**Do not publish a new general-availability or daily-driver claim** until issue #150 has affirmative evidence for: clean permanent installation; native Files/Apps; actual Kingdom task through a worker and verified result on DT1 and Laptop 2; correct owner and mobile/device permissions; adversarial recovery, updates/rollback, persistence, low-power hardware tests and novice acceptance. Verified CI is necessary but not sufficient.

Current machine evidence: *not collected by this repository change*. Stable phone APK and device IPA remain explicitly blocked by signing and live-device gates.
