# Local inference baseline: source verification and safe experiment

Reviewed 2026-10-23. This note keeps external benchmark reports separate from measurements on the owner's laptop.

## Verified source facts

The [official llama-bench guide](https://github.com/ggml-org/llama.cpp/blob/master/tools/llama-bench/README.md) documents CPU thread selection, local model files, repeats and output formats. Its benchmark isolates model computation; it does not measure the complete Kingdom conversation, tokenization, scheduling or sampling latency. An ARM result is not an AMD A4 prediction.

The [llama.cpp v0.7.0 release notes](https://github.com/ggml-org/llama.cpp/releases/tag/v0.7.0) describe integration changes, including the standalone server default port 9931 while Docker retains 8080. Configure the actual endpoint explicitly; do not change a working endpoint merely because an upstream default changed. No runtime upgrade was made for this experiment.

The [official Qwen3-0.6B GGUF model page](https://huggingface.co/Qwen/Qwen3-0.6B-GGUF) provides model-specific artifacts and usage. A quantization label does not imply that different publishers' files have identical size or identity. Model storage size is not runtime RSS or total system memory.

## Actual laptop preflight

Known approved Debian host only, 2026-10-23: x86_64, 2 logical CPUs, 3783 MiB total RAM, 2221 MiB available, 182 MiB swap in use. PackageKit was using CPU during observation. No installed llama-bench or executable /usr/bin/time was found. The shell's time keyword is not GNU time.

Therefore **no 1-versus-2 llama-bench performance measurement was run** and no winner or speed estimate is claimed. No model download, runtime build, package installation, inference workload or production profile change occurred. The existing Ollama Qwen artifact is not replaced by another publisher's roughly 397 MB file.

## Prepared experiment

Use scripts/benchmark-local-inference.py on Linux after an administrator's normal installation of llama-bench and GNU time, and only with an already installed GGUF. Check Kingdom task/model queues and competing inference are idle first. If charging is needed, defer until charging. The harness requires 1.5 GiB available RAM and a low one-minute load; it stops its own process group if available RAM drops below 512 MiB or its per-configuration timeout expires.

Example (replace the two local paths with verified installed files):

```sh
python3 scripts/benchmark-local-inference.py \
  --model /verified/local/model.gguf \
  --bench /verified/local/llama-bench \
  --output /tmp/centipede-baseline-new \
  --idle-confirmed
```

Runs are sequential and CPU-only: 512 prompt tokens, 128 generated tokens, three repeats, first one thread then two. The existing file's SHA-256 and byte count, runtime version, raw CSV, stderr, per-process peak RSS, wall time and system-wide swap-counter deltas are retained. Each configuration is limited to 240 seconds by default, at most 300. The model is capped at 1 GiB. There are no network/download flags or automatic configuration edits.

Review independent responsiveness after the runs; the default receipt withholds a final winner until that is confirmed. Prefer two threads only for at least 10% generation throughput gain with peak RSS within the proposed 1.2 GiB budget and zero system-wide swap-counter increase. Existing swap occupancy alone does not prove active swapping. Swap counters can also reflect other processes, so a nonzero delta requires investigation rather than blaming the model. Preserve no-result/failed receipts; do not use them to update production settings.

The harness's fixed CSV-schema parser intentionally fails if a runtime changes output shape. It does not reinterpret malformed output as a successful benchmark. Cold-start and ordering effects, thermal state and broader app latency still need a subsequent application-level check.

Run deterministic harness tests with `python3 -m unittest discover -s scripts -p test_local_inference_benchmark.py`. These use synthetic CSV and real bounded Linux child processes; they are not model-performance measurements.


Verification: five deterministic tests passed on the approved Linux host (including real timeout/process-group cleanup); Windows ran four tests and correctly skipped the Linux-only lifecycle test. This establishes harness behavior, not inference performance.
