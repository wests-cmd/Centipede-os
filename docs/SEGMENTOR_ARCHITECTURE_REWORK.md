# Segmentor architecture rework

No LifeOS or Herdr packages, code, background servers or installation scripts are adopted. Their goal/evidence and detached-session concepts inform original Centipede changes. Debian/XFCE, existing native controls, and Kingdom authority remain.

## Ordered gates

1. Consolidate tested branch history; retest combined source before subsequent merges.
2. One Segmentor orchestration contract for native, web and mobile. Manual local actions remain local; AI-directed execution requires Kingdom authorization.
3. Persistent state: one authoritative workflow store, owner-scoped durable host storage and migrations, session detach/reconnect, authenticated checkpoints, no restored grants or automatic replay.
4. Isolated desktop worker: typed allowlisted operations, authenticated transport, distinct verification, no broad shell or host display access.
5. Perception and guidance: explicit capture, local OCR/accessibility evidence, optional consented model analysis, no screen-driven authority.
6. Verified skill learning: consented observation, versioned candidate, independent evaluation, approval and rollback.
7. Resource admission: hardware observations, one heavy operation on low-memory profile, cancellation and pressure recovery.
8. Signed OS updates, staged activation, independent health check, rollback and bounded diagnostics.
9. Distribution: graphical installer, permanent disk/USB/VM/Docker/ultralight builds, signed mobile, physical/novice acceptance.

## First workflow state slice

WorkflowEngine now uses one injectable session store rather than divergent live maps and copied records. It saves an observation before dispatch and after verified steps. Simulated or unverified results cannot unlock dependent steps or completion; an exception or timeout requires reconciliation. Parameters are not copied into checkpoint state. Export checksum is explicitly not authentication. Import validates bounded collections before mutation, strips imported grants and compensation, forces manual review, never imports old receipts as evidence, and never overwrites live records. This is an in-memory safety foundation, not durable host storage, authenticated snapshots, a new scheduler, or proof of crash recovery. Next slice must implement owner-scoped host storage and reconciliation against Kingdom task IDs; no credentials or grants in exports, and no automatic replay.
