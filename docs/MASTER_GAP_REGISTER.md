# Centipede platform build status

This replaces the earlier gap register, whose entries claimed operating-system, storage, mobile-pairing, rollback, and security capabilities that this repository does not provide.

The current target map is [`SHIP_REALITY_MATRIX.md`](SHIP_REALITY_MATRIX.md). Build and signing instructions are in [`PLATFORM_BUILD_GUIDE.md`](PLATFORM_BUILD_GUIDE.md), and machine-readable release identities live in [`release/targets.json`](../release/targets.json).

## Product boundary

The shipped application is a browser UI that calls a separately deployed Kingdom API. The ISO/Live USB/VM jobs package Debian Linux and start that UI in a Chromium kiosk session. They do not implement a new kernel, host-command execution, Kingdom service, or verified host isolation. The native mobile projects package the same UI in a Capacitor WebView; remote phone pairing remains a prototype.

## Release gate

The stable workflow publishes only after all target jobs pass, including QEMU boot validation, Android release signing, iOS device signing, Docker health validation, and SHA-256 manifest generation. Branch builds are candidates. Android and iOS release jobs require signing secrets; missing or invalid credentials fail the tag workflow.

No statement in this register substitutes for a successful CI run or a published GitHub Release.
