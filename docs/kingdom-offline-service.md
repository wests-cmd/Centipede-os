# Optional offline Kingdom service

Centipede can host Kingdom after persistent installation and independent owner
SSH verification. This optional adapter does not partition disks, install an OS,
download models, or configure cluster peers. It defaults to loopback port 8012
with the model provider disabled until the owner supplies profiles.

Prepare an owner-reviewed bundle containing `source.tar.gz`, `frontend.tar.gz`,
`wheels/`, and `manifest.json`. The manifest has an immutable 40-character Git
`revision`, a `files` map of relative filenames to SHA256 hashes covering both
archives and every wheel, and exact `requirements` such as `package==1.2.3`.
Obtain the manifest SHA256 independently from the reviewed build. The bundle is
trusted executable application code; matching hashes establish identity rather
than certify application safety. Keep staging files owner-controlled.

On the already installed host, review its actual mounted-root disk serial, then:

```sh
sudo python3 scripts/deploy-kingdom-offline.py \
  --bundle /owner-reviewed/bundle \
  --manifest-sha256 OWNER_VERIFIED_MANIFEST_SHA256 \
  --expected-root-serial OWNER_VERIFIED_ROOT_DISK_SERIAL
```

The adapter checks actual root-disk ancestry and installed-boot mode, verifies all
bundle hashes, rejects archive traversal, links, duplicate entries and oversized
archives, and permits only binary wheels with no package index. Each revision
gets its own virtual environment. Existing owner data is retained; existing
services and releases are refused, so upgrades require separate review rather
than silently replacing configured profiles. Failed deployments leave their
partial release for inspection and never recursively delete it.

After deployment verify `systemctl status kingdom-harness`, authenticated API
requests, frontend assets, restart behavior, and persistence through reboot.
Keep remote access private through an owner-configured authenticated tunnel or
proxy; this adapter does not expose the service on public interfaces.

The underlying deployment recipe was exercised on an installed Centipede host:
offline dependencies, API authentication, frontend assets, service restart and
credential persistence after a second reboot passed. The generic adapter has
fixture tests for identity, boot mode, bundle and archive rejection, and data
preservation; it has not itself been deployed to another physical host. It does
not replace the separate OS installation and owner-key boot acceptance gates.
