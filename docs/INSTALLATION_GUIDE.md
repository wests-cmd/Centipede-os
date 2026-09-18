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

## 3. First-Boot Setup & Mobile Pairing

1. When Centipede OS boots, the **Desktop Shell** appears.
2. Click **Settings** → **Mobile Companion** to pair your smartphone.
3. Scan the QR code or enter the 6-digit PIN on your phone.
4. Your phone is now paired as an authorized command client.

---

## 4. Recovery & Safe Reset

If you ever need to reset or repair Centipede OS:
- **Recovery Boot**: Select **Recovery Mode** from the boot menu to repair boot files or restore system checkpoints.
- **Reset Options**: Choose **Keep My Files** to reinstall system files while keeping user documents intact, or **Factory Reset** to erase everything.
