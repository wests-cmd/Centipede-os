# Centipede OS — The ZeroTrust AI Desktop Operating System

**Centipede OS** is an easy-to-use, secure operating system designed to give you an intelligent AI assistant (**Jarvis**) that can perform real-world tasks on your computer while keeping your files, credentials, and privacy completely safe.

Centipede OS operates on top of **Kingdom** (`wests-cmd/kingdom`), an independent security engine that ensures AI models can never perform dangerous or unauthorized actions without your permission.

---

## Quick Navigation

- [What is Centipede OS?](#what-is-centipede-os)
- [Core Concepts Explained](#core-concepts-explained)
- [Choosing Your Profile: Full vs. Ultralight (<5 GB)](#choosing-your-profile)
- [How Do I Control Centipede OS From My Phone?](#phone-command-center)
- [Installation Guide](#installation-guide)
- [Security & Privacy FAQ](#security-faq)
- [Troubleshooting & Recovery](#recovery)
- [Developer & Testing Documentation](#developer-info)

---

## What is Centipede OS?

Centipede OS is a modern desktop environment where AI automation and security work together seamlessly:

- **Intelligent Assistant (Jarvis)**: Ask questions, search your files, organize documents, or run automated routines using simple natural language.
- **ZeroTrust Security Boundary**: The AI pipeline proposes plans, but **Kingdom** independently checks permissions. The AI model can *never* self-authorize or run raw system commands.
- **Privacy First**: Your documents, memory graphs, and task histories stay on your local device.
- **Mobile Companion Command Center**: Monitor your computer's health, review pending approvals, and send commands to Jarvis safely from your phone.

---

## Core Concepts Explained

### What is Kingdom?
**Kingdom** is the security and execution engine beneath Centipede OS. It holds the sole execution authority for files, tasks, and operating system operations. If Kingdom is offline, no privileged actions occur.

### What is a Knight?
A **Knight** is an execution worker node inside the Kingdom swarm. Knights handle specific tasks like running background jobs, processing data, or executing approved workflows.

### What is a Scout?
A **Scout** is a discovery node that monitors device capabilities, network interfaces, and system health to report available resources to the swarm.

### What is Jarvis (Centipede Assistant)?
**Jarvis** is your natural language assistant. Jarvis translates your requests ("Find my invoice and archive it") into step-by-step plans, checks for required permissions, and executes approved steps.

---

## Choosing Your Profile

Centipede OS offers two official installation profiles:

| Feature / Target | Centipede OS Full Experience | Centipede OS Ultralight (< 5 GB Target) |
| :--- | :--- | :--- |
| **Download / ISO Target** | 8–12 GB | **1.8 GB Compressed** |
| **Base Installed Size** | 30 GB | **3.2 GB Installed** (Leaves 1.8 GB margin under 5 GB) |
| **Recommended Computer Disk** | 128 GB – 256 GB SSD | **32 GB – 64 GB Disk** |
| **Included Features** | Full Desktop, Kingdom Runtime, AI Models, Docker Containers, VMs | Essential Desktop, Kingdom Core, Security Gate, Jarvis, Recovery Tools |
| **Optional Workloads** | Pre-installed | **On-Demand Package Acquisition** (Downloaded only on request) |

---

## Phone Command Center

You can monitor and command Centipede OS away from your computer using any mobile browser or smartphone:

1. Open **Mobile Companion** in Centipede OS Settings.
2. Scan the **QR Code** or enter the **6-digit PIN** on your phone.
3. Your phone becomes a secure authenticated client:
   - View system health and storage pressure in real time.
   - Review and approve pending security requests.
   - Send commands to Jarvis.
   - Instantly revoke phone access if lost or stolen.

*Security Rule*: Your phone acts as an authenticated client—it **cannot** bypass Kingdom authorization or execute raw host shell commands.

---

## Installation Guide

### Option A: Try Centipede OS Live / USB
1. Insert a **32 GB or 64 GB USB drive**.
2. Flash the Centipede OS Live image using BalenaEtcher or Rufus.
3. Boot your computer from USB to try Centipede OS without touching your hard drive.

### Option B: Run in a Virtual Machine (VM)
1. Open VirtualBox, VMware, or UTM.
2. Create a VM with **2 CPU cores, 4 GB RAM, and 32 GB Storage**.
3. Select `centipede-os-ultralight.iso` as the boot disk.

### Option C: Run with Docker Compose
```bash
# Clone repository
git clone https://github.com/wests-cmd/Centipede-os.git
cd Centipede-os

# Start non-root container environment
docker-compose up -d
```
Open `http://localhost:3000` in your browser.

---

## Security FAQ

### Q: Can the AI delete my files or execute dangerous commands without asking?
**No.** Every mutating or high-risk action (such as deleting files or running processes) requires a valid Just-In-Time (JIT) capability grant or explicit human approval.

### Q: What if an untrusted skill or website tries to trick the AI ("Ignore instructions")?
**All external text, downloaded files, and web search results are classified as DATA.** Prompt injection text carries **zero authority** and cannot grant permissions.

### Q: What happens if Kingdom is offline?
Centipede OS **fails closed**. If Kingdom is disconnected, privileged execution stops safely (`KINGDOM_OFFLINE`).

### Q: What if a phone or node is stolen?
Open the Security Center in Centipede OS desktop shell and click **Revoke**. The device's access token is destroyed instantly.

---

## Recovery

If an update or workflow fails, Centipede OS preserves your data:
- **Atomic Rollback**: `KingdomUpdateCenter` verifies system health before committing updates. If verification fails, the system automatically reverts to the previous release checkpoint.
- **Persistence Integrity**: Persistent state files are protected by SHA-256 signatures (`computeIntegritySignature`).
- **Emergency Kill Switch**: Click the red Global Kill Switch in the Desktop Shell or Security Center to halt active executions instantly.

---

## Developer Info

```bash
# Install dependencies
bun install

# Run unit & adversarial test suites (97 tests across 14 suites)
bun test

# Run contract verification against live Kingdom server
bun run test:contract

# Run Playwright E2E browser tests
bun run test:e2e
```
