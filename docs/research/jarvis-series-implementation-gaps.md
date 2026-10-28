# Repository implementation gaps for a shared assistant

Reviewed 2026-10-18 against this Centipede checkout. These are **source-code findings and owner-requested architecture goals**, not claims about capabilities demonstrated by an Instagram creator. An episode title card establishes its title/number, not successful operation. The parent research inventory separately records accessible episode evidence.

## 1. P0 — Durable, project-isolated shared memory

**Present:** [`MemoryStore`](../../src/learning/memoryStore.ts) maintains an in-process map, enforces trust rank on overwrite and attempts online Kingdom writes. Failed synchronization is swallowed. [`ConversationManager`](../../src/ai/conversationManager.ts) also stores the active conversation in process memory. Neither class establishes restart-safe, cross-device reconciliation.

**Next bounded change:** make Kingdom the authoritative project-scoped store; keep an explicit local durable outbox/cache with sync state, version/conflict checks and deletion tombstones. Never replicate payment credentials or unrelated project context into general model memory. Do not introduce a second independent orchestrator.

**Independent acceptance:** record while disconnected, restart the client, reconnect and verify one server record; retry an ambiguous timeout without duplication; read the same authorized project from another client; deny cross-project reads and lower-trust overwrites; deletion remains deleted after stale-peer reconnect. Validate actual server records, not only UI success messages.

## 2. P0 — Recoverable jobs and independent execution receipts

**Present:** [`CentipedeAIPipeline`](../../src/ai/pipeline.ts) awaits planning, permission and execution within a request. [`ActivityTaskView`](../../src/components/ActivityTaskView.tsx) reads Kingdom jobs and subscribes to events, but client polling/subscriptions alone do not prove durable execution/review. The read proxy explicitly rejects mutation in [`kingdomReadProxy`](../../src/server/kingdomReadProxy.ts); submission controls must respect the selected transport.

**Next bounded change:** use a server-owned job ID and idempotency key, persisted checkpoints, worker leases, cancellation and bounded retry classes. Show assigned Knight, current step and verified receipt. A reviewer accepts actual diff/tool/test evidence; a model's assertion or exit code alone is insufficient. Preserve an unavailable state when execution is not configured.

**Independent acceptance:** close/reopen the UI during work and recover the same job; kill a worker between edit and receipt, expire its lease and resume without duplicate side effects; cancel before dispatch and during execution; reject fabricated completion without required artifacts; read-only transport presents no working mutation promise. Verify against a temporary backend and isolated workspace, not physical disks.

## 3. P1 — Three-tier routing with measured worker selection

**Present:** [`IntentParser`](../../src/ai/intentParser.ts) recognizes controlled phrases; [`Planner`](../../src/ai/planner.ts) creates a fixed validation/authorization/Kingdom execution plan. [`LocalCentipedeModel`](../../src/ai/modelAbstraction.ts) correctly reports unconfigured inference. These pieces do not establish a measured rule → small model → tool-agent cascade.

**Next bounded change:** implement routing in Kingdom with typed outputs: deterministic saved/rule answers when sufficient, a configured small model for bounded text, then a capable tool worker. Select by verified capability, free resources, context requirements and queue budget; expose selection and fallback reasons. Advertised support never grants permission. Limit concurrent heavy inference on constrained workers and cancel obsolete work.

**Independent acceptance:** rule fixtures make zero model calls; unavailable small model produces an explicit fallback or failure; tool-required requests cannot silently complete in text-only tier; unknown capability cannot dispatch; queue saturation respects a fixed concurrency limit. Record real first-token latency, tokens/sec and peak RAM for one configured provider before claiming performance improvement.

## 4. P1 — Consent-bound image understanding, beyond preview

**Present:** [`PerceptionPanel`](../../src/components/PerceptionPanel.tsx) and [`MediaCapture`](../../src/platform/mediaCapture.ts) provide explicit local camera/screen capture, bounded single-frame preview and lifecycle cleanup. The panel explicitly does not upload or analyze images.

**Next bounded change:** add an optional Kingdom vision request carrying a single user-selected frame, project/job ID and a visible destination/provider. Require explicit send action; validate image type/size and structured response, use timeouts/cancellation, and keep image text as untrusted input. Discard capture on hide, close, source revocation or stop. No default continuous capture or background collection.

**Independent acceptance:** initial render causes zero media/network requests; permission denial and late permission grant after close leave no live tracks; oversized/invalid image is rejected before upload; stopping or revocation prevents later dispatch; a vision timeout retains a useful text fallback; prompt-injection text inside an image cannot authorize a tool. Add a real-browser consent/revocation check separately from mocked unit tests.

## 5. P1 — End-to-end speech with safe interruption

**Present:** [`VoiceProcessor`](../../src/ai/voiceInterface.ts) defines STT/TTS provider contracts, confidence confirmation and dispatch through the same permission pipeline as text. [`SpeechOutput`](../../src/components/SpeechOutput.tsx) provides browser speech output. Microphone preview controls are not an end-to-end transcription connection.

**Next bounded change:** connect explicit push-to-talk to a configured provider, display transcript/confirmation and route it through the common job API. Bound audio duration/bytes, make cancellation invalidate late provider results, and show local versus remote processing. Keep text usable when STT/TTS is unavailable; do not treat recognized speech as identity or authorization.

**Independent acceptance:** absent provider produces no fabricated transcript; low/nonfinite confidence never dispatches without confirmation; cancellation during transcription suppresses late execution; STT rejection and TTS failure clear busy state and retain text; repeated click/retry cannot submit duplicate jobs. Test real microphone/provider separately with informed consent and retained non-sensitive results.

## Completion rule

Implement these as small contract-compatible batches with adverse-case tests, then validate a real authorized service path. No new test or plan here proves graphical installer boot, actual model throughput, general autonomous coding or equivalence to the creator's assistant. Existing [capability review](../JARVIS_CAPABILITY_REVIEW.md) retains those distinct evidence gates. This note changes no code, service, permission, storage device or release.
