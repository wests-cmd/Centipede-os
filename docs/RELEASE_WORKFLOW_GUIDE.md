# Centipede OS Release Workflow

`package.json` is the core version source of truth. `release/targets.json` is the checked-in target gate: it lists independently versioned target revisions and marks a target buildable only when a real builder exists. The release builder fails closed for blocked targets and for version/tag mismatches.

The stable tag workflow calls `platform-builds.yml` and waits for the ISO/USB/VM, signed Android, signed iOS, and Docker build/smoke jobs. It separately type-checks and tests the desktop bundle. The final job downloads every CI artifact, validates file presence, computes SHA-256 values, and writes per-target plus combined manifests before publishing. A tag must exactly match the package version (`v1.0.0`).

Stable mobile release jobs require signing credentials described in `PLATFORM_BUILD_GUIDE.md`; missing secrets fail the release. Docker image and VM boot are smoke-tested on Linux CI. Kingdom is an external service; its protocol major and contract version are recorded separately from Centipede's product version. Release tags are not publishable until these jobs have passed.
