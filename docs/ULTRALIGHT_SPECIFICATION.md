# CENTIPEDE OS ULTRALIGHT SPECIFICATION v1.0

## Executive Summary

Centipede OS Ultralight is a lightweight, secure deployment profile designed to deliver the complete Centipede OS ZeroTrust security architecture, desktop shell, Jarvis assistant, and Kingdom integration under a strict **5 GB installed/downloadable footprint limit**.

---

## 1. Footprint Budget & Footprint Target

```text
CENTIPEDE OS ULTRALIGHT STORAGE BUDGET (HARD CEILING: 5.0 GB)

Download Artifact (Compressed ISO/Image):   1.8 GB
Installed Base OS System (/system):         2.2 GB
Kingdom Core Runtime (/data/kingdom):       0.4 GB
Recovery Environment (/recovery):          0.6 GB
--------------------------------------------------
TOTAL BASE INSTALLED FOOTPRINT:             3.2 GB
HEADROOM UNDER 5.0 GB LIMIT:               1.8 GB (36% Margin)
```

---

## 2. Core vs. Optional Component Architecture

To achieve < 5 GB without sacrificing security or functionality, Centipede OS Ultralight separates core runtime capabilities from optional workloads:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    CENTIPEDE OS ULTRALIGHT BASE                 │
│                 (3.2 GB Installed / Included Base)              │
│                                                                 │
│  • Centipede OS Desktop Shell & Settings UI                     │
│  • Kingdom v40.1 API Integration Adapter (`KingdomAdapter`)     │
│  • ZeroTrust Execution Gate (`ToolExecutor.execute()`)           │
│  • JIT Capability Grant Engine (`CapabilityGrantEngine`)        │
│  • Permission Gate & Plan Validator                             │
│  • Device Trust Manager & Mobile Command App Server             │
│  • Approval Anti-Tampering Engine (`ApprovalTamperGuard`)       │
│  • Essential Drivers, Network Harness & Recovery Boot Tools      │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│               ON-DEMAND OPTIONAL PACKAGE MANAGER                │
│             (Explicit User Confirmation & SHA-256)              │
│                                                                 │
│  [ ] Docker Container Engine (`centipede/knight`)      [+1.8 GB]│
│  [ ] Local LLM Weights (GGUF 3B / 7B Parameters)      [+3.5 GB]│
│  [ ] Virtual Machine QCOW2 Runtime Disk Images        [+5.0 GB]│
│  [ ] Advanced Developer Toolchain                      [+1.2 GB]│
│  [ ] Specialized Skill Bundles                         [+0.4 GB]│
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. On-Demand Package Acquisition Rules

1. **No Silent Downloads**: The base system NEVER downloads optional packages, models, or container layers without explicit user confirmation.
2. **Transparent Storage Prompts**: Before installing any optional component, the UI displays:
   > "Optional Component: Docker Engine (1.8 GB). Available Storage: 42 GB. Install?"
3. **SHA-256 Package Verification**: Downloaded package archives must pass cryptographic SHA-256 checksum verification prior to staging or extraction.
4. **Resumable Downloads**: Package downloads support byte-range resume to handle intermittent network disconnections gracefully.
5. **Zero Security Compromise**: Ultralight retains 100% of Master Security Invariants 1–20. Removing optional workloads does NOT bypass `ToolExecutor` or Kingdom authorization gates.

---

## 4. Size Verification Test Requirement

The build pipeline enforces an automated size gate test (`tests/unit/step7.test.ts`) that measures base system footprint and asserts that installed size remains strictly `< 5.0 GB`.
