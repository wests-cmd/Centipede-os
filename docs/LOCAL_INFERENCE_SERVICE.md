# Supervised offline AI in Segmentor

Centipede now contains a **host-only, opt-in, CPU-only read-only inference broker** at `/api/v1/local-ai/status` (GET) and `/api/v1/local-ai/generate` (POST). It works independently of Kingdom credentials on the local desktop. It does **not** install `llama.cpp`, download GGUF models, run commands from model output, claim a stronger Kingdom model is connected, or start inference merely by opening the UI.

It is disabled until the device owner configures the **host process environment**. It is not reachable as a privileged service from a phone or LAN: HTTP adapter checks the actual loopback socket, Host and browser Origin, and generation requires `X-Centipede-Owner-Intent: 1` from an explicit user action. This is local desktop session authority, **not** a substitute for login isolation between untrusted local users. Treat the auto-login live-USB session as a single-user system.

## Bring your own installed llama.cpp and GGUF

Choose an existing **read-only compact GGUF smaller than 1 GiB**, install a compatible `llama-cli` binary, and obtain a completed safe receipt from `scripts/benchmark-local-profiles.py` using that same model and runtime. Follow [LOCAL_MODEL_PROFILE_VALIDATION.md](LOCAL_MODEL_PROFILE_VALIDATION.md) first.

For an installed Debian image, a system administrator should arrange root-owned paths readable by the unprivileged `centipede-web` service and ensure `/proc/meminfo` and `/proc/<pid>/status` are visible. The default live image only bundles a static Python server until the separate image/API packaging PR is merged and boot-tested, so configuring environment variables alone does **not** make the existing ISO support this feature.

Set the following **server-side environment variables** (not browser localStorage or JavaScript):

```ini
CENTIPEDE_LOCAL_AI_ENABLED=1
CENTIPEDE_LOCAL_AI_MODELS_DIR=/opt/centipede/models
CENTIPEDE_LOCAL_AI_MODEL=/opt/centipede/models/qwen-compact-q4.gguf
CENTIPEDE_LOCAL_AI_CLI=/usr/local/bin/llama-cli
CENTIPEDE_LOCAL_AI_RECEIPT=/var/lib/centipede/local-profile/receipt.json
CENTIPEDE_LOCAL_AI_PROFILE=low
```

The filenames above are examples, **not** bundled files or verified downloads. Use `low` for 512-token context and one CPU thread; `balanced` requests 1,024 tokens and two CPU threads. Both require the actual benchmark receipt for the exact model hash and runtime version. No automatic profile selection or privileged model installation occurs. Operators must account for the systemd service's `ProtectHome=yes` and `ReadWritePaths`; place models in an explicitly approved **readable** directory rather than assuming host home/SD paths are accessible.

The model file must be read-only (`chmod a-w`, ideally owned by root), the model directory must not be group/world-writable or a symlink, and the executable and receipt must not be group/world-writable or symlinked. Do not alter the trusted runtime executable in a writable directory. The process hashes the whole model on each admission, checks a completed receipt with three safe samples of each of the four profiles, and compares runtime version, bytes, digest and measured RSS.

## Admission, isolation and failure behavior

- Linux-only `MemAvailable` gate requires at least 1.5 GiB available before inference **and** measured peak RSS plus a 512 MiB OS reserve. A missing measurement or changed model/runtime is `blocked`, not `ready`.
- One inference request per Centipede server process. The model is an on-demand child, not a persistent RAM-resident daemon. Max 128 generated tokens, 90 seconds, one/two CPU threads, and no GPU offload. Prompt text goes in a private temporary file, **not** process command-line arguments; the directory is removed afterwards.
- The helper monitors system available RAM and child RSS, signals its process group on over-budget generations, limits text output to 12 KiB and fails closed. It never attempts to install packages, call tools, approve actions or send prompts to the internet.
- Answers are labeled **unverified model text** in Segmentor. Complex work is still explicitly submitted through the existing separately authorized Kingdom action route and obtains a canonical Kingdom task ID. No automatic complex-task re-routing or permissions can be inferred from model text.

## What is and isn't verified

The source and CI tests can verify access controls, configured/disabled behavior, receipt checking, memory thresholds and an isolated fake executable lifecycle. They **cannot prove** actual `llama-cli` performance, thermal load, desktop responsiveness, Kingdom/DT1 worker failover or power-loss recovery on the target ~4 GiB machine. Those require a real machine and completed benchmark, as tracked in [issue #158](https://github.com/wests-cmd/Centipede-os/issues/158) and the GA gate [#150](https://github.com/wests-cmd/Centipede-os/issues/150).
