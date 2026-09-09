# CENTIPEDE OS DOOMSDAY STORAGE LABORATORY REPORT

## Executive Summary

The Doomsday Storage Laboratory Exercise evaluates Centipede OS's containment, detection, threshold enforcement, and recovery mechanisms under 20 extreme storage failure and exhaustion scenarios.

### Primary Storage Invariant
> **NO WORKLOAD (DOCKER CONTAINER, VM, AI MODEL, SKILL, OR LOG EXPLOSION) CAN SILENTLY EXHAUST HOST STORAGE, CORRUPT USER FILES, OR RENDER THE SYSTEM UNBOOTABLE.**

---

## 1. Storage Doomsday Scenarios A–E Analysis

### Scenario A — Docker Storage Exhaustion
- **Simulated Event**: A runaway Docker container build loop attempts to fill all available storage.
- **Observed Behavior**: Free disk space drops below 10% (`CRITICAL` pressure). Nonessential image pulls and container builds are throttled. At <5% free space (`EMERGENCY` pressure), `ToolExecutor.execute()` blocks mutating operations with error `STORAGE_EMERGENCY`.
- **Result**: Core OS boot files (`/system`) and Kingdom runtime remain operational. Disk space never hits 0%.

### Scenario B — AI Model Download Interruption
- **Simulated Event**: Network drops or power fails midway through downloading a 14 GB GGUF model file.
- **Observed Behavior**: Incomplete download is identified by SHA-256 manifest verification. The partial download is cleanly purged or resumed upon reconnection.
- **Result**: System storage integrity preserved; corrupted file rejected as model weights.

### Scenario C — Log Explosion
- **Simulated Event**: Application error loop attempts to log 100 GB of stderr output per minute.
- **Observed Behavior**: Log rotation policy caps `/data/logs` at 2–5 GB. Excess log lines are compressed or dropped according to retention policy.
- **Result**: Log storage strictly bounded; disk exhaustion prevented.

### Scenario D — Failed Update Under Storage Constraints
- **Simulated Event**: System update attempted when free disk space is insufficient to stage System B.
- **Observed Behavior**: `KingdomUpdateCenter` verifies storage budget before staging update. Update is blocked safely before destructive modifications occur (`INSUFFICIENT_STORAGE_FOR_UPDATE`).
- **Result**: System A remains 100% operational and bootable.

### Scenario E — VM Storage Pool Exhaustion
- **Simulated Event**: A virtual machine QCOW2 image expands to fill its assigned storage pool.
- **Observed Behavior**: VM disk pool quota (`/data/vms`) caps expansion. The VM workload receives an internal disk-full signal and pauses safely without affecting the host OS or other containers.
- **Result**: Host OS and Kingdom runtime continue operating cleanly.

---

## 2. Twenty Storage Failure Simulations Matrix

| Test ID | Failure Vector | Simulated Trigger | Observed System Response | Result |
| :--- | :--- | :--- | :--- | :--- |
| **ST-01** | **95% Disk Usage** | Free space drops to 5% | Transitions to `CRITICAL` pressure state; warns user in Storage Manager UI. | `PASS` |
| **ST-02** | **98% Disk Usage** | Free space drops to 2% | Transitions to `EMERGENCY` state; `ToolExecutor` blocks mutating operations (`STORAGE_EMERGENCY`). | `PASS` |
| **ST-03** | **99% Disk Usage** | Free space drops to 1% | Emergency lockdown active; system processes retain 1% protected reserve. | `PASS` |
| **ST-04** | **Docker Pool Exhaustion** | Container layer writes exceed pool | Pool quota halts container layer creation; host system remains unaffected. | `PASS` |
| **ST-05** | **VM Pool Exhaustion** | VM image allocation request exceeds limit | VM creation rejected (`VM_STORAGE_EXCEEDED`). | `PASS` |
| **ST-06** | **Model Download Interruption** | Power cut mid-download | Partial model file checksum fails SHA-256 check; partial download purged or resumed. | `PASS` |
| **ST-07** | **Corrupted Model File** | Tampered model weights payload | Model loader rejects corrupted weights file; system falls back to verified model. | `PASS` |
| **ST-08** | **Corrupted Skill Package** | Tampered skill ZIP archive | `TrustedSkillEngine` fails artifact checksum validation (`SKILL_CHECKSUM_MISMATCH`). | `PASS` |
| **ST-09** | **Log Explosion** | Stderr loop writing infinite logs | Log rotation limits total log space to 2–5 GB; old logs compressed. | `PASS` |
| **ST-10** | **Failed OS Update** | Corrupted package during update | Update verification fails; atomic rollback restores previous verified System A. | `PASS` |
| **ST-11** | **Failed Rollback** | Corrupted rollback checkpoint | System boots into Recovery partition (`/recovery`) for diagnostics and repair. | `PASS` |
| **ST-12** | **Power Loss During Update** | Power cut during System B staging | System A remains intact; bootloader boots System A cleanly on power restoration. | `PASS` |
| **ST-13** | **Power Loss During Write** | Power cut during database write | SQLite/persistence WAL journal restores consistent database state on boot. | `PASS` |
| **ST-14** | **Filesystem Read-Only Error** | Disk error forces read-only mount | `ToolExecutor` catches write error, trips circuit breaker, routes to DLQ. | `PASS` |
| **ST-15** | **Secondary Drive Loss** | Secondary SSD unmounted | Workload pools fallback to degraded read-only state; core OS continues running. | `PASS` |
| **ST-16** | **Recovery Partition Corruption** | Corruption of `/recovery` partition | System logs warning; Recovery creation tool prompts user to rebuild recovery media. | `PASS` |
| **ST-17** | **Malicious Process Storage Attack**| Process attempts writing infinite garbage | Non-root sandbox container user space quotas block file creation. | `PASS` |
| **ST-18** | **Compromised VM Disk Attack** | Guest VM attempts filling host disk | Guest disk image capped at fixed QCOW2 max allocation. Host protected. | `PASS` |
| **ST-19** | **Compromised Container Attack** | Container attempts overlay2 expansion | Container storage quota blocks layer expansion. | `PASS` |
| **ST-20** | **Accidental Delete Attempt** | User requests `delete everything` | Intent parsed as `RESTRICTED_DELETE`; requires explicit human approval with parameter locking. | `PASS` |
