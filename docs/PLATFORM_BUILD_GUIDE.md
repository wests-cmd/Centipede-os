# Platform build and signing guide

The `Centipede platform builds` workflow builds the OS disk formats and container on GitHub-hosted Linux. It builds a debug Android APK and iOS Simulator app for branch validation. A version tag switches mobile jobs to signed device-release builds. The stable release workflow waits for every target and publishes nothing if a target fails.

## Stable Android APK

Add these GitHub Actions repository secrets before creating a version tag:

- `ANDROID_KEYSTORE_BASE64`: base64-encoded release `.jks`/`.keystore` file.
- `ANDROID_KEY_ALIAS`: alias inside that keystore.
- `ANDROID_KEYSTORE_PASSWORD`: keystore password.
- `ANDROID_KEY_PASSWORD`: key password.

The same keystore must be retained for every update; Android rejects updates signed with a different key. Increment `release/targets.json` Android `revision` for each independently versioned Android update. CI verifies the APK signature with `apksigner`.

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

The workflow exports an App Store Connect IPA, uploads it to TestFlight, and attaches it to the GitHub Release. Configure internal/external tester groups in App Store Connect and complete Apple's review/distribution steps before users can install or receive store-managed updates. The repository does not contain Apple credentials; tag builds fail until these secrets are configured.

## OS images and Docker

CI uses Debian live-build to generate a bootable hybrid ISO. The same bytes serve as the ISO download and Live USB source. The VM target is a qcow2 image derived from that bootable image and checked with QEMU. QEMU boots the image in CI; the ISO uses an XFCE/Chromium kiosk to show the Centipede web app. The image does not include automatic Debian firmware discovery or a broad hardware firmware set, so Wi-Fi and some graphics devices may need separately supplied firmware. It does not install Kingdom or grant Centipede host-control capabilities.

The Docker job builds and runs the image, checks the web page, bundled CSS, and container health status, then attaches a loadable `linux/amd64` Docker archive. Load it with `docker load -i centipede-docker-image.tar`. The image is not pushed to a container registry by this workflow.

## Run and retrieve branch builds

Push the branch and open its `Centipede platform builds` Actions run. Branch builds are validation artifacts: Android is debug-signed and iOS is for Simulator only. They are not stable mobile releases. The ISO, Live USB, qcow2 VM, and Docker artifacts are attached to the Actions run for inspection. A stable GitHub Release requires a clean version tag, all jobs passing, and the mobile secrets above.
