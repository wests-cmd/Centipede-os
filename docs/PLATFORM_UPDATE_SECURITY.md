# Platform update metadata hardening

This package rejects downgrade offers, malformed core versions, mismatched target identities, disabled release targets, unverified artifact hashes and illegal revision numbers. The update checker compares revisions **only within the same core release**.

This is metadata policy only. It **does not** download, install, sign, activate, stage, apply or roll back a Debian OS image. A reported `updateAvailable: true` is a candidate offer, not verified compatibility or authorization to mutate the host. Installed-machine update/rollback evidence is still required by [GA issue #150](https://github.com/wests-cmd/Centipede-os/issues/150).

Never rely on digest alone when the manifest originates from an untrusted source: require authenticated source and publisher signing identity in an independently authorized installation agent. No such OS installer is certified here.
