# Prepare mobile release signing

Mobile signing material belongs to the project owner. Do not commit a keystore, certificate, provisioning profile, password, or private API key to this repository.

## Android APK

Create one long-lived release key on a trusted machine. Keep the keystore and its passwords backed up securely; future APK updates must use the same signing key.

```sh
keytool -genkeypair -v \
  -keystore centipede-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias centipede-release
```

In GitHub repository **Settings → Secrets and variables → Actions**, add these secrets:

- `ANDROID_KEYSTORE_BASE64`: base64 encoding of `centipede-release.jks`.
- `ANDROID_KEY_ALIAS`: `centipede-release` (or the alias you created).
- `ANDROID_KEYSTORE_PASSWORD`: the keystore password.
- `ANDROID_KEY_PASSWORD`: the alias password.

Then add repository variable `ANDROID_EXPECTED_CERT_SHA256` with the certificate fingerprint reported by:

```sh
apksigner verify --print-certs app-release.apk
```

Set repository variable `CENTIPEDE_ENABLE_SIGNED_ANDROID_RELEASE` to `true` only after the protected secrets and pinned fingerprint are in place. CI verifies the APK signature and pinned certificate before publishing. A mismatch stops the entire release; never change the pinned value just to make a build pass.

PowerShell can encode the keystore for the Actions secret without putting it in the repository:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('.\centipede-release.jks')) | Set-Clipboard
```

Paste that value directly into the GitHub secret field. Avoid saving the base64 output to a tracked file.

## iPhone IPA

An installable iPhone IPA needs an Apple Developer account, an Apple Distribution certificate exported as a password-protected `.p12`, and a provisioning profile matching bundle ID `com.westscmd.centipedeos`. The simulator app built in branch CI is not installable on a physical iPhone.

After creating the certificate and profile in the owner's Apple Developer account, add these GitHub Actions secrets:

- `IOS_CERTIFICATE_BASE64`
- `IOS_CERTIFICATE_PASSWORD`
- `IOS_PROVISIONING_PROFILE_BASE64`
- `IOS_TEAM_ID`
- `IOS_PROFILE_NAME`

Set repository variable `CENTIPEDE_ENABLE_SIGNED_IOS_RELEASE` to `true` only when those credentials are configured and the profile is valid. Apple credentials and App Store Connect/TestFlight publishing are not supplied by this repository. Never generate pretend credentials or commit certificate/private-key files.

## Release behavior

Signed Android and iOS device outputs are included only after their protected-signing workflows pass. Missing or invalid credentials fail closed. Simulator builds are test artifacts and must not be described as phone-installable releases.
