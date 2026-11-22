# Centipede OS — verified preview and stable release workflow

## Single-source, pre-release v1.0.1-rc.11

The current source version is `1.0.1`. A reviewable one-shot workflow
[`prepare-preview-rc11.yml`](../.github/workflows/prepare-preview-rc11.yml)
starts when a trusted **main push** completes
`Centipede OS Continuous Integration` with success. It refuses to create
`v1.0.1-rc.11` unless three **same-commit**, **main-push** workflows all
completed successfully:

1. **Centipede OS Continuous Integration** (including Windows, Ubuntu, the local safety harness, and browser tests).
2. **CodeQL Advanced**.
3. **Documentation navigation**.

The coordinator requires the source commit to equal the **current `main`**
tip, rechecks it after its bounded wait, and permits only the literal
`v1.0.1-rc.11` tag. It creates an immutable lightweight tag at that commit;
it **never** moves an existing tag, releases from a PR result, or enables a
stable channel. A rerun may dispatch the existing correctly pointed tag only
if no GitHub Release has yet been published. A partially published release
fails closed for operator review.

GitHub's `GITHUB_TOKEN`-created tag refs do not automatically trigger other
GitHub Actions push workflows. Therefore the coordinator calls
`workflow_dispatch` on [`release.yml`](../.github/workflows/release.yml),
using the **tag ref** rather than `main`. An ordinary manual dispatch on
`main` still fails the **tag required** release eligibility gate.

### Build and publish stages

1. The tag-gated `release-gate` validates the exact package version and candidate channel.
2. `platforms` builds the Linux/Debian **live USB ISO**, a byte-identical
   optical **ISO**, the **QEMU optical QCOW2**, and the **Docker web/API image**.
   It runs the compiled API preflight, Debian image build, QEMU BIOS normal/safe,
   UEFI normal/safe boot smoke tests, Docker HTTP/health checks, and SHA-256 checks.
3. `desktop` type-checks and tests the desktop bundle and packages its archive.
4. `publish` collects **all required BUILDABLE** outputs, requires exact
   filenames and build-job checksum matches, computes manifests and combined
   `SHA256SUMS`, and publishes to the GitHub Release for that tag.
5. The release remains an explicitly labeled **pre-release** and does **not**
   become GitHub's “Latest” stable release.

The Android and iOS **target manifest statuses remain BLOCKED**. The coordinator
does not manufacture Android signing credentials, publish an unsigned APK as a
stable phone app, or turn Simulator-only iOS output into an installable iPhone IPA.

### How to follow, recover or diagnose

- The one-shot coordinator workflow appears under **Actions → Publish one
  verified Centipede preview (v1.0.1-rc.11)**.
- The actual build/publisher runs under **Actions → Centipede verified
  multi-platform release**. A started run is **not** a downloadable release.
- If the coordinator created a correct RC11 tag but did not dispatch the build,
  an operator may use its **Run workflow** control on `main` after investigating
  the failure; its exact-commit/status checks run again. Never delete and
  repoint a release tag to retry.
- If QEMU, checksums, an artifact or the publishing gate fails, **do not**
  update the beginner download page to the unreleased tag. Fix the underlying
  build safely and verify new source and a **new candidate tag**, rather than
  replacing released bytes without provenance.
- After publication verify the new release asset list, release manifest,
  source SHA and checksums before changing README/`DOWNLOADS.md`. Until
  that happens, their old RC9 URLs intentionally remain usable, grounded
  historical links rather than optimistic 404s.

### Why this is NOT GA certification

The release automation proves build and virtual test conditions at an exact
source commit. It does **not** prove a permanent disk installer, working host
OS updates/rollback, native Windows/macOS installer, publisher-signed phones,
real Kingdom execution across DT1 and Laptop 2, or 24-hour physical use.

The stable tag `v1.0.1` is blocked by the independent
[`requireReleaseEligibility()`](../src/platform/releaseGate.ts)
check requiring exact-commit owner attestation and
[issue #150](https://github.com/wests-cmd/Centipede-os/issues/150)
hardware/recovery/security evidence. A green candidate build **never**
changes that requirement.

### Build target definitions

`package.json` is the core version source of truth, while
[`release/targets.json`](../release/targets.json) independently declares
target names, revisions, architectures, artifacts and `BLOCKED`/`BUILDABLE`.
A `BUILDABLE` target means a real builder exists, **not** that the target has
been published or installed on physical hardware. The manifest generator fails
closed on missing outputs and checksum disagreement. See
[Platform builds and signing](PLATFORM_BUILD_GUIDE.md),
[Beginner downloads](../DOWNLOADS.md), and
[Physical acceptance](PHYSICAL_ACCEPTANCE.md).
