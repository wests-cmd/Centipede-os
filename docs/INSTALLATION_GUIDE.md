# Centipede OS Installation Status

Centipede v1.0.0 provides a browser-based application plus Debian live ISO/USB, QEMU qcow2 VM, and Docker release artifacts. Android device APK and iOS device IPA distribution remain blocked pending publisher signing configuration. Download verified artifacts from the [v1.0.0 GitHub Release](https://github.com/wests-cmd/Centipede-os/releases/tag/v1.0.0). This follow-on branch changes the OS image to run Centipede in a maximized Chromium window, making XFCE's Applications menu available, and adds Chromium, LibreOffice Writer/Calc, Thunderbird, and VLC. These are free applications; email accounts and internet access are supplied by the user. The image does not include Kingdom or grant Centipede host-control capabilities. The follow-on build is not released yet.

## Build and run the web application

Requirements: Bun (which installs the exact locked dependencies).

```bash
bun install --frozen-lockfile
bun run build
bun start
```

The development server prints its local URL. Docker builds the static web UI and serves it on port 3000. This image does not provide Kingdom. Configure the Kingdom endpoint in the application to a separately deployed service the device can reach.

## Platform target status

Platform builds run in the `Centipede platform builds` GitHub Actions workflow. Branch CI produces validation APK/simulator outputs and ISO/USB/VM/Docker candidate artifacts. Stable tags produce release assets only after signing and image checks pass. See `PLATFORM_BUILD_GUIDE.md` for the repository secrets needed by stable mobile builds.
