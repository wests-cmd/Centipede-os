# CENTIPEDE OS SECURITY ASSUMPTIONS SPECIFICATION

## 1. Hardware & Kernel Layer Assumptions

1. **Hardware Firmware Integrity**: Centipede OS assumes that underlying CPU, motherboard, and RAM hardware firmware have not been maliciously tampered with at the physical manufacturing level.
2. **Host Kernel Isolation**: Centipede OS assumes the host operating system kernel provides process memory isolation between containerized non-root processes and host kernel space.

---

## 2. Execution Authority Assumptions

3. **Kingdom Sole Execution Authority**: Centipede OS assumes Kingdom backend API (v40.1 on port 8000) is the sole execution authority for operating system, process, network, and node operations.
4. **No Direct System Invocation**: Centipede OS assumes that no component (AI model, planner, memory, skill, mobile app) can directly invoke system shell primitives (`exec`, `system`, `/bin/sh`) without passing through `ToolExecutor.execute()`.

---

## 3. Cryptographic & Token Assumptions

5. **CSPRNG Security**: Centipede OS assumes system CSPRNG (`globalThis.crypto.getRandomValues`) produces unguessable random numbers for session tokens, JIT grant IDs, and device pairing PIN codes.
6. **SHA-256 Digest Integrity**: Centipede OS assumes SHA-256 cryptographic digests (`crypto.createHash('sha256')`) are computationally infeasible to collide.

---

## 4. User Interaction & Approval Assumptions

7. **Human Approval Authority**: Centipede OS assumes that human user approval via UI or paired mobile client represents explicit authorization for the requested capability and parameter hash.
8. **Parameter Hash Non-Bypass**: Centipede OS assumes that if parameters are modified after human approval, the parameter hash check (`parameterHash`) will fail and reject execution.

---

## 5. Network & Offline Assumptions

9. **Fail-Closed Offline Behavior**: Centipede OS assumes that when network interfaces or Kingdom backend connections drop, the runtime must fail closed (`KINGDOM_OFFLINE`) rather than falling back to un-granted execution.
