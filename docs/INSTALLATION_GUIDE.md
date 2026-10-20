# Put Centipede on a USB and start it on another PC

This guide is for trying Centipede OS from a USB drive. It uses buttons and menus; you do not need to type commands.

## Before you start

- A Windows, Mac, or Linux computer with internet access.
- An empty USB drive with at least 8 GB of space. A 16 GB drive is recommended.
- About 10–20 minutes for the download and USB writing.

**Writing the image erases every file on the USB drive.** Copy files you want to keep somewhere else first. When writing, carefully select the USB by name and size.

## 1. Download Centipede

Click the [direct Centipede OS v1.0.0 ISO download](https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.0/centipede-os-1.0.0-x86_64.iso) and save the file. If your browser asks, choose **Save**. It will usually go into your **Downloads** folder.

The current public v1.0.0 download has the original desktop layout. The redesigned desktop with free Chromium, LibreOffice, Thunderbird, and VLC is in the next build on `main`, but has not been published as a new stable download yet.

## 2. Write the download to the USB

Use [balenaEtcher](https://etcher.balena.io/), a free app for writing operating system images to USB drives. Debian’s USB-writing guide also recommends Etcher for Windows users.

1. Download Etcher from its official website and open it.
2. Plug in the USB drive you are willing to erase.
3. Click **Flash from file**. Open **Downloads**, select the Centipede file ending in `.iso`, then click **Open**.
4. Click **Select target**. Choose the USB drive you plugged in. Check its name and size carefully. Do not select your computer’s internal drive.
5. Click **Flash!**. Confirm the warning that the selected USB drive will be erased.
6. Wait until Etcher says it is finished. Close Etcher and safely eject the USB drive.

## 3. Start the other PC from the USB

1. On the other PC, save your work and shut it down.
2. Plug in the Centipede USB and turn the PC on.
3. As it starts, tap its **boot menu** key several times. Common keys are `F12`, `F9`, `F11`, or `Esc`. The correct key depends on the PC maker; it may appear briefly on the startup screen.
4. Select the USB drive. It may be listed as **UEFI: <USB name>**. Press `Enter`.
5. If a start menu appears, choose its default live/start option and wait for the desktop.

If Windows starts instead, shut down and try again using another common boot key. You can also search for “boot menu” with the PC maker and model. Do not disable Secure Boot or change firmware settings as a first step; ask for help if the USB is refused.

## 4. Finish and return to the usual system

When you are done, shut down Centipede, remove the USB after the PC is off, and turn the PC on again. The PC should start its usual system.

## What this USB can and cannot do

- This is a **live USB**: Centipede runs from the USB for that session. It does not install itself on the PC’s internal drive.
- The currently published v1.0.0 image does not include a disk installer. A guided installer is being added to the next image; do not expect the public v1.0.0 download to install permanently.
- Files and settings created in the temporary session may be lost when the PC shuts down. Save important work somewhere else.
- This does not include the Kingdom service. Kingdom-backed features need a separately deployed Kingdom service.
- Hardware support varies. Some Wi-Fi, graphics, or other devices may need firmware that is not included in this image.
- The public v1.0.0 image does not contain the redesigned everyday-app desktop shown in the README preview. That change needs a new tagged release.

When a newer image is published, check its release notes and the separate [disk installation guide](DISK_INSTALLATION_GUIDE.md) before installing. The release notes will say whether the guided installer passed its virtual-disk install and reboot checks.

## If the PC will not start from the USB

1. Recreate the USB and make sure Etcher reported that writing completed.
2. Try a different USB port, then open the PC’s boot menu again.
3. Check the PC maker’s support page for its boot-menu key and USB boot instructions.
4. If the PC shows a security or firmware warning, leave its settings unchanged and get help before continuing.

## Developer and deployment options

The regular web app can be run by a developer with Bun. The Docker image serves the web app only; it does not create a USB desktop and it does not deploy Kingdom. See the [README](../README.md), [platform build guide](PLATFORM_BUILD_GUIDE.md), and [release certification](release/RELEASE_CERTIFICATION.md) for those paths and their limits.
