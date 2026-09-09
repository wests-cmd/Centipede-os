# CENTIPEDE OS STORAGE ARCHITECTURE SPECIFICATION v1.0

## Executive Summary

This specification defines the storage engineering targets, partition structures, installation profiles, safety thresholds, and atomic update mechanics for Centipede OS v1.0.

---

## 1. Conceptual Storage Classes

Centipede OS separates storage into 4 distinct functional classes:

1. **Immutable System (`/system`, `/boot`)**: Core OS binaries, desktop shell, drivers, Kingdom runtime binaries, and core security modules.
2. **Recoverable System Data (`/recovery`, `/var`)**: Independent recovery environment, diagnostic tools, release checkpoints, and system configuration snapshots.
3. **Expandable Workload Pools (`/data/`)**: Docker containers, VMs, AI models, skills, Kingdom task graph, caches, and logs.
4. **User Data (`/home/`)**: User personal documents, desktop files, and media.

---

## 2. ISO & USB Requirements

### ISO Build Targets
- **Core ISO Target**: 8–12 GB (Hard warning threshold: 15 GB)
- **Included Content**: Bootloader, base system, desktop shell, networking, hardware detection, installer, recovery environment, Kingdom runtime, basic security services, essential drivers.
- **Excluded Content (Add-on/Optional)**: Large AI models (>3B parameters), VM disk images, nonessential developer toolchains, optional skill packages.

### USB Installation Media
- **Minimum Supported**: 32 GB
- **Recommended**: 64 GB
- **Developer / Heavy Recovery**: 128 GB

---

## 3. Official Installation Profiles

### Profile A — Minimum (64 GB Disk)
For lightweight installations and resource-constrained hardware.
- EFI/Boot: 1 GB
- Recovery: 6 GB
- OS/System: 20 GB
- System Data: 5 GB
- Workload Pool (`/data`): 20 GB
- Free Safety Reserve: 12 GB

### Profile B — Recommended (128 GB Disk)
Default installation profile for standard desktop workloads.
- EFI/Boot: 1 GB
- Recovery: 8 GB
- OS/System: 30 GB
- System Data: 10 GB
- Workload Pool (`/data`): 50 GB
- Free Safety Reserve: 29 GB

### Profile C — Power User (256 GB+ Disk)
For multi-node Knights, heavy Docker/VM workloads, and large AI models.
- EFI/Boot: 1 GB
- Recovery: 12 GB
- OS/System: 40 GB
- System Data: 15 GB
- Docker Pool (`/data/containers`): 60 GB
- VM Pool (`/data/vms`): 50 GB
- AI Model Pool (`/data/models`): 40 GB
- Free Reserve: 38 GB

---

## 4. Storage Safety Thresholds

Centipede OS actively monitors free disk space and enforces automatic safety actions:

| Free Space Percentage | State Classification | System Action |
| :--- | :--- | :--- |
| **> 30%** | `NORMAL` | Full system functionality. All downloads, builds, and model pulls permitted. |
| **20% – 30%** | `INFORMATIONAL_WARNING` | Storage Manager UI displays informational usage indicator. |
| **10% – 20%** | `WARNING` | Automatically cleans temporary build caches and log rotation archives. |
| **5% – 10%** | `CRITICAL` | Blocks new VM creation, stops nonessential model downloads/image pulls, warns user. |
| **< 5%** | `EMERGENCY` | Enforces emergency lockdown: stops all nonessential background builds, protects OS bootability. |

---

## 5. Atomic Update & Rollback Architecture

```text
               System A (v1.0.0 Active)
                         │
                         ▼
        Download & Stage Update to System B
                         │
                         ▼
             Verify SHA-256 Checksum
                         │
                         ▼
                 Boot System B (v1.1.0)
                         │
        ┌────────────────┴────────────────┐
        │                                 │
 Health Checks Pass              Health Checks Fail
        │                                 │
        ▼                                 ▼
Mark System B Active            Roll Back to System A
Retire System A                 Preserve Failure Logs
```

---

## 6. Workload Storage Structure

```text
/data/
├── kingdom/        # Kingdom runtime task data, audit logs, node graph
├── skills/         # Installed skill manifests, checksums, package artifacts
├── models/         # AI model weights (GGML, GGUF, SafeTensors)
├── containers/     # Docker container layers, image cache, volumes
├── vms/            # Virtual machine QCOW2/RAW disk images
├── cache/          # Temporary build & package manager cache
└── logs/           # Rotated system & audit logs (2–5 GB cap)
```
