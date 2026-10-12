# Local AI and task workspace

## Available in this branch

- The Kingdom status page includes a Local Model Studio backed by the configured Ollama service. It can list installed models, pull a model by its Ollama name/tag, and create a reusable model profile with a system prompt.
- A custom system-prompt profile changes model instructions; it does not train or alter model weights. This release does not include a fine-tuning trainer, dataset builder, model abliterating tool, model quantizer, or model-license review service.
- Task descriptions accept 20,000 characters and up to eight reference files (20 MB per file; 40 MB combined). Supported inputs include PDF, ZIP, DOCX, XLSX, PPTX, JPEG, PNG, WebP, text, code, CSV, and JSON formats.
- Text and office files are extracted in the browser. ZIP files are inspected in memory with limits on archive size, entry count, and expanded content. PDFs extract up to 80 pages of selectable text. Scanned PDFs still need OCR.
- Image files are resized in the browser and sent to the configured Ollama model only when the user supplies a model name. A vision-capable model is required. If image analysis is unavailable, the user can provide a description.
- The optional local plan is a draft only. It does not start a Kingdom task. The user reviews it, chooses to include it, and submits separately. Local model output remains untrusted and cannot authorize computer actions.
- Optional local context compression is user-triggered and the resulting notes can be edited before submission. Without compression, extracted material is capped at 180,000 characters. Attachments are not stored by Centipede; file names, sizes, checksums, extracted text, and user-reviewed notes are included in the Kingdom task request.

## Local model service

Set `OLLAMA_API_URL` on the Centipede server. Host-run Centipede defaults to `http://localhost:11434`. Docker Compose points to `http://host.docker.internal:11434` by default; use the environment variable to configure a different local Ollama address. The Centipede API only accepts loopback or named local Docker hostnames, keeps requests server-side, and restricts model-management routes to local-admin requests. Docker Desktop/reverse-proxy deployments may not satisfy that loopback check and must be verified on the target setup.

Model downloads need disk space and can be several gigabytes. Check the selected model's license and requirements before downloading it. Model providers may differ in available capabilities, including vision. Kingdom authorization remains separate from the local model manager.

## Safety and limits

- Reference files and model outputs are untrusted data. Do not paste passwords, tokens, private keys, or broker credentials into task prompts or files.
- Financial automation plans are paper-trading/backtesting plans only. The repository has no supported broker credential vault or real-money order adapter. No trade should be placed through this interface.
- The UI can show Kingdom's worker nodes, and submitted tasks go through Kingdom's existing task API. This Centipede change does not add node pairing, resource measurement, workload placement, or prove that Kingdom distributes a given task across computers.
- The current Kingdom contract documents task submission and model health/inference, but not file upload, model lifecycle, task planning approval, brokerage credentials, or fine-tuning. File contents are passed in the task prompt as bounded extracted text, with provenance in metadata; binary files are not uploaded to Kingdom.

## Update behavior

The web app checks the server version periodically. Same-major/minor patch versions reload the browser page automatically; larger version changes ask before reloading. A page reload interrupts the current browser session, and the browser fetches the app's served assets again; this is not a binary delta update or guaranteed zero-downtime patch.

This feature is not an installed-OS updater. It does not patch the ISO, installed root filesystem, kernel, bootloader, Docker image, Kingdom service, or user data. Centipede currently has no staged/atomic OS update, health-based rollback, or update resume transaction. Those require a signed system-image/package channel and installer/update backend.

## Work required for the requested Codex-like product

1. Add a Kingdom task-plan and approval contract that stores a reviewed plan, exposes step status and evidence, and prevents execution until the exact plan and capabilities are approved.
2. Add persistent task workspaces, structured outputs, checkpoints, cancel/resume semantics, provenance, and a visible audit trail.
3. Add authenticated file upload and reference retrieval to Kingdom, with malware scanning, quotas, retention controls, and content-extraction/OCR policies.
4. Add a private credential vault and per-action grants. Credentials must never enter prompts, task metadata, model context, or logs.
5. Add opt-in worker enrollment and telemetry, hardware/resource budgets, placement policy, isolation, and task failover. Prove locality, network scope, and fail-closed behavior.
6. Add a signed update manifest, content-addressed chunks, staging, atomic activation, health checks, rollback, and power-loss recovery for the installed OS.
7. If genuine fine-tuning is required, build a separate training pipeline with consent, dataset provenance/removal, safety evaluation, model licensing, resource limits, and signed output artifacts. Prompt-based Ollama customization is not fine-tuning.

