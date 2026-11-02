# Centipede OS public-user implementation blueprint

## Status
This is a runnable, static onboarding prototype, NOT a production installer, signed package, connected Kingdom client or completed release. It does not change the host computer. Do not represent its checks as integration or device testing.

## Immediate integration
1. Integrate the four wizard screens as React components under `src/features/onboarding/` after inspecting existing routes and component conventions.
2. Replace the static finish summary with a backend setup API that validates a typed preferences schema and requires explicit approval for system changes.
3. Use Kingdom's authenticated pairing and authorization APIs. Never expose tokens in browser storage or logs.
4. Persist non-secret preferences via the app's existing configuration layer. Store credentials only through a platform-backed secure credential store.
5. Provide a real download center backed by a release manifest. Show supported OS, architecture, checksum, signature, version, and release channel. Do not label a debug APK as a production build.
6. Add keyboard, screen-reader, high-contrast, and low-resolution testing.

## Release engineering
- Make main-branch CI and docs checks required; include browser tests in release dependencies.
- Run release builds against the exact tagged commit and publish immutable checksums and signed provenance.
- Test USB boot and safe graphics on physical machines; test destructive installer flows only on disposable media with explicit destination confirmation.
- Certify Windows and Linux desktop installers on clean machines; test Android publisher signing and physical installation; test iOS device provisioning and installation.
- Verify Kingdom pairing, approval, denial, revocation, reconnect, and offline behavior end-to-end.

## Suggested staged PRs
PR1: onboarding UI and accessibility tests.
PR2: validated configuration and Kingdom setup API.
PR3: release-manifest-backed downloads and verified installation links.
PR4: platform install and update acceptance tests.

## Local preview
From the `web` directory, run `python3 -m http.server 8000` and open http://localhost:8000 . This is only for developers; end users must receive a prepackaged installer or hosted onboarding.

## Test
`python3 -m unittest discover -s tests -v`
