## Workspace owner task handoff (November 2026)

The Workspace screen is a **Kingdom task client**, not an independent workflow executor. Its task ledger comes directly from the Kingdom adapter, and its submissions use the same local-only, owner-unlocked `KingdomActions.submitTask` as Segmentor and Tasks. An accepted task ID is not proof of completed execution.

The pre-existing `workflowEngine` and `integrationRegistry` retain local examples for developer experiments and their existing unit tests. Their entries are shown explicitly as **local templates** or **local catalog definitions**, not live Kingdom workflows, connected providers or completed work. Selecting a template only drafts a planning prompt; execution requires an explicit owner-submitted Kingdom task.

Not yet provided: real persistent Kingdom workflow definitions and step-oriented run IDs, verified cross-device orchestration, privileged app/file tools, or local/remote task reconciliation under partition. These remain GA blockers in issue #150.
