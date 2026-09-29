# Centipede OS Installation Status

Centipede v1.0.0 provides a browser-based application plus CI builders for Debian live ISO/USB, a QEMU qcow2 VM, native Android/iOS WebView apps, and a Docker image. These targets run the same browser application; OS images use a Debian XFCE/Chromium kiosk and do not grant host-control capabilities. Stable downloads are available only after all platform gates pass and a GitHub Release is published.

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
