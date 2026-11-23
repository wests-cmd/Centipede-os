# Centipede OS — Current release reality and historical evidence

> **Verified snapshot:** November 22, 2026. The source SHA, pull request and release references below describe a dated inspection, not a live-updating status page. Any later change to \`main\`, workflow, installed system or GitHub Release requires new evidence.  
> **Current master requirements:** [Centipede OS master specification](CENTIPEDE_OS_MASTER.md).  
> **Release gate:** [Issue #150](https://github.com/wests-cmd/Centipede-os/issues/150).  
> **Beginner downloads:** [DOWNLOADS.md](../DOWNLOADS.md).

## 1. What was verified from GitHub

| Question | Verifiable answer | Evidence limit |
|---|---|---|
| Is there a published downloadable preview? | **YES:** [v1.0.1-rc.11](https://github.com/wests-cmd/Centipede-os/releases/tag/v1.0.1-rc.11), published November 22, 2026 | This is a **prerelease**, not general-availability (GA) certification |
| Which source is actually in RC11? | Git tag \`v1.0.1-rc.11\` points to \`63b4b63d7af104cb456a86530e43d16e8b5a699d\` | Later \`main\` work is **not** inside these artifacts |
| What is the current source version? | \`package.json\` reports \`1.0.1\` | A version value does not certify an installer |
| Which code was merged during this review? | PRs [#165](https://github.com/wests-cmd/Centipede-os/pull/165), [#163](https://github.com/wests-cmd/Centipede-os/pull/163), [#171](https://github.com/wests-cmd/Centipede-os/pull/171) and [#178](https://github.com/wests-cmd/Centipede-os/pull/178) | Source merge does not update previously shipped preview images |
| What is the source baseline at this snapshot? | \`main\` commit \`4b3447e156ac523ef47eaed59a62970d21672d63\` (after #178) | Update this SHA only after checking GitHub again |
| Is \`main\` protected? | **NO:** branch metadata reported \`protected: false\` | \`CODEOWNERS\` does not enforce approvals without branch/ruleset protection |
| Is the current ISO proven safe for permanent installation? | **NO** | Preview boot/media checks are not physical install, disk preservation, or rollback testing |
| Can RC11 be called a supported phone release? | **NO** | Android/iOS targets are marked \`BLOCKED\`; no supported signed RC11 APK/IPA |

The release's published asset inventory and pinned source/tag metadata are recorded in [release/published-preview.json](../release/published-preview.json). The release verifier confirms tag identity, asset presence, upload state, sizes and clickable downloads, but **does not independently hash all downloaded 1.56 GiB images**. The workflow-generated \`SHA256SUMS\` and release manifest are separate integrity evidence and should be verified against downloaded bytes before installation.

## 2. Exact available published preview targets

| Target | Published asset class | What it does **not** prove |
|---|---|---|
| Live USB ISO | Debian-based x86_64 live-boot preview | Safe permanent install, persistent user data, physical power/recovery testing |
| Bootable ISO | VM/live optical media | An installed VM operating-system disk |
| QEMU QCOW2 | Optical-media conversion for QEMU | A preinstalled writable operating-system image |
| Docker image TAR | Centipede browser UI/API container for linux/amd64 | Bundled Kingdom service or native desktop OS |
| Desktop web bundle | Compiled application archive for a web server | Windows executable, macOS package or native Linux installer |
| SHA256SUMS + release manifest | Released hash/provenance metadata | Human approval, device signing or physical certification |

**Not published/certified:** persistent-disk graphical installer, full native desktop installer, Android/iPhone device installer, Apple Silicon/ARM image, independently packaged Commander/Knight/Scout appliances, or a physically verified daily-driver release. See the [exact current download chooser](../DOWNLOADS.md) for filenames, sizes and the experimental USB procedure. Never flash the repository's source ZIP.

## 3. Current source improvements are not in RC11

The merges below improve \`main\`, but **the published RC11 release remains fixed to its tag**:

- **#165 — update metadata guard:** rejects invalid versions, downgrade offers, blocked targets and malformed checksums. It does **not** implement an installed-OS updater or rollback.
- **#163 — release source gate:** distinguishes modified tracked files from generated build output; makes tagged platform builds depend on the release gate and adds Code Owners metadata. It does **not** fix Android signing credentials.
- **#171 — desktop window fit:** improves the timing of X11 desktop maximization, with prior PR evidence from DT1. It does **not** establish cross-hardware graphical certification.
- **#178 — master specification and pinned release audit:** adds the consolidated blueprint, tests for moved tags, wrong asset URLs and incomplete uploads, and documentation CI validation. This does **not** change released binaries.

Every future release must build and re-test an exact new SHA. Do not silently relabel the existing RC11 archive as containing post-tag source changes.

## 4. Current P0 blockers

These are acceptance requirements, **not completed claims**. Keep [#150](https://github.com/wests-cmd/Centipede-os/issues/150) open until each has a concrete YES with evidence.

1. **Owner → Kingdom → worker:** genuine task ID, execution result, denial, timeout, disconnect/restart reconciliation, and no duplicate side effects on physical connected machines.
2. **Host files and applications:** real authorized operations, scoped paths, reversible deletion or trash, app lifecycle, no simulated success, Windows and Linux access-control tests.
3. **Persistent installation and recovery:** live preview and permanent graphical installation clearly distinct; correct disk selection; reboot/persistence; signed update and tested rollback; preserve unrelated disks.
4. **OS/security confinement:** de-privileged services, browser and backend AppArmor/container boundaries, protected secrets, prompt injection/CSRF/SSRF tests, identity-bound approvals and revocation.
5. **Low-end hardware:** CPU/RAM benchmark on roughly 4 GiB, dual-core hardware, long-running responsiveness, power/resume, failed network/Kingdom scenarios.
6. **Mobile distribution:** approved publisher keys, correct signature pinning, real device pairing, revocation and user-visible remote action status. The previously recorded Android publisher-certificate mismatch remains a stop condition.
7. **Release governance:** protected \`main\`, required tests/reviews, immutable SHA/tag/source provenance, verified downloaded bytes and screenshots/receipts from actual installation.

The isolated background-worker PR [#175](https://github.com/wests-cmd/Centipede-os/pull/175) remains **unmerged and blocked** as of this review: its CI headless Chromium smoke failed at sandbox startup (\`sys_chroot\` / zygote failure). No safe autonomous computer-use execution should be claimed on the basis of its HTTP/SQLite tests.

## 5. Meaning of green checks

Automated CI and CodeQL can prove source contracts, mocks/fixtures, built bundles and selected virtual boot checks. They cannot, by themselves, demonstrate hardware isolation, an intact owner identity on another machine, a safe disk installer, mobile publisher continuity, or recovery after power loss. Mark those outcomes **UNKNOWN / NOT VERIFIED**, not **PASS**.

For release decisions use:

\`\`\`text
EXACT SOURCE SHA
  -> CI / SECURITY / BUILDS
  -> ARTIFACT HASH + TAG PROVENANCE
  -> DOWNLOAD AND FRESH INSTALL
  -> REAL KINGDOM TASK + DENIAL + RECONCILIATION
  -> PHYSICAL LOW-END / RECOVERY / UPDATE TESTS
  -> EXPLICIT RELEASE DECISION
\`\`\`

A failed gate means **NO GA RELEASE**, while experimental previews may be separately identified and distributed with honest warnings and safe instructions.

## 6. Historical v1.0.0 snapshot (not the current preview)

The [v1.0.0 GitHub Release](https://github.com/wests-cmd/Centipede-os/releases/tag/v1.0.0), published September 30, 2026, included an earlier Debian live/prototype artifact matrix. The older documented [platform build run 36601824289](https://github.com/wests-cmd/Centipede-os/actions/runs/36601824289) was associated with commit \`127f0e1e40bc8c3c39e99926c293a4d0cf06d5dd\`. Its artifacts and test results cannot certify the newer RC11 preview or current \`main\`. That run described Android debug and iOS simulator builds for validation only; neither is evidence of a trusted mobile device distribution.

**Change-control instruction:** When updating this page, record the inspected SHA/tag, verification date, linked CI job IDs, release assets and physical-machine receipts. Never erase historical evidence or convert an unverified target into a supported release because its source code exists.
