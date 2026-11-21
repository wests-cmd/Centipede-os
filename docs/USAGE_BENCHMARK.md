# Whole-system usage benchmark: scope and limitations

This suite measures how a person experiences the **compiled Centipede browser desktop and real Bun HTTP server** on a GitHub-hosted Ubuntu runner. It runs without live Kingdom credentials, without local LLM weights, and without physical hardware. **This is not a physical Centipede operating-system benchmark.**

## What is actually measured

- Fresh browser page navigation until the first-run wizard is visible; HTTP navigation timing
- Full automated six-step first-run setup against an intentionally offline Kingdom endpoint
- Real Chromium first-open and warm-open latencies for **14 desktop app panels**
- Warm application reload, renderer JavaScript heap and observed resource transfer sizes
- A 390×844 mobile-sized browser viewport, startup time and horizontal overflow
- Production Bun server process startup time, CPU percentage under the test workload, idle/peak process RSS
- Dist directory size, 100 sequential and 200 concurrent-loopback health requests, median/p95/max response latency and requests per second
- A negative security test: unauthenticated local Files access must respond HTTP 401

## How to run

Use **Actions → Centipede OS measured usage benchmark → Run workflow** on a branch or main, or open a PR changing the relevant source. The workflow builds the real Vite bundle, launches Bun/Chromium, performs actions, and uploads a `centipede-usage-benchmark` JSON artifact. It fails if required operations do not work.

Local Linux developer equivalent:

```bash
bun install --frozen-lockfile
bun x tsc --noEmit
bun run build
bun x playwright install --with-deps chromium
bun x playwright test --config playwright.usage.config.ts
python3 scripts/benchmark-runtime-usage.py
```

Read the exact commit SHA, environment, timestamp and scope alongside the results. CI CPU hardware may change at any time; do not use a single CI run to claim a particular physical-machine speed. Browser JavaScript heap, Bun process RSS and overall OS RAM are different quantities; **do not add them and call the total peak system RAM**.

## Still unmeasured until physical and integration acceptance

| Subsystem | Required real-life validation |
| --- | --- |
| Bare-metal boot and permanent installer | USB-to-disk graphical install, disk target protection, startup across BIOS/UEFI hardware, reboot without USB |
| Laptop 2 low-end daily driver | 4 GiB RAM/dual-core sustained CPU load, browser/kiosk total RSS, responsiveness, thermal, battery, swap |
| DT1 | Headless install/boot, user-initiated pairing and recovery |
| Kingdom | Owner-authorized signed task, verification result, two-node failover, revocation and reconnected task truth |
| Segmentor local AI | Owner-installed model GGUF and runtime; first-token latency, token/s, peak RSS and swap delta |
| Voice / camera / screen | Real device permission UX, capture/deny, recovery and accessibility |
| Mobile | Publisher-signed APK/IPA, real phones, pairing, revocation, file upload, battery/network use |
| Signed updates and rollback | Cryptographic verification, interrupted upgrades, preserved data and recovery |
| 24-hour endurance | CPU, memory, disk growth, leakage, background scheduling and novice user journeys |

This benchmark is a **measurement harness**, not permission to relabel these gates as complete. The stricter physical checks are specified in [PHYSICAL_ACCEPTANCE.md](PHYSICAL_ACCEPTANCE.md). Results must be derived from real script output; never put guessed values into the README.
