# Documentation index

This navigation organizes existing source and evidence; it moves no runtime files or entrypoints.

| Need | Guide |
| --- | --- |
| Try the published USB image | [Beginner installation guide](INSTALLATION_GUIDE.md) |
| Understand application, image and mobile boundaries | [Architecture](ARCHITECTURE.md) |
| Run, configure, build and test | [Development](DEVELOPMENT.md) |
| Operate services and update safely | [Operations](OPERATIONS.md) |
| Check published versus implemented versus unverified | [Project status](PROJECT_STATUS.md) |

## Source and integration references

- [Repository overview/source map](../README.md)
- [Kingdom integration](../KINGDOM_INTEGRATION.md), [versioned API contract](../KINGDOM_CENTIPEDE_API_CONTRACT.md), [read-only observations](operations/KINGDOM_READ_OBSERVATIONS.md)
- [Trust boundaries](TRUST_BOUNDARIES.md), [Centipede trust boundary](CENTIPEDE_TRUST_BOUNDARY.md), [security assumptions](SECURITY_ASSUMPTIONS.md)
- [Accessibility checklist](ACCESSIBILITY_EXPANSION_CHECKLIST.md)
- [Local inference baseline](implementation/LOCAL_INFERENCE_BASELINE_20261023.md): a separate measurement harness, not a bundled model or established hardware benchmark
- [Selected local knowledge sources](implementation/SELECTED_KNOWLEDGE_SOURCES.md): opt-in native API and bounded untrusted excerpts, not a background learner or AI summary

## Builds, releases and outstanding gates

- [Executable target manifest](../release/targets.json): buildable/blocked targets
- [Platform/signing guide](PLATFORM_BUILD_GUIDE.md), [mobile signing](MOBILE_SIGNING.md)
- [Release workflow](RELEASE_WORKFLOW_GUIDE.md), [certification](release/RELEASE_CERTIFICATION.md), [release matrix](release/RELEASE_MATRIX.md)
- [Ship reality matrix](SHIP_REALITY_MATRIX.md), [boot/recovery checklist](BOOT_RECOVERY_CHECKLIST.md)
- [Master release checklist](MASTER_RELEASE_EXECUTION_CHECKLIST.md), [execution status](MASTER_RELEASE_EXECUTION_STATUS.md), [gap register](MASTER_GAP_REGISTER.md)

Read records with their date, source revision and artifact scope. BUILDABLE does not mean current source was published or tested on physical hardware.

## Historical reports

Reports are preserved. [Current reality](CURRENT_REALITY.md), numbered phase/build/readiness reports and the [older production runtime guide](operations/PRODUCTION_RUNTIME_GUIDE.md) describe earlier observations or design claims. The older guide's API-version, zero-loss and five-second recovery claims are not current guarantees. Use [Operations](OPERATIONS.md), current code and exact-run evidence for decisions.

A contradiction is a gap to review, not permission to assume the larger completion claim. No report overrides execution controls or authorizes a disk write.
