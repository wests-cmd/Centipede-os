# Centipede OS — Public Release Upgrade Blueprint

## 1. Vision & Target User Personas

Centipede OS brings autonomous intelligence into daily computer interaction without requiring technical knowledge of Linux, Docker, or command-line scripting. The public experience directly caters to five distinct personas:

| User Persona | Target Capabilities | Interface Profile |
|---|---|---|
| **Beginner** | Download, install, ask questions in plain English, and use desktop apps without terminal interactions. | Simple Mode (Guided, maximum guardrails) |
| **Everyday User** | Manage files, programs, routine updates, and resolve system issues with automated repair guidance. | Balanced Mode (Everyday apps + Assistant) |
| **AI Enthusiast** | Connect Claude Code, Ollama, OpenAI, or local weights seamlessly through automated adapters. | Assisted Integration Mode |
| **Developer** | Author skills, automate build workflows, use controlled computer-use, and inspect execution audit trails. | Advanced Developer Mode |
| **Business / Team** | Pair trusted devices (DT1 & Laptop 2), share approved workflows, and manage role-based permission policies. | Managed Fleet Mode |

---

## 2. Public Architecture: Application vs. Operating System

A fundamental architectural distinction is enforced between **using Centipede as an application** and **installing Centipede as an operating system**:

1. **Centipede as an Application (Desktop SPA / Web Bundle):**
   - Runs in user-space in an existing browser or Electron/Tauri container.
   - Zero risk to internal disk partitioning or host operating system.
   - Operates in memory; relies on loopback or remote Kingdom services for execution.
2. **Centipede as an Operating System (Debian Live / Calamares Disk Install):**
   - Bootable Live USB environment for testing on bare metal without modification.
   - Persistent disk installation with explicit disk selection, partition confirmation, and bootloader configuration.
   - Full device integration, hardware telemetry, and native daemon sandboxing.

---

## 3. Modular Public Feature Architecture

The public release refactors feature capabilities into cohesive domain modules:

| Feature Area | Path | User-Facing Purpose |
|---|---|---|
| **Download Center** | `src/features/downloads/` | Auto-detect host platform (x86_64, ARM, Docker, ISO) and offer verified installer checksums. |
| **First-Run Wizard** | `src/features/onboarding/` | Non-technical first-run onboarding wizard configuring persona, interface mode, and security defaults. |
| **Guided AI Setup** | `src/features/models/` | Graphical provider selection (Ollama, Anthropic, OpenAI) without manual API scripting. |
| **Preferences & Modes** | `src/features/preferences/` | Dynamic Simple vs. Advanced interface toggling and accessibility adjustments. |
| **Permission Center** | `src/features/approvals/` | Human-readable explanation of why the AI requested a capability and its security impact. |
| **Computer Control** | `src/features/computer-use/` | Controlled, opt-in computer interaction (window focus, typing, clicking) with ZeroTrust boundaries. |
| **Recovery Assistant** | `src/features/diagnostics/` | Guided troubleshooting and self-healing repair checks (Centipede Doctor). |
| **App & Skill Store** | `src/features/marketplace/` | Verified skill packages and everyday application management. |
| **Update Center** | `src/features/updates/` | One-click release verification and safe rollback points. |
| **Mobile Pairing** | `src/features/mobile/` | Single-use PIN pairing to control and monitor Centipede from a trusted phone browser. |

---

## 4. Kingdom Bridge & ZeroTrust Security

Centipede OS maintains an explicit separation of concerns:
- **Centipede OS**: User presentation, accessibility, desktop shell, media capture, and application launcher.
- **Kingdom**: Autonomous execution, task scheduling, security authorization, and multi-node swarm orchestration.
- **Security Boundary**: All remote connections require HTTPS and clean URLs. Standalone operation operates fail-closed with clear offline indicators.
