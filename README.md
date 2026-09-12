# [Centipede OS](https://github.com/wests-cmd/Centipede-os) — The ZeroTrust AI Desktop Operating System

**[Centipede OS](https://github.com/wests-cmd/Centipede-os)** is an easy-to-use, secure operating system designed to give you an intelligent AI assistant (**Segmentor**) that can perform real-world tasks on your computer while keeping your files, credentials, and privacy completely safe.

Centipede OS operates on top of **Kingdom** (`wests-cmd/kingdom`), an independent security engine that ensures AI models can never perform dangerous or unauthorized actions without your permission.

---

<!-- CENTIPEDE_DOWNLOADS_START -->
# Download Centipede OS

Choose the download profile that fits your system or hardware role:

### 1. [Download Commander](https://github.com/wests-cmd/Centipede-os/releases/latest)
For your main desktop PC or primary control hub. Manages AI orchestration, workflow planning, and security policies.

### 2. [Download Knight](https://github.com/wests-cmd/Centipede-os/releases/latest)
For dedicated execution worker nodes. Handles background workloads, data processing, and approved automated tasks.

### 3. [Download Ultralight / Live USB](https://github.com/wests-cmd/Centipede-os/releases/latest)
For USB flash drives, Virtual Machines (VirtualBox/VMware/UTM), or older hardware with limited storage (< 5 GB installed footprint).

### 4. [Download Scout](https://github.com/wests-cmd/Centipede-os/releases/latest)
For lightweight edge discovery and monitoring nodes. Collects device telemetry and system health without heavy workloads.

### 5. [Download Full Centipede](https://github.com/wests-cmd/Centipede-os/releases/latest)
For the complete all-in-one local desktop experience with pre-packaged local AI models and container tools.

---

## Mobile Command Companion

- **[Download Android APK](https://github.com/wests-cmd/Centipede-os/releases/latest)** (Direct Android Mobile Client)
- **[Google Play Store](https://github.com/wests-cmd/Centipede-os)** (Play Store Listing)
- **[Apple App Store / TestFlight](https://github.com/wests-cmd/Centipede-os)** (iOS Companion Client)

---

### Unsure Which Profile You Need?
Choose **[Auto-Detect & Recommend Profile](https://github.com/wests-cmd/Centipede-os/releases/latest)** during bootstrap setup. Centipede OS will evaluate your computer's CPU cores, RAM, and disk space to recommend the safest profile automatically.
<!-- CENTIPEDE_DOWNLOADS_END -->

---

## Quick Navigation

- [What is Centipede OS?](#what-is-centipede-os)
- [Core Concepts Explained](#core-concepts-explained)
- [Choosing Your Profile](#choosing-your-profile)
- [How Do I Control Centipede OS From My Phone?](#phone-command-center)
- [Installation Guide](docs/INSTALLATION_GUIDE.md)
- [Security & Privacy FAQ](#security-faq)
- [Troubleshooting & Recovery](#recovery)
- [Developer & Testing Documentation](#developer-info)

---

## What is Centipede OS?

Centipede OS is a modern desktop environment where AI automation and security work together seamlessly:

- **Intelligent Assistant (Segmentor)**: Ask questions, search your files, organize documents, or run automated routines using simple natural language.
- **ZeroTrust Security Boundary**: The AI pipeline proposes plans, but **Kingdom** independently checks permissions. The AI model can *never* self-authorize or run raw system commands.
- **Privacy First**: Your documents, memory graphs, and task histories stay on your local device.
- **Mobile Companion Command Center**: Monitor your computer's health, review pending approvals, and send commands to Segmentor safely from your phone.

---

## Core Concepts Explained

### What is Kingdom?
**Kingdom** is the security and execution engine beneath Centipede OS. It holds the sole execution authority for files, tasks, and operating system operations. If Kingdom is offline, no privileged actions occur.

### What is a Knight?
A **Knight** is an execution worker node inside the Kingdom swarm. Knights handle specific tasks like running background jobs, processing data, or executing approved workflows.

### What is a Scout?
A **Scout** is a discovery node that monitors device capabilities, network interfaces, and system health to report available resources to the swarm.

### What is Segmentor (Centipede Assistant)?
**Segmentor** is your natural language assistant. Segmentor translates your requests ("Find my invoice and archive it") into step-by-step plans, checks for required permissions, and executes approved steps.

---

## Choosing Your Profile

Centipede OS offers profile choices tailored to your hardware:

| Feature / Target | Centipede OS Full Experience | Centipede OS Ultralight (< 5 GB Target) |
| :--- | :--- | :--- |
| **Download / ISO Target** | 8–12 GB | **1.8 GB Compressed** |
| **Base Installed Size** | 30 GB | **3.2 GB Installed** (Leaves 1.8 GB margin under 5 GB) |
| **Recommended Computer Disk** | 128 GB – 256 GB SSD | **32 GB – 64 GB Disk** |
| **Included Features** | Full Desktop, Kingdom Runtime, AI Models, Docker Containers, VMs | Essential Desktop, Kingdom Core, Security Gate, Segmentor, Recovery Tools |
| **Optional Workloads** | Pre-installed | **On-Demand Package Acquisition** (Downloaded only on request) |

---

## Phone Command Center

You can monitor and command Centipede OS away from your computer using any mobile browser or smartphone:

1. Open **Mobile Companion** in Centipede OS Settings.
2. Scan the **QR Code** or enter the **6-digit PIN** on your phone.
3. Your phone becomes a secure authenticated client:
   - View system health and storage pressure in real time.
   - Review and approve pending security requests.
   - Send commands to Segmentor.
   - Instantly revoke phone access if lost or stolen.

*Security Rule*: Your phone acts as an authenticated client—it **cannot** bypass Kingdom authorization or execute raw host shell commands.

---

## Installation Guide

For detailed non-technical installation steps, see our [Installation Guide](docs/INSTALLATION_GUIDE.md).

### Option A: Try Centipede OS Live / USB
1. Insert a **32 GB or 64 GB USB drive**.
2. Flash `centipede-os-ultralight.iso` using BalenaEtcher or Rufus.
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

# Run unit & adversarial test suites (105 tests across 15 suites)
bun test

# Run contract verification against live Kingdom server
bun run test:contract

# Run Playwright E2E browser tests
bun run test:e2e
```
