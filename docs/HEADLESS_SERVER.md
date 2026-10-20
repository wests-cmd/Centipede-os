# Headless recovery and server candidate

This optional image boots Centipede without depending on an existing Linux
installation or a working graphical desktop. It is live recovery media, not a
verified unattended disk installer. It never selects, formats or installs onto
an internal drive. Kingdom is not installed by this bootstrap.

Build with `CENTIPEDE_BUILD_PROFILE=server` and `CENTIPEDE_SERVER_SEED` pointing
to a JSON file containing version `1`, an owner Ed25519 `public_key`, network
`direct` or `dhcp`, and a lowercase `hostname`. The optional `admin` boolean
defaults to false. Setting it to true explicitly permits that key's user to
administer the newly booted live system with passwordless sudo. Never put a
private key in the seed, source repository or build service.

The dedicated headless workflow uses repository variables
`CENTIPEDE_SERVER_PUBLIC_KEY` and optionally `CENTIPEDE_SERVER_ADMIN=true`.
Its owner-specific candidate should not be distributed as a general release.
The desktop build keeps its normal graphical behavior; the SSH server is
enabled only when the server kernel flag and valid seed are present.

BIOS and UEFI menus automatically select the server entry after five seconds.
The server entry uses `nomodeset`, disables reuse of existing swap with `noswap`,
and boots to the non-graphical system target.
A person must still insert the USB, power on the machine and arrange USB boot
in firmware when necessary. An Ethernet cable cannot boot a corrupt operating
system without a separately configured network-boot or management facility.

For a direct cable, both computers use IPv4 link-local addresses (`169.254.*`);
the candidate does not enable NAT or add a default route. DHCP mode is for an
existing router. The hostname is advertised through the image's Avahi service
where the connecting client supports mDNS. Discover the address through the
client's Ethernet neighbor inventory or the boot receipt. Verify the Ed25519
host fingerprint through a trusted channel before accepting a new host key.
Use key-only SSH as `centipede-admin`; root and password SSH login are disabled.
Local SSH forwarding is allowed for access to a later configured web service.

`scripts/qemu-headless-server-smoke.py` checks BIOS live boot, actual SSH key
exchange, the host fingerprint against VM serial output, denial of an unrelated
key and preservation of a disposable sentinel disk. It does not prove owner
login, UEFI boot, physical OptiPlex compatibility, persistent installation or
Kingdom operation. The CI service does not possess the owner's private key.

Before replacing corrupted Linux, connect to the live environment, identify the
internal disk and confirm the intended erase target. Complete the separate disk
installation gate, then boot with the USB removed. Only after that verification
should this machine be treated as a persistent Kingdom server. See
`DISK_INSTALLATION_GUIDE.md` and `SHIP_REALITY_MATRIX.md` for remaining gates.

## Persistent installation blocker and next bounded task

The existing permanent installer is graphical Calamares. This live server
profile deliberately does not start a display manager, and key-only SSH access
does not by itself make Calamares a supported headless installer. Therefore a
headless OptiPlex cannot yet be declared permanently installed from this image.

Implement a separate SSH-driven offline BIOS installer first. It should inspect
the live source and available disks, produce a reviewable plan naming the target
by serial, size and path, and require a matching explicit confirmation before
any erase. Reject the boot medium, the root disk, ambiguous identity and mounted
targets. Copy the verified live system to the selected target, configure an
installed-system server bootstrap (the current one requires live media), install
the legacy BIOS bootloader, and preserve the owner's public key. Persistent
SSH host keys must be generated for the installed machine, not copied from CI.

Acceptance must run only against disposable QEMU image files: boot the live
candidate, install to a blank target with a second sentinel disk attached, shut
down, detach the ISO entirely, and boot solely from the installed target. Verify
owner-key login, reject an unrelated key, verify the source image and unselected
sentinel are unchanged, and test refusal of wrong serial, wrong size and source
disk selections before writes. Save command results, disk identities and boot
receipts. A passing live-boot smoke is not a substitute for this gate. Physical
installation remains blocked until this installer and the intended OptiPlex disk
identity are verified. A temporary display and Calamares remain an alternative;
an untested X-forwarded session is not an unattended headless installation path.
