# Windows validation — 2026-10-18

All checks below ran natively on Windows, not WSL or a Linux development shell.

- Installed authenticated Codex CLI: `0.163.0-alpha.10.2`; completed a separate read-only static audit. No claim that this existing conversation moved out of its hosting application.
- Installed 27 stable skills from `mattpocock/skills` pinned at `49dd158d1076134a641b33efb035946536778336`, using the skill installer. In-progress/deprecated content excluded. This is a local developer setup change, not a product dependency. Start a new Codex session to discover the new skills.
- Workspace-only Bun `1.4.3`, official Windows baseline archive checked against the release asset SHA-256; frozen dependency install.
- `vitest run tests/unit`: **28 files, 168 tests passed**, including permission denial, late permission results, revocation, source changes, unmount, invalid voice confidence, provider/pipeline errors, unknown protocol/capabilities and unavailable local inference.
- The two Python HTTP fixtures require `CENTIPEDE_E2E_PYTHON` set to a real Windows Python executable. The Windows Store alias initially failed; selecting the actual interpreter made those suites pass. These are contract fixtures, not deployed Kingdom or Docker proof.
- TypeScript `tsc --noEmit`: passed.
- Vite production build: passed; main JS 434.68 kB, gzip 121.10 kB. This is a web build, not an OS ISO.
- `git diff --check`: passed.
- Removed two deliberate 50 ms pipeline waits. The voice/autonomy suite measured 218 ms before and 15 ms after on this host. This is a test-suite observation, not a model-inference benchmark or a guaranteed production speedup.

No physical media was written. DT1 was identified through read-only installed-host inspection, and the Windows 8 GB USB was distinguished from the internal system disk and card reader. Personal device IDs and private access configuration are intentionally omitted from public source.

Not verified here: actual camera/microphone/screen behavior on hardware, vision inference, configured STT, live model inference, installed-host contract acceptance for this commit, complete numbered Jarvis series, a newly built graphical installer ISO, VM installation/reboot for this source, or USB flashing. See [capability and installer gaps](JARVIS_CAPABILITY_REVIEW.md).
