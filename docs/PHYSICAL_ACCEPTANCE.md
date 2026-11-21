# Physical-machine release acceptance for Centipede OS

This is the missing **hardware evidence** for [issue #150](https://github.com/wests-cmd/Centipede-os/issues/150). Passing QEMU boots is necessary but does not establish that Laptop 2, DT1, or a beginner's installed desktop works. Do not mark the release general-availability-ready from branch CI.

## No-terminal graphical check

Newly built Centipede Debian images include **Applications → System → Centipede Readiness Check**. Double-click it to collect a private, non-destructive snapshot without opening a terminal or using sudo. The result displays on-screen and the JSON receipt is saved under `~/.local/share/centipede/physical-receipts/`. It diagnoses but does not install, restart, repair, or execute anything on Kingdom.

## Run locally after a supported Centipede boot

From the checked-out current Centipede source on a **Debian machine with Centipede actually installed or booted**, run:

```bash
python3 scripts/physical-acceptance.py --role laptop2 --mode desktop --output "$HOME/centipede-receipts"
```

For a headless DT1, use `--role dt1 --mode headless`. The command does not require root or Kingdom credentials and does not install anything. It only checks Linux RAM, systemd service hardening, real localhost HTTP responses, optional active desktop/Chromium app window and generates a private JSON receipt in your home directory. It never contacts remote machines or changes an OS setting.

After rebooting that machine, run again with `--previous "$HOME/centipede-receipts/<previous-file>.json"` to verify that the samples come from different kernel boots. **Only a separate real reboot can make that check pass.** Do not treat a container or VM pass as a physical-hardware acceptance record.

## Manual acceptance still required

These items stay `UNVERIFIED` in every automatically generated receipt because a utility cannot establish them just by checking localhost:

- Installer target selection and source-media safety, then booting the installed disk without the USB
- Signed update/recovery and rollback after power interruption; preservation of real user data
- A **real** owner-approved Kingdom task with canonical task ID, verified worker result and reconnect reconciliation across DT1/Laptop 2
- Worker quarantine/revocation and malicious-node isolation
- Signed Android/iOS identities and authenticated phone pairing; real vault upload/remote command authorization
- Minimum 24-hour continued use, CPU/RAM pressure, thermal/desktop responsiveness and novice-user journey

Collect unedited command output, physical device photos/screenshots where authorized, and before/after data integrity checks. Review receipts for secrets before attaching evidence to GitHub. Never include password values, personal files, network secrets or signing keys.

## Release decision

A completed `automatedChecksPassed: true` means **only the selected snapshot checks** succeeded; `gaCertified` is always `false`. An owner must separately approve the GA checklist in issue #150, and the release pipeline additionally requires exact-commit attestation. No direct disk writes, login bypass, blanket sudo, autonomous installs or simulation of Kingdom task success are performed here.
