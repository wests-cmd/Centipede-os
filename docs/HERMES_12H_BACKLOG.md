# Centipede: local implementation and review backlog

All items below are planned, not completed. Twenty-eight half-hour estimates provide 14 hours of candidate work for a 12-hour run window. Actual productive time is not inferred from idle or blocked time. A reviewer chooses one bounded task at a time and verifies receipts before continuing. The first task is an execution gate; failure pauses the loop rather than starting unattended coding.

Existing release gates, required approvals and source guidance remain authoritative. No physical disk writes, host OS replacement, credential changes, deployment, push, merge or release occur inside an unattended batch. Physical USB work is deferred until the owner supplies and approves the intended USB drive. Signed mobile device releases remain blocked without signing assets and device evidence.

### C00: Verify real Hermes execution

Execute the supplied readiness command through Hermes terminal, then stop.

Acceptance: A unique proof file and an actual saved tool result; a code block or model claim does not pass.

### C01: Trace requests to current implementation

Map the recovered owner requests to existing source, verified evidence and remaining work; do not duplicate implementations.

Acceptance: A source-linked requirement matrix separating implemented, unverified and blocked items.

### C02: Disposable virtual-disk installation harness

Extend the existing QEMU path to install onto a new disposable qcow2 disk. Never target physical storage.

Acceptance: A reproducible command, disposable disk checks and explicit installation success/failure receipts.

### C03: Installed-disk reboot proof

Boot the disposable installed disk without the installer media and verify persistent files and desktop readiness.

Acceptance: Real reboot receipts bound to the installed virtual disk and candidate artifact hash.

### C04: Installer non-target disk protection

Exercise two disposable virtual disks and demonstrate that the unselected disk is preserved.

Acceptance: Independent sentinel/hash checks before and after installation; failures keep publication blocked.

### C05: Installer failure and recovery

Add focused regression coverage for interrupted installation and failed bootloader/partition operations.

Acceptance: No false success; recovery/error states documented and tested without physical disk access.

### C06: CI installation receipt gates

Bind existing release gates to the separate-disk installation/reboot receipts.

Acceptance: Fail-closed tests for missing, stale, wrong-commit or wrong-artifact evidence.

### C07: Legacy Dell boot compatibility

Investigate the owner's OptiPlex 755 unsupported-mode report using supported boot paths and documented evidence.

Acceptance: Truthful BIOS/UEFI and architecture requirements; no USB write, guessed hardware support or host OS change.

### C08: Branding and distribution truth

Audit visible leftover Debian/default branding and improve Centipede presentation without removing required attribution.

Acceptance: Screens/source evidence for corrected product labels; base distribution and licensing remain accurate.

### C09: Everyday free-app workflow

Check the advertised everyday apps and file handoff through available VM/container tests.

Acceptance: Real first-launch/offline/file-open evidence or an explicit unverified gate per advertised app.

### C10: Accessibility settings and keyboard paths

Review keyboard focus, contrast, scaling, reduced motion and screen-reader labels in existing UI.

Acceptance: Meaningful accessibility regressions and actual behavior, rather than decorative settings.

### C11: Host telemetry provenance

Review CPU, memory, disk, battery and device values; eliminate unsupported claims.

Acceptance: Unavailable measurements remain UNKNOWN; trusted native data is distinguished from browser quotas.

### C12: Real filesystem task workflow

Verify approved read/write/copy/rename/search workflows using disposable test files through Kingdom.

Acceptance: Actual effects and denial/approval receipts; destructive operations retain approval requirements.

### C13: Task composer and attachments

Review the existing task composer, attachment boundaries and file/image task behavior.

Acceptance: A real task flow plus malformed/oversized input tests; no duplicate composer.

### C14: Docker-to-Kingdom integration

Exercise existing join/permission/task/result paths through the available container setup.

Acceptance: Real non-hardcoded task results and authenticated receipts, or a recorded environment blocker.

### C15: Disconnect and reconnect recovery

Test interruption during a task and reconnection through existing integration code.

Acceptance: Durable recovery with no duplicate execution or invented success.

### C16: Offline desktop and local behavior

Check advertised offline files/apps/settings and disconnected Kingdom states.

Acceptance: Functional offline paths; cloud-only controls clearly explain unavailable dependencies.

### C17: Authoritative target versions

Audit version/config/build/manifest consistency and independently updateable targets.

Acceptance: One authoritative identity path with tests for mismatched target versions.

### C18: Small and large update policy

Review actual update handling: small safe updates versus larger changes requiring approval.

Acceptance: Policy-backed behavior and preserved user data; unsupported hot updates remain explicitly unverified.

### C19: Update failure and rollback

Exercise interrupted downloads, corrupt artifacts, stale manifests and rollback paths.

Acceptance: Independent integrity/recovery tests and no upgrade success claim after failure.

### C20: Local model routing and resources

Review discovery/selection/offline fallback using real configured local providers.

Acceptance: Actual model requests and capacity evidence; no prompt customization labeled fine-tuning.

### C21: Credential UI and whole-task planning

Audit secure credential entry, missing-credential prompts and plan/approve/execute behavior.

Acceptance: No credential leakage; use simulated integrations only, never real financial transactions.

### C22: Release claims and checklist reconciliation

Reconcile older readiness claims against current source and verified receipts.

Acceptance: One current truthful matrix; signed mobile/device and installer gates remain blocked without evidence.

### C23: Targeted security and regression pass

Run relevant unit/security/contract/browser checks for changed code.

Acceptance: Exact commands and results, triaged failures and no suppression of failing gates.

### C24: Candidate artifact verification

Verify candidate manifest/checksum generation and downloadable artifact consistency where builds are available.

Acceptance: Real artifacts only; no fabricated platform packages or publication before review.

### C25: Final project checkpoint

Prepare a reviewed diff, evidence summary and precise remaining release gates.

Acceptance: A clean reviewable branch and truthful checklist; no automatic merge or release.

### C26: Regression reserve: failed acceptance tasks

Use this reserve for a concrete previously failed acceptance test, selected by the reviewer.

Acceptance: A diagnosed cause and meaningful regression test; no blind retry or unrelated feature expansion.

### C27: Polish reserve: demonstrated usability defect

Use this reserve for a reproducible UI defect from the recovered requests after correctness gates.

Acceptance: Before/after behavior and focused validation; no cosmetic-only claim of completion.

