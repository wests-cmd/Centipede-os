# Install Centipede OS onto a computer

This guide applies only to a Centipede image whose release notes say **Guided disk installation: verified**. The currently published v1.0.0 live image does not include the installer.

## Before you begin

- Back up files from every drive in the computer. Installing an operating system can erase files.
- Use a computer with at least 4 GB of memory and a destination drive with at least 32 GB free.
- Keep the Centipede USB connected until the installer says it is finished.
- If you do not recognize a drive or its size, stop and ask someone to help. Do not guess.

## Start the installer

1. Start the computer from the Centipede USB and wait for the live desktop.
2. Open **Install Centipede OS** from the desktop.
3. Allow the installer to open with system permission. This is needed to prepare the drive you choose.
4. Choose your language and keyboard layout.
5. On the disk screen, select the internal drive only after checking its name and capacity. The USB used to start Centipede is protected and should not be offered as an installation target. If the disk list is confusing or the USB appears as a target, cancel and do not continue.
6. Review the partition plan carefully. It must name the drive you intend to use and show the changes that will be made. The installer starts with no disk operation selected and pauses for a final confirmation before it changes the drive.
7. Create your user account and continue only when the summary is correct.
8. Wait for the success screen, shut down, remove the USB, then start the computer again.

## Important limits

- This is a fresh installation workflow. Treat the selected drive as erasable; preserve files elsewhere first.
- Do not power off or remove the USB while installation is running. If it fails, leave the drive unchanged where possible, save the error message, and ask for help. Automatic recovery from an interrupted installation is not yet available.
- Automatic graphics fallback, low-memory mode, diagnostics export, and installed-system update rollback are not included yet.
- The installer and installed system support x86-64 PCs only. Secure Boot, unusual storage controllers, and physical-hardware compatibility vary and require separate verification.
- Kingdom is a separate service. Installing Centipede does not install or start Kingdom.
