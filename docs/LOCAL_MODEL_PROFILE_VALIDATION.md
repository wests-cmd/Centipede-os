# Local AI CPU/context profile experiment — evidence gate

This is an **optional experiment**, not an installed AI service or proof that Centipede OS can answer prompts offline. It extends the existing low-memory `llama-bench` harness with a separate **real `llama-cli` generation** test. The existing benchmark tests 1 versus 2 threads using synthetic prompt/generation token counts; those are not the same as the model context window. This experiment explicitly tests `-c 512` and `-c 1024`, each with 1/2 CPU threads and three repeats.

## Owner-run experiment on a quiet Debian machine

Prerequisites: already installed `llama-cli`, GNU `/usr/bin/time`, and a **local, owner-selected, under-1-GiB GGUF**. No download is performed. The recommended starting candidate is a small Q4_K_M instruct model, subject to its compatibility and license. Keep the model on SD storage if preferred, but do not assume SD load times match internal storage.

```sh
command -v llama-cli
/usr/bin/time --version
free -h
python3 scripts/benchmark-local-profiles.py \
  --model "/absolute/path/to/model.gguf" \
  --output "$HOME/centipede-local-ai-profile-1" \
  --idle-confirmed
```

Start on a machine whose Kingdom/worker queues are paused and other model instances are idle. While the experiment runs, use the actual desktop to check whether clicks, window switching, and file browsing remain responsive. Only if this was independently verified should `--responsive-confirmed` be used on a new, comparable run. Do not run two experiments simultaneously. Output directories must not already exist.

The tool keeps inference CPU-only (`-ngl 0`), 1 or 2 threads, 128 generated tokens, 512/1024 context, a per-run time cap, nice priority, 512 MiB available-RAM stop floor, an initial 1.5 GiB free-RAM threshold, and a process RSS budget of roughly 1.2 GiB. When a process fails, exceeds its time/memory safety criteria, or the OS swaps, the experiment fails closed and preserves `receipt.json` plus individual logs. Killing the benchmark never changes Kingdom or OS settings.

## Interpreting results

`receipt.json` includes model SHA-256, runtime version, each profile's context, threads, wall-clock seconds, process peak RSS, system-wide swap deltas, and **generation tokens/s only when llama-cli emits an unambiguous timing line**. Missing timings are `null`, not guesses. Swapping may be caused by another process, so it is a conservative stop condition, not proof the AI alone caused it.

Even a successful `MEASURED` receipt is **not permission** to load models in production, automatically route work, execute shell commands, or grant AI tools. Human evaluation must check accuracy, latency, and system responsiveness. A 0.5B model should only be considered for narrow support tasks; autonomous coding, destructive file operations, and security decisions remain under Kingdom with independent policy/authorization.

## Follow-on integration gates

1. Host-only model service: configure a **known installed binary and explicit GGUF path**, never arbitrary network URLs or user-supplied executable paths; no downloads or model starts on page open.
2. Admission: read available RAM and actual measured peak RSS, reserve OS/Kingdom memory, refuse unknown/unmeasured configurations, limit concurrency to one, and stop on low memory.
3. Routing: basic offline explanations can be local when enabled; complex work goes through Kingdom's authenticated task/worker API; no model has independent permission to execute actions.
4. Model output: parse bounded strict tool-call JSON using schema validation and fail closed on truncated, malformed, or unknown capability arguments. Model text never conveys owner approval.
5. User-facing truth: show `not configured`/`running`/`blocked`, model and quantization, context/thread profile, observed RAM, and exact local/Kingdom routing rationale. No fake success status.
6. Evidence: rerun after changing model/quantization/context, verify on a real dual-core ~4 GB device, power-loss/restart and offline tests, then add supervised Kingdom remote routing with per-worker health receipts.

This deliberately does **not** mark any of Centipede's GA release criteria complete.
