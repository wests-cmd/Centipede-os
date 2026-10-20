# Platform build and signing guide

The `Centipede platform builds` workflow builds the OS image formats and container on GitHub-hosted Linux. It builds a debug Android APK and iOS Simulator app for branch validation. A release runs automatically when a higher `package.json` version reaches `main`, or when a matching numbered RC/version tag is pushed. No manual release dispatch is required. Stable publication first checks `release/targets.json`; if its stable gate is still blocked, the workflow stops before expensive platform builds. A successful run creates the version tag and GitHub Release only after every BUILDABLE target artifact and its integrity checks pass. Signed mobile jobs require the corresponding `CENTIPEDE_ENABLE_SIGNED_ANDROID_RELEASE` or `CENTIPEDE_ENABLE_SIGNED_IOS_RELEASE` repository variable and signing credentials. See [MOBILE_SIGNING.md](MOBILE_SIGNING.md) for credential setup; iPhone device signing remains blocked until Apple credentials exist.

## Stable Android APK

Add these GitHub Actions repository secrets and set the stated fingerprint variable before enabling a version-tag release:

- `ANDROID_KEYSTORE_BASE64`: base64-encoded release `.jks`/`.keystore` file.
- `ANDROID_KEY_ALIAS`: alias inside that keystore.
- `ANDROID_KEYSTORE_PASSWORD`: keystore password.
- `ANDROID_KEY_PASSWORD`: key password.

The same keystore must be retained for every update; Android rejects updates signed with a different key. Increment `release/targets.json` Android `revision` for each independently versioned Android update. CI verifies the APK signature with `apksigner` and requires the pinned publisher certificate fingerprint.

## Stable iOS IPA

An iPhone-installable IPA requires an Apple Developer account and a valid Apple Distribution certificate plus App Store provisioning profile for bundle ID `com.westscmd.centipedeos`. Add these repository secrets:

- `IOS_CERTIFICATE_BASE64`: base64-encoded distribution `.p12` certificate.
- `IOS_CERTIFICATE_PASSWORD`: password used to export the `.p12`.
- `IOS_PROVISIONING_PROFILE_BASE64`: base64-encoded `.mobileprovision` profile.
- `IOS_TEAM_ID`: Apple Developer Team ID.
- `IOS_PROFILE_NAME`: exact provisioning profile name.
- `ASC_API_KEY_ID`: App Store Connect API key ID with permission to upload builds.
- `ASC_API_ISSUER_ID`: App Store Connect API issuer ID.
- `ASC_API_PRIVATE_KEY_BASE64`: base64-encoded `.p8` private API key.

TestFlight/App Store Connect upload is not part of the GitHub Release workflow. Configure and protect Apple signing/provisioning secrets, set the `CENTIPEDE_ENABLE_SIGNED_IOS_RELEASE` repository variable, update the target from BLOCKED to BUILDABLE, then validate device signing in a controlled tag run. App Store Connect credentials are not used by this workflow. The repository contains no Apple credentials. The branch Simulator build is validation only and is not an iPhone-installable IPA.

## OS images and Docker

CI uses Debian live-build with Centipede branding and licensing notices to generate a bootable hybrid ISO. The same bytes serve as the ISO download and Live USB source. The QEMU target is a qcow2 virtual optical-media image derived from the ISO; attach it as a virtual CD-ROM, not as an installed hard-disk image. The live desktop is intended to run LightDM, a maximized Chromium window, the local web app, and checks required everyday-app executables before emitting `CENTIPEDE_DESKTOP_READY`. The XFCE Applications menu provides Chromium, LibreOffice Writer/Calc, Thunderbird, and VLC. The candidate also contains a guided Calamares disk installer, but no candidate has passed a separate-target install/reboot and source-media protection test. Until that gate passes, use the image only in live mode or a disposable virtual machine; live-session files do not persist across restarts. The image does not include a broad hardware firmware set, so Wi-Fi and some graphics devices may need separately supplied firmware. It does not install Kingdom or grant Centipede host-control capabilities. See [the beginner USB guide](INSTALLATION_GUIDE.md) for writing and starting the live image. The ISO builder requests both legacy BIOS and UEFI boot paths, signed UEFI components, an internal SHA-256 list, non-free firmware availability, and a separate Safe Graphics boot entry using `nomodeset`; RC6 still needs a fresh exact-image boot and visual review.

On EFI systems, Safe Graphics requests a conservative 1024×768×32 GOP framebuffer mode when firmware offers it, in addition to `nomodeset`. The setting is ignored on legacy BIOS. The release remains blocked until the exact image passes its visual boot matrix.

The Docker job builds and runs the image, checks the web page, bundled CSS, and container health status, then attaches a loadable `linux/amd64` Docker archive. Load it with `docker load -i centipede-docker-image-1.0.0.tar` (replace the version with the release version). The image is not pushed to a container registry by this workflow.

## Run and retrieve branch builds

Platform outputs attached to a branch workflow run are temporary validation artifacts, not published stable downloads. Android is debug-signed and iOS is for Simulator only. A stable GitHub Release requires a new version tag, all BUILDABLE-target jobs passing, and artifact checksums/manifests matching. Blocked mobile targets are omitted; they require the signing secrets and enablement described above before inclusion. The current stable release remains v1.0.0 until a follow-on tag passes and its assets are published.

