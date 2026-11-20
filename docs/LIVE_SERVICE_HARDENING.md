# Debian live image static service hardening

The packaged `centipede-web.service` previously launched Python HTTP static file serving as `root`. The dedicated `centipede-web` non-login user is created by a chroot build hook, which also makes the static bundle root-owned and not group/world writable. The service now uses systemd `NoNewPrivileges`, empty ambient/capability sets, read-only system paths, restricted device access and private temporary files. It only binds `127.0.0.1:3000`.

After twenty failed two-second readiness checks, `centipede-desktop` opens `centipede-recovery` with Retry, View service diagnostics, and Use regular XFCE desktop. If no GUI is available, the script exits non-destructively. These changes affect only the packaged live ISO and require a new image build.

**Limits:** The image still serves the prebuilt *static web* bundle using Python; the privileged owner-task and on-disk Files API added on `main` require a separately deployed Bun API service. This PR does not bundle that service, install Kingdom, implement disk installation, provide safe graphics fallback if X/LightDM fail, or add atomic OS updates. Full QEMU + physical PC proof is mandatory under issue #150 before calling the OS daily-driver ready.

Tests: `tests/unit/live_service_hardening.test.ts` validates the packaged service and hook contract; it does not constitute live boot/attack evidence.
