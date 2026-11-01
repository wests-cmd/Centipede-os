# Centipede OS boot and recovery checklist

This checklist tracks the boot-failure report from a physical USB boot. The exact ISO built in [platform run 37413139746](https://github.com/wests-cmd/Centipede-os/actions/runs/37413139746) passed the BIOS/UEFI and Safe Graphics QEMU gates on PR #117. That proves the build and virtual boot paths, not the user's physical PC/monitor; record physical results in the compatibility matrix below before making broad hardware claims.

## Implemented and verified in CI; physical test remains open

- [x] Keep ordinary graphics initialization as the default boot path.
- [x] Request a separate live-build fail-safe entry with `nomodeset` and `vga=normal`; rename it to **Centipede OS (Safe Graphics)** for both GRUB/UEFI and ISOLINUX/BIOS menus. The build hook fails if either menu lacks that entry.
- [x] Configure hybrid ISO boot with the BIOS Syslinux path and UEFI GRUB path.
- [x] Require signed UEFI boot components instead of silently falling back to unsigned GRUB.
- [x] Include available Debian firmware packages, including firmware from the `non-free-firmware` archive.
- [x] Set Centipede product identity in `/etc/os-release`, hostname, console issue text, and ISO application/publisher/volume metadata. Retain `ID_LIKE=debian` and Debian package/license notices.
- [x] Embed a SHA-256 file list in the ISO and retain the existing external release manifest/checksum validation.
- [x] Extend tagged platform CI to boot the exact candidate ISO in legacy BIOS normal mode, BIOS Safe Graphics mode, and signed UEFI normal/Safe Graphics modes. The existing boot readiness marker requires LightDM, Chromium, the local app, and the daily-use apps to be ready.

The build and QEMU checks above passed on PR commit `7d4f09ad36e868f280854fb0301b96b167f4b518`. The last public image remains the previously published v1.0.0 artifact; these CI artifacts have not been published as a new stable release.

## Required work before making broad hardware claims

- [ ] Rebuild and inspect the generated GRUB and ISOLINUX menus, ISO label, `/etc/os-release`, and all installed-system branding locations. This live image does not currently provide a disk installer, so there is no installed-system boot menu to validate yet.
- [x] Verify the signed UEFI image boots with Secure Boot enabled in QEMU in normal and Safe Graphics modes.
- [ ] Verify signed UEFI boot on a physical Secure Boot machine; document how to disable Secure Boot only if validation fails and support is intentionally dropped.
- [ ] Add an automatic graphical failure path that reaches a readable console/recovery UI when LightDM or the display server cannot start. A menu choice alone is not automatic fallback.
- [ ] Add a non-animated desktop mode selected for low memory/graphics and prove software rendering works.
- [ ] Keep Kingdom, network access, local models, and visual effects from gating first desktop readiness. The desktop smoke test currently runs with Kingdom external and unavailable; no Kingdom task is required for boot.
- [ ] Provide memory checks, a low-memory mode, measured 4 GB usability, and a supported swap/zram policy.
- [ ] Add sanitized boot diagnostics export (GPU, available display modes, RAM, CPU, firmware mode, kernel, and failed services); exclude tokens, credentials, and private user data.
- [ ] Add clear offline and missing Wi-Fi firmware status. Firmware inclusion does not guarantee every device has supported firmware.
- [ ] Add architecture and minimum CPU-feature messaging for unsupported machines; ensure x86-64 builds use a conservative processor baseline.
- [ ] Keep the previous kernel and add a recovery entry after a tested multi-kernel and rollback design exists.
- [ ] Design an installed OS updater with signed/versioned artifacts, staging, atomic activation, rollback, and interrupted-update recovery. The live USB currently has no persistent system installer or self-updater.

## Installation and disk safety

- [ ] Design a real disk installer before exposing any destructive controls.
- [ ] Distinguish boot USB, internal disks, SD cards, and other removable disks; exclude boot media from automatic destination selection.
- [ ] Calculate space requirements and update headroom before any disk change.
- [ ] Require a confirmation wall naming the exact target model, capacity, existing partitions/OS, and destructive action.
- [ ] Journal/checkpoint install work and recover safely from power loss, removal, full disk, or package failure.
- [ ] Prove Live mode never modifies internal disks without explicit authorization.

## Release and hardware test gates

- [ ] Every release must hash and boot-test the exact ISO uploaded to the release, in BIOS and UEFI and normal and Safe Graphics modes.
- [ ] Test offline startup and low-memory startup. Add installer, reboot, interrupted-install, corrupt-config, failed-service, clock, network, and recovery fault injection when those features exist.
- [ ] Maintain physical-machine results for legacy BIOS and UEFI, Intel/AMD/NVIDIA graphics, older integrated GPUs, laptops/desktops, HDMI monitors, and the monitor/TV that showed “Unsupported Mode”. QEMU does not substitute for physical tests.
- [ ] Keep this release blocked from broad hardware-stability claims until the physical display-mode failure is reproduced and Safe Graphics is confirmed on that machine.

### Physical compatibility results

| Device | Firmware | GPU | Display | Normal boot | Safe Graphics | Notes / date |
|---|---|---|---|---|---|---|
| User's USB boot test machine | Legacy-style path (from report) | Unknown | Monitor showed “Unsupported Mode” | Failed | Not yet retested | Record exact model/GPU/display mode when available |
| QEMU CI run 37413139746 | BIOS + Secure Boot UEFI | Emulated | Virtual display | Passed | Passed | Exact ISO reached desktop readiness in all four BIOS/UEFI × normal/Safe Graphics combinations; 2026-10-06 |
