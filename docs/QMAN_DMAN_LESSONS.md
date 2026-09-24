# Architectural Lessons & Hardening Guidelines (Q-Man / D-Man Interrogation)

This document captures the key architectural lessons, security anti-patterns, UX guidelines, and execution invariants established during the 100-loop Q-Man / D-Man interrogation pass.

---

## 1. Master Security Invariant: AI ≠ Execution Authority

```text
USER -> SEGMENTOR -> INTENT -> PLAN -> PERMISSION_GATE -> JIT_GRANT -> TOOL_EXECUTOR -> KINGDOM AUTHORIZE -> EXECUTION
```

- **Lesson 1**: AI model text output carries **zero execution authority**. Model strings like `authorized=true` or `approved=true` must be strictly ignored at the execution boundary.
- **Lesson 2**: Every privileged action requires an explicit, single-use `CapabilityGrant` with recursive parameter hash canonicalization (`computeParameterHash`). Parameter payloads modified post-approval fail verification closed.
- **Lesson 3**: Concurrent grant usage races must be handled atomically. Memory state tracking guarantees exactly 1 execution per JIT grant.

---

## 2. Dynamic Protocol Negotiation vs. Hardcoded Version Ceilings

- **Lesson 4**: Centipede OS must discover Kingdom runtime versions dynamically (`READ -> NEGOTIATE -> ADAPT -> VERIFY -> OPERATE`). Hardcoding expected release versions (e.g. `40.1.0`) creates fragile integration boundaries.
- **Lesson 5**: Version compatibility is protocol-driven (Protocol Major `1`). Centipede OS gracefully accepts compatible future release tags (e.g. `v1TAS`, `v40.2.x`) while blocking breaking major protocol changes (`INCOMPATIBLE_PROTOCOL`).
- **Lesson 6**: Task status queries interrupted by Kingdom network loss must yield an authoritative `unknown` state. Centipede OS must never synthesize or assume task completion without Kingdom confirmation.

---

## 3. Web Bundling & Cross-Runtime Cryptography

- **Lesson 7**: Client-bundled browser code must avoid importing `node:crypto`.
- **Lesson 8**: Pure TypeScript synchronous SHA-256 helpers (`syncSha256` in `src/security/cryptoUtils.ts`) accepting raw `Uint8Array` buffers enable Vite web production bundling without node externalization errors while producing byte-exact SHA-256 checksums matching system `sha256sum`.

---

## 4. Offline Core & Restrained Visual Tokens

- **Lesson 9**: Core desktop UI dependencies must not rely on external CDN runtime scripts (e.g. runtime Tailwind CDN scripts in `index.html`). All styling must compile locally at build time.
- **Lesson 10**: The visual language uses a restrained 3-color primary token system (`brand.dark` `#020617`, `brand.active` `#2563eb`, `brand.alert` `#dc2626`).
- **Lesson 11**: Canvas animations (`CentipedeWorldVisual.tsx`) must pause execution when hidden (`IntersectionObserver`) and support `prefers-reduced-motion` and low-power modes.

---

## 5. Truthful Release Engineering & OS Boundaries

- **Lesson 12**: Build scripts (`scripts/build-release.ts`) must calculate archive checksums directly from final archive bytes.
- **Lesson 13**: Documentation and release manifests must clearly distinguish buildable desktop artifacts (`tar.gz`, `docker-compose.yml`) from planned bare-metal ISO milestones. Never claim an ISO exists unless an actual bootable ISO artifact is produced.
