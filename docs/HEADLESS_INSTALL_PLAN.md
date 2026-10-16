# Read-only permanent installation planning

`python3 scripts/headless-install-plan.py inventory` runs only Linux storage
queries (`lsblk`, `findmnt`, `swapon`). Run it through the owner's verified SSH
connection after booting the headless live USB. Do not depend on the corrupted
Linux installation. This tool contains no formatting, partitioning, bootloader
installation, system copying or other disk execution code.

Inspect the inventory, then request a review plan with the actual whole-disk
path, exact serial and byte size:

```text
python3 scripts/headless-install-plan.py plan --target /dev/ACTUAL_DISK --serial ACTUAL_SERIAL --size ACTUAL_BYTES --output optiplex-plan.json
```

The example contains placeholders and must not be copied as a real selection.
Planning takes two independent observations and refuses changing storage state,
the live source disk, mounted descendants (including root), active or existing
swap, read-only or unknown states, missing/duplicate serials and ambiguous paths.
It rejects targets below 8 GiB. Unknown source ancestry fails closed.

Plans are exclusively created with read-only permissions, include the observed
inventory, and bind serial, size, path, WWN and inventory to a SHA256 digest.
Permissions are a convenience; the digest and fresh inventory comparison detect
subsequent edits or changes. The generated exact confirmation string binds the
serial, size and plan digest. `confirm-review --plan ... --confirmation ...`
rechecks the real machine but **only confirms review**; it does not install,
grant a future executor permission or report successful installation. Every
future destructive executor will need its own contemporaneous identity check
and explicit confirmation of its exact disk plan.

## Next bounded implementation and acceptance gate

Implement a separate offline legacy BIOS installer using an approved immutable
plan. It must recheck the complete target identity immediately before writes,
reject the source and any newly mounted or swapped target, install an actual
persistent system and BIOS bootloader, and preserve only the owner's public key.
The installed bootstrap must work without `/run/live/medium`; the live bootstrap
currently requires it. Generate unique persistent SSH host keys on the installed
machine, keep password/root SSH disabled, and retain key-only recovery access.

Test the executor only against disposable QEMU images first: boot the live ISO,
install onto a blank target with a separate sentinel disk, shut down, remove the
ISO completely, and boot only the installed target. Prove positive owner-key SSH
login, wrong-key denial, persistent boot and unchanged source/sentinel bytes.
Also prove wrong serial/size, source selection, ambiguous identity, mounted/swap
targets, stale plans and hot-swapped identity all fail before any write. Save
actual command/tool results and boot receipts. Current live SSH CI and these
fixture tests do not satisfy that permanent installation gate.

## Experimental disposable VM executor

`scripts/qemu-offline-install.py` is an experimental executor for the acceptance
environment only. It refuses physical-machine DMI, non-root callers and every
target except a 16 GiB QEMU disk with serial `CENTIPEDE-VM-TARGET`. It requires
the reviewed plan confirmation, a second execution confirmation binding the plan
and source squashfs hash, and fresh storage checks before the first write. It
contains no switch to enable physical hardware installation.

The offline path partitions that disposable disk, unpacks the live squashfs,
installs BIOS GRUB and a persistent root UUID, and stages an installed server
bootstrap which rejects reliance on mounted live media. It copies only the
public seed, removes host keys and machine identity, retains key-only SSH, and
leaves a receipt explicitly awaiting independent boot proof. It has not yet been
executed in a VM, so none of these actions is claimed to have succeeded.

The next CI acceptance harness must generate an ephemeral test key locally on
the CI runner and replace only the public seed in a separate test ISO using
xorriso boot-image replay. Preserve the verified owner ISO unchanged. Boot the
test ISO with a 16 GiB target (`serial=CENTIPEDE-VM-TARGET`) and a second sentinel
disk, verify the SSH host key against serial output, and use the ephemeral key
for positive SSH. Stage this reviewed source, collect/confirm the plan, and run
the VM-only executor. Shut down, detach the test ISO, boot the target alone, and
require installed-mode receipt plus positive key login, wrong-key denial and
unchanged sentinel/source. Save the actual executor receipt and both boot logs.
Never upload the ephemeral private key or reinterpret this VM gate as physical
OptiPlex compatibility. The current owner ISO remains the proven live recovery
candidate until this additional acceptance passes.
