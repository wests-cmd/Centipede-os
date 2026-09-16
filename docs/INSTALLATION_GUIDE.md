# CENTIPEDE OS NON-TECHNICAL INSTALLATION GUIDE

## Welcome to Centipede OS

Centipede OS is designed for easy installation on any computer, virtual machine, or USB drive. Follow these step-by-step instructions.

---

## 1. System Requirements

### Minimum Requirements (Ultralight Profile)
- **Processor**: 2 CPU cores (64-bit x86 or ARM64)
- **Memory**: 4 GB RAM
- **Storage**: 32 GB SSD or USB drive
- **Network**: Local network or internet connection for Kingdom updates

### Recommended Requirements (Full Profile)
- **Processor**: 4+ CPU cores
- **Memory**: 8 GB – 16 GB RAM
- **Storage**: 128 GB – 256 GB SSD

---

## 2. Step-by-Step Installation Methods

### Method 1: USB Flash Drive Installation (Live Boot)
1. Download `centipede-os-ultralight.iso` (1.8 GB).
2. Insert a **32 GB or 64 GB USB drive** into your computer.
3. Open a flashing tool like **BalenaEtcher** (Windows/macOS/Linux) or **Rufus** (Windows).
4. Select the downloaded ISO file and your USB drive, then click **Flash**.
5. Restart your computer and press `F12`, `F11`, or `Option` during boot to select boot from USB.
6. Centipede OS will start in Live Mode without modifying your computer.

---

### Method 2: Virtual Machine (VirtualBox / VMware / UTM)
1. Install **VirtualBox** or **UTM** on your host computer.
2. Click **New Machine** and choose **Linux (64-bit)**.
3. Allocate **2 CPU cores, 4096 MB RAM, and 32 GB Disk Space**.
4. Attach `centipede-os-ultralight.iso` as the optical drive and start the VM.

---

### Method 3: Docker Container Deployment
If you already have Docker installed on Linux, macOS, or Windows:

```bash
# Clone the Centipede OS repository
git clone https://github.com/wests-cmd/Centipede-os.git
cd Centipede-os

# Launch non-root container stack
docker-compose up -d
```

Open `http://localhost:3000` in your web browser.

---

## 3. One-Click Launch & Guided First-Run Setup Wizard

1. Start Centipede OS using the one-click command or executable:
   ```bash
   bun start
   ```
2. The **Centipede OS Guided First-Run Wizard** will automatically launch in your browser at `http://localhost:3000`:
   - **Step 1: Welcome** — Overview of Segmentor assistant and ZeroTrust governance.
   - **Step 2: System Check** — Automated verification of OS, CPU, RAM, and storage allocation.
   - **Step 3: Role Selection** — Select **Full Centipede OS Workstation**, **Knight Worker Node**, or **Scout Agent**.
   - **Step 4: Security** — Configure ZeroTrust permission gate and approval policies.
   - **Step 5: Kingdom Swarm** — Connect and verify connection to Kingdom backend (`http://localhost:8000`).
   - **Step 6: Finish** — Confirm health check and enter Desktop Shell.
3. Your setup preferences are saved locally and survive system restarts.

---

## 4. Recovery & Safe Reset

If you ever need to reset or repair Centipede OS:
- **Recovery Boot**: Select **Recovery Mode** from the boot menu to repair boot files or restore system checkpoints.
- **Reset Options**: Choose **Keep My Files** to reinstall system files while keeping user documents intact, or **Factory Reset** to erase everything.
