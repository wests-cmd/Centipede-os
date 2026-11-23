# Background Work — isolated, opt-in computer-use harness

**Status:** New source-level experimental worker; **not included in published v1.0.1-rc.11** and **not certified for mass-market or unattended high-risk tasks**. The human desktop shell stays in Centipede, while authoritative Kingdom tasks/approvals remain in Kingdom. This worker is its own narrow, local, non-privileged execution domain.

## What this actually does

The owner can approve recurring tasks against a **single public HTTPS site**. Each task executes in a **new headless Chromium browser context** inside a **separate Linux Docker worker**, with no host keyboard, mouse, clipboard, microphone, camera, browser cookies, personal browser profile, home directory, Docker daemon socket, or X11/Wayland mount. Available operations are: open the preapproved URL, read the page and record only a SHA-256 body digest/change indicator; optionally click a same-site anchor link, fill a nonsecret field **without submitting**, or capture a bounded screenshot. **No arbitrary JS, shell, file upload, POST request, cross-site navigation, login, payment, or on-device desktop control.**

Tasks **self-schedule after owner opt-in**: the owner approves a site, safe step and interval (at least 15 minutes); the scheduler later chooses the next due routine and acts without asking again. It does **not** invent unrestricted goals or independently approve its own permissions. Page content is untrusted data, never code, a system prompt, or new authorization.

The worker is independent of the Centipede GUI: closing the window does not stop it. The SQLite queue and control settings survive worker restarts; unexpected in-progress work is marked **interrupted** and **never replayed automatically** because its result may be unknown. Docker `restart: unless-stopped` restarts the worker if the container host comes back and Docker starts. **Nothing can execute on a powered-off computer**: for work while Laptop 1/2 are turned off, deploy the worker on another **powered-on** authorized machine.

## Quick developer setup (not yet a no-terminal installer)

Prerequisites: an Intel/AMD 64-bit Linux/Windows Docker host, Docker Compose, and the repository's current source. The published RC11 image does not install the worker. Windows uses Docker Desktop with Linux containers; macOS/ARM and native installation have not been verified. A configured owner-session credential in the Centipede web server is required for GUI writes.

1. From the repo root run `python3 scripts/setup-harness.py` exactly once. It writes `.centipede-harness.env` with a random 256-bit secret and local worker URL, mode 0600. The script **will not replace an existing secret**.
2. Start the isolated worker explicitly: `docker compose -f docker-compose.harness.yml up --build -d`. Its HTTP port is published to the host's **loopback only** on 127.0.0.1:3011.
3. Configure the **Centipede web/API server**, not the browser, with `CENTIPEDE_HARNESS_URL=http://127.0.0.1:3011` and the same `CENTIPEDE_HARNESS_TOKEN` from the private file. For local developer testing, one option is to load the environment into your existing shell with `set -a; . ./.centipede-harness.env; set +a` before running `bun start`. Do **not** put the secret in an HTML file, browser storage, README, screenshots or Git. A containerized web server requires a separately verified internal service-network connection instead of `127.0.0.1`.
4. If the server has an authorized Kingdom owner code configured, unlock the normal local owner action session. Open **Home → Background Work**. Add a public HTTPS routine; leave it disabled until you review it.
5. Choose **Enable approved work**. The worker picks due routines itself while the desktop is closed; the **Status and Receipts** panels are read-only observations. **Pause**, **Disable** and **Remove** are owner-gated. Pause/disable prevents new claims immediately, and the running browser subprocess polls the owner stop state at most once per second and is then killed as a process group. An already completed external observation cannot be undone; interrupted outcomes are recorded as unknown and not automatically replayed. The 30-second watchdog remains a separate upper bound.

**If no Kingdom owner credential is configured, the current GUI cannot unlock its owner-action session**, even if the worker is up. That no-terminal onboarding gap must be closed before this qualifies as an ordinary beginner-ready installer. Do not bypass the security check.

## Security/authority boundaries

| Component | Authority | Explicitly denied |
| --- | --- | --- |
| Centipede local UI | Local owner may view real worker receipts; write operations use the existing short-lived owner session | Direct access to worker token, arbitrary worker URL or host process execution |
| Centipede API broker (`src/server/harnessProxy.ts`) | Fixed GET status and owner-gated POST control/add/remove only, on authenticated loopback; token remains server-side | LAN/phone callers, unverified owner writes, arbitrary HTTP proxy, unbounded response |
| Separate harness service (`harness/service.py`) | Bearer-authenticated fixed API; one active browser job, private SQLite store and bounded receipt history | Unauthenticated commands, shells, site-supplied task instructions, unapproved routine schemas |
| Browser child (`harness/browser_task.py`) | Temporary Chromium context; same-site HTTPS GET, link click/field fill/screenshot only | Host display input, forms, POST, cross-domain requests, local/metadata/private IP and file access |
| Kingdom | Remains independent task, permission, trust and remote-node authority | No implicit trust granted by a Centipede worker status or browser receipt |

The worker starts **autonomy OFF** and with **zero routines**. Its secret is 64 lowercase hex characters; `scripts/setup-harness.py` obtains it through the OS cryptographic RNG. Server-to-worker routing permits only fixed localhost or known internal Docker service endpoints. **Local-only does not automatically imply safe**: the worker API also requires a bearer token, and the user-facing mutation proxy requires a distinct time-limited local owner session.

Website-origin/SSRF controls: the owner may configure **only HTTPS** without embedded credentials or unusual ports; hostnames and all DNS answers must be public. `.local`, localhost, special IP and cloud metadata names are rejected. Browser requests are filtered to one original HTTPS host and GET only, and Chromium's DNS mapping is pinned to the previously verified public IPv4 for that run. These checks are defense in depth; **independent adversarial network testing remains necessary before public autonomous browsing certification**.

Browser sandboxing: the code **requires** `chromium_sandbox=True`; it must fail instead of disabling the Chromium sandbox to make a problematic host work. The container uses a vendored copy of the [official Playwright seccomp profile](https://github.com/microsoft/playwright/blob/main/utils/docker/seccomp_profile.json) for user namespace creation; check this strict profile against the exact browser release when upgrading. Official Playwright documentation notes that its developer Docker image alone is **not recommended for untrusted web scraping** and recommends a non-root user and an appropriate seccomp profile. This preview runs nonroot and drops all capabilities **except SYS_CHROOT**, narrowly restored for Chromium's zygote sandbox; SYS_ADMIN and privileged/unconfined mode remain forbidden. It is read-only except the private volume and bounded tmpfs, uses `no-new-privileges`, and caps PIDs at 128, RAM at 1 GiB and CPU at 0.75, with CPU shares 128 and OOM score adjustment +500 so interactive services receive preference under contention. This is still experimental: the exact container sandbox launch, egress policy and physical resource impact must pass before GA. **This combination still needs real sandbox/escape and egress verification on each deployment before trusting arbitrary untrusted pages.** If the Chromium sandbox cannot start on that host, jobs fail closed; do not add `--no-sandbox` as a workaround.

Resource/UX coexistence: it uses a separate browser with **no active-session input at all**. Before claiming jobs, it defers on less than **1 GiB Linux host MemAvailable**, above roughly half a CPU-core of 1-minute load per logical CPU, or missing resource metrics. This is a *host kernel hint*, not a verified cgroup/interactive-user idleness measurement. Even a container limited to 0.75 CPU and 1 GiB RAM may affect performance on a 4-GiB dual-core PC. Running it on a separate always-on machine is preferable. No guarantee of zero resource interference is claimed.

Data retention: one SQLite queue, up to 20 routines and 200 recent run receipts; each receipt stores a timestamp, run state, error category, and page-body digest, not a full page transcript. An explicitly requested screenshot is written only into the worker's private volume and limited to 2 MiB. Only the 20 newest completed-run screenshots are kept (at most 40 MiB from approved captures); older worker-created screenshot files are pruned on completion and restart, without deleting unrelated filenames. It is not silently uploaded to Kingdom. There is no GUI screenshot preview or screenshot export yet. Protected work requires explicit owner action.

## Architecture: where code is and what connects to it

```
Centipede Home / Sidebar
  └── BackgroundHarnessApp.tsx
        ├── GET /api/v1/harness/status (loopback only)
        └── POST /api/v1/harness/{control,routines,routines/delete}
             (existing expiring owner unlock + intent header)
              └── src/server/routes.ts
                   └── src/server/harnessProxy.ts (fixed origin + secret)
                        └── harness/service.py (authenticated local API, persisted control)
                             └── harness/core.py (SQLite durable policy + receipts)
                                  └── bounded browser subprocess (30-sec process-group watchdog)
                                       └── harness/browser_task.py
                                            └── harness/browser.py (headless no-login Chromium)
```

`docker-compose.harness.yml` and `Dockerfile.harness` deploy the worker explicitly; they never mount Docker socket or user desktop volumes. `scripts/setup-harness.py` creates its private secret. `tests/harness/test_harness.py` validates policy/persistence and no-anonymous-control; `tests/unit/background_harness_proxy.test.ts` validates the Centipede owner broker; `.github/workflows/background-harness.yml` verifies image build, authenticated HTTP, restart persistence and a real Chromium sandbox launch.

## What must pass before claiming “daily-driver AI harness”

**Acceptance gates:** (1) actual browser navigation and bounded action tests inside the deployed Docker profile; (2) sandbox and cross-origin/SSRF adversarial tests; (3) owner-consent changes after restarts/power loss; (4) automatic update/rollback and private state backup; (5) real 24-hour trial on dual-core ~4-GiB hardware plus user-active CPU/latency measurements; (6) real Kingdom task/approval/remote worker integration; (7) GUI first-run installer with no secret-handling in a terminal; (8) native, permanent, recoverable OS installer and signed update path; (9) accessible screen reader/mouse-free onboarding; (10) documented privacy, licensing, support and vulnerability-response processes.

**Not implemented:** a general-purpose LLM planner, native-app mouse/keyboard interaction in a separate virtual desktop, self-writing code deployment, independent broad task creation, mobile authorization, PC-off execution, and host-permanent installation. The current background worker is a safe narrow slice to extend, not a substitute for those acceptance gates.

**Named-volume permissions:** Docker Compose runs one ephemeral root initialization helper with *only* `CHOWN` and `FOWNER`, with networking disabled, to assign the private volume to the unprivileged browser account. The actual browser worker never runs as root and does not inherit those capabilities. This helper is mandatory only for initialization; it is not a second autonomous service.
