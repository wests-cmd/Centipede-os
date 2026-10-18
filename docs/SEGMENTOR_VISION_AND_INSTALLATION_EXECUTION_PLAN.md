# Segmentor vision and installation readiness — October 18, 2026

This is an engineering planning note, not a release or a statement that device work has been performed.

## Verified repository baseline

- Centipede OS stable release is v1.0.0. The public ISO is a live desktop image and does not install to a computer's disk. The refreshed desktop on main is not yet the stable ISO.
- Kingdom stable release is v1.2.1. Centipede specifies Kingdom API contract 1.4.0 and protocol major 1.
- Centipede's master release status lists camera/vision as missing, voice as partial, and permanent graphical installation as unproven.
- Open PR #119 contains a guarded graphical installer candidate; its separate-target installation and reboot proof is incomplete.
- Open PRs #123 and #124 address headless recovery and disposable permanent server installation, not a verified general desktop install.
- Open security PRs #122 (pairing authentication) and #126 (secure identifiers) should be reviewed and validated before new device integrations.
- Open PR #125 covers performance and compatibility. Kingdom draft PR #122 includes new harness and vault features that are not part of its published v1.2.1 API.

## Priority work

1. Review the open security fixes, confirm independent tests and CodeQL, and resolve integration conflicts.
2. Test Kingdom's published API contract through the existing KingdomAdapter. Treat future unreleased APIs as optional and gated. After disconnect, task state must be UNKNOWN until Kingdom confirms otherwise.
3. Finish the graphical installer in PR #119 with disposable VM tests. Preserve the live USB as a separate boot mode and keep headless server installation separate.
4. Build a Segmentor camera manager with explicit session permission, visible capture indicator, Stop button, safe device cleanup, and no recording or retention by default.
5. Add on-demand single-frame vision with bounded memory, resolution, inference concurrency and timeout. Prefer local processing when a compatible model is available, otherwise show a clear unavailable state.
6. Treat vision results as observations only. Any action proposal must go through Kingdom's capability and approval rules before execution.
7. Integrate optional speech and screen understanding after privacy, cancellation, and performance tests pass.
8. Validate on low-memory computers, including approximately 4 GiB Linux and 8 GiB Windows, before enabling periodic vision.
9. Require independent evidence of installer boot, actual desktop rendering, protected source media, target disk installation, reboot without the USB, and recovery before release.
10. Identify DT1 and the exact installation USB before any device-specific change. Never write to physical storage without a reviewed target and explicit approval.

## Suggested code boundaries

- New proposed modules: src/vision/cameraSession.ts, src/vision/frameBudget.ts, src/vision/visionProvider.ts, src/vision/observation.ts.
- New proposed UI: src/components/SegmentorVision.tsx.
- Proposed tests: permission denial and revocation, camera unplug, bounded capture, no unintended upload, malformed model output, cancelled inference, Kingdom offline, and post-reboot installer verification.
- Reuse src/api/kingdomAdapter.ts, src/ai/voiceInterface.ts, and the existing approval and capability infrastructure.

## Jarvis video research

Requested source: Instagram @alexcandothat, Building Iron Man's Jarvis / BUILDING MY OWN JARVIS, including Part 23 and all other public episodes. No specific episode or feature was verified in this audit: public searches did not yield a reliable episode inventory and the reels page could not be fetched. No creator-specific capabilities are asserted. When accessible, record each public video URL, date, demonstrated capability, hardware and relevance before prioritizing adaptations.

## Review loops and release gates

- Security: camera observations cannot authorize actions.
- Beginner: graphical installer cannot silently choose a target disk.
- Performance: camera capture and model inference must be optional and bounded.
- Offline: Kingdom connection loss cannot be interpreted as successful execution.
- Release: unit-test success alone cannot certify a bootable graphical OS or physical installation.

No Windows Codex installation, DT1 access, physical USB write, runtime benchmark or new automated test was performed as part of this documentation change.