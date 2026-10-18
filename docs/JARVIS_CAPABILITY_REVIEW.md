# Centipede / Kingdom capability review — 2026-10-18

## Evidence and scope

Development and tests for this review ran in native Windows PowerShell using the installed, authenticated Codex CLI for an independent read-only audit. “Q-man-style” means questioning assumptions, measurable acceptance and adverse-case review here; no external Q-man product or certification was used.

Public Centipede baseline: `1602f82`. Kingdom public HEAD observed: `6cb8e0a40ae02e7d0133d01d934f1e831bbd3ffa`; the separate local integration checkout has unfinished changes and was preserved. Its `backend/api.py` status contract explicitly supplies protocol metadata and a capability list. Advertisement describes availability, never the caller's permission. No installed service, disk, USB, camera or microphone was changed or activated by this review.

## Creator research: incomplete, with explicit access limits

**Signed-in update:** the owner has now signed in. The creator's Reels grid and Part23 playback are accessible. [The signed-in catalog](research/jarvis-signed-in-catalog.md) records 29 visible series-related posts with title cards reaching Part37, including duplicate labels. Part23 identity is verified from its opening frame. Full playback/capability review and exhaustive archive coverage remain incomplete; do not treat this catalog as 29 fully reviewed demonstrations. [Repository implementation gaps](research/jarvis-series-implementation-gaps.md) lists separate source-backed priorities and acceptance tests.

**Primary-source expansion:** the creator's profile links to an official Fletcher site. All27 indexed build breakdowns were inspected and summarized with original-video links in [the official build review](research/fletcher-official-build-review.md). The notes explicitly distinguish completed tests, failed trials and plans. This provides substantially better capability evidence than the earlier secondary commentary. It does not establish full playback review of every Instagram video; newer Instagram covers and the official notes have different numbering/date ranges.

### Historical anonymous-access attempt (superseded by signed-in update)

The requested creator is [@alexcandothat](https://www.instagram.com/alexcandothat/). Anonymous public profile inspection exposed a limited post grid. Opening Reels or a listed video produced a sign-in gate. Public web searches for the handle, both supplied series titles, Jarvis and Part 23 did not establish an episode catalog. No access control was bypassed.

At that earlier anonymous stage, zero numbered episodes had been verified. This was not an inventory of every episode, and no claim was made that the series had only those posts. The signed-in update above supersedes the earlier Part23 and access limitations; total episode count and complete archive coverage remain unverified.

Follow-up: the owner supplied [DdH4qB5JKw6](https://www.instagram.com/reel/DdH4qB5JKw6/) in response to the Part 23 request. Its public browser page verified creator `alexcandothat`, date September 10, 2026 and caption “Hey I’m so tired…” with `#womeninstem` / `#dtx`. The episode number, series title, transcript and demonstrated capabilities were not exposed. A sign-up overlay remained; the separate web fetch was throttled. This is a specific owner-supplied episode lead, not independent verification of Part 23 or grounds for attributing capabilities.

The following are profile-discovered candidate links, **not confirmed Jarvis episodes**:

| Public link | Visible profile date | Episode / demonstrated capability |
|---|---|---|
| [Dabb47Ip030](https://www.instagram.com/alexcandothat/reel/Dabb47Ip030/) | 2026-07-05 | Unknown; video sign-in gated |
| [DaOxsDkhzhG](https://www.instagram.com/alexcandothat/reel/DaOxsDkhzhG/) | 2026-06-30 | Unknown; video not verified |
| [DUL0eZRDr0M](https://www.instagram.com/alexcandothat/reel/DUL0eZRDr0M/) | 2026-01-31 | Unknown; video not verified |
| [DSian3KEj4H](https://www.instagram.com/alexcandothat/reel/DSian3KEj4H/) | 2025-12-21 | Unknown; video not verified |

A [secondary LinkedIn post and transcript](https://www.linkedin.com/posts/colinstewartperreault_yesterday-i-said-chatgpt-launched-their-own-activity-7502002828207341568-LGrp) describes personal knowledge retrieval and distributed voice/agent components. It does not supply a verified numbered episode or establish that all described capabilities were demonstrated. Treat this as an unverified research lead, not implementation evidence. Retrieval, transcription and prompt context do not prove model training.

The priorities below come from repository findings and the owner's requirements, **not invented video details**.

## Iterative gap analysis

| Priority / gap | Change in this branch | Remaining acceptance gate |
|---|---|---|
| P0 API presence mistaken for media permission | Separate support from access; explicit camera, screen and microphone controls | Real browser/device denial, revocation and mobile tests |
| P0 capture lifetime and privacy | Stop on hide, close, source change or revocation; cancel late permission results; no upload/recording | Browser/device proof; an OS permission dialog remains mandatory |
| P0 invalid voice confidence could dispatch | Require confirmation for nonfinite, missing and out-of-range confidence; clear failure state | Real STT configuration and user confirmation UI |
| P0 inferred Kingdom support | Missing protocol/capability metadata means UNKNOWN; clear stale advertisements | Installed-host interoperability and authenticated tool execution |
| P0 fabricated local-model health/output | Unconfigured model is unavailable and generation fails explicitly | Real configured provider, actual inference receipt and resource measurements |
| P1 needless pipeline latency | Remove two artificial 50 ms sleeps; preserve permission/execution awaits | No claim of improved model tokens/sec or heavy-compute throughput |
| P1 bounded visual workload | At most one local JPEG preview; maximum 640×480, 350,000 encoded characters; camera requests 5 fps | Vision provider with separate per-request destination consent and output validation |
| P1 complete graphical installer | Existing installer branch identified; see profile plan below | Exact-source ISO, VM install, USB-free reboot and supported-device tests |
| P2 shared assistant | Kingdom remains orchestration/execution authority; Centipede is a front door | Read-only browser proxy must not imply mutation support; connector adoption remains open |

Camera preview is **not image understanding**. Microphone capture testing is **not transcription**. No continuous surveillance, background recording, secret collection, model download or autonomous OS installation was added.

## Graphical + headless installer promotion plan

Public main currently builds a live desktop ISO; that alone is not a full installed graphical OS. The separate `server/permanent-installer-plan-20261015` branch contains Calamares settings, launcher, boot-media protection, owner-seeded headless SSH and permanent-install work. These files were inspected, not silently copied as a partial installer or executed on Windows.

Keep two explicit profiles with distinct artifact names and receipts:

1. **Desktop**: graphical live environment, explicit target selection, partition summary and final confirmation, functional Calamares module chain, cancel before disk execution, installer boot-media exclusion. No preselected erase target.
2. **Headless server**: owner public-key seed validation, private authenticated management, exact internal-disk policy, no password/key defaults. Preserve installed deployments rather than reinstalling them for service updates.

Promotion requires a reviewed complete dependency set from that branch; a partial launcher is insufficient. Build on a supported Debian builder, then prove BIOS and UEFI live boot, installation to disposable VM disk, successful reboot with ISO removed, service health, correct-key SSH success, wrong-key denial and unchanged source-media/sentinel hashes. Record exact source commit, artifact SHA-256, commands, results and limitations. Old VM proof cannot validate a new source tree. Physical testing requires a separately identified device and explicit authorization; never use an old consent as a new erase instruction.

Historical release reports claiming installer testing must not be read as proof of these new source changes. No new ISO or physical installation was produced in this Windows review.

## Next implementation batches

1. Promote the complete installer profile dependency set into a dedicated reviewed branch, validate its exact-source build and VM install/reboot before publishing.
2. Finish the read-only transport UI distinction; require authenticated explicit mutation transport before offering runtime controls.
3. Add an optional vision/STT provider through Kingdom's real model routing. Show destination, permissions, active worker, timeout and retained receipt; text remains the fallback. Do not send capture data automatically.
4. Measure local inference on actual available hardware: free RAM, model working set, context size, first-token latency, tokens/sec, queue wait and cancellation. Use one in-flight heavy job per constrained worker; offload only to authorized capable nodes. AirLLM disk offloading is not proof of acceptable CPU latency.
5. Complete the creator inventory from accessible primary episode links; compare only observed demonstrations, with a per-episode evidence field.

Windows unit tests use fixtures and injected browser APIs. They do not prove physical capture, installed Linux compatibility, general autonomous coding, trained memory, or full Jarvis equivalence.
