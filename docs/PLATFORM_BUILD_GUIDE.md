# Platform build and signing guide

The `Centipede platform builds` workflow builds the OS disk formats and container on GitHub-hosted Linux. It builds a debug Android APK and iOS Simulator app for branch validation. A version tag runs signed mobile jobs only when the corresponding `CENTIPEDE_ENABLE_SIGNED_ANDROID_RELEASE` or `CENTIPEDE_ENABLE_SIGNED_IOS_RELEASE` repository variable is set to `true`. Those targets remain BLOCKED and are omitted from the release until signing credentials and target configuration are ready. The stable release waits for every BUILDABLE target and publishes nothing if a required build or integrity check fails.

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

CI uses Debian live-build to generate a bootable hybrid ISO. The same bytes serve as the ISO download and Live USB source. The QEMU target is a qcow2 virtual optical-media image derived from the ISO; attach it as a virtual CD-ROM, not as an installed hard-disk image. This follow-on branch changes the QEMU readiness check to verify Linux boot, LightDM, a maximized Chromium desktop window, the local web app, and required everyday-app executables before emitting `CENTIPEDE_DESKTOP_READY`. The XFCE Applications menu will provide Chromium, LibreOffice Writer/Calc, Thunderbird, and VLC. The image does not include automatic Debian firmware discovery or a broad hardware firmware set, so Wi-Fi and some graphics devices may need separately supplied firmware. It does not install Kingdom or grant Centipede host-control capabilities. The changed image is not published until branch validation passes and a new release is created.

The Docker job builds and runs the image, checks the web page, bundled CSS, and container health status, then attaches a loadable `linux/amd64` Docker archive. Load it with `docker load -i centipede-docker-image-1.0.0.tar` (replace the version with the release version). The image is not pushed to a container registry by this workflow.

## Run and retrieve branch builds

Push the branch and open its `Centipede platform builds` Actions run. Branch builds are validation artifacts: Android is debug-signed and iOS is for Simulator only. They are not stable mobile releases. The ISO, Live USB, qcow2 VM, and Docker artifacts are attached to the Actions run for inspection. A stable GitHub Release requires a clean version tag, all BUILDABLE-target jobs passing, and artifact checksums/manifests matching. Blocked mobile targets are omitted; they require the signing secrets and enablement described above before inclusion.
