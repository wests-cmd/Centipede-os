# Start Centipede over Ethernet

Network boot lets a PC start the Centipede live image from another PC over Ethernet. It does not install the operating system onto the target computer.

The current public v1.0.0 image is live-only and has no disk installer. Do not use it to erase or install onto a drive. A future image is suitable for disk installation only when its release notes say the disk installer has passed its install, reboot, and source-media safety checks.

## What you need

- A Windows PC to host the image and run iVentoy.
- The Centipede x86-64 ISO, downloaded from the [official releases](https://github.com/wests-cmd/Centipede-os/releases).
- An Ethernet cable and a second x86-64 PC with wired network boot (PXE) support.
- Permission to use iVentoy Free Edition. Its publisher allows free non-commercial use, up to 20 clients. Commercial use requires its Pro Edition.

## Set up the host PC

1. Download the Windows package from the [official iVentoy releases](https://github.com/ventoy/PXE/releases). Extract it to a short folder path without spaces or non-English characters, such as `C:\iventoy`.
2. Copy the Centipede `.iso` into iVentoy's `iso` folder. Keep the original downloaded ISO as a backup.
3. Connect the host PC directly to the other PC with the Ethernet cable. Leave the host's normal internet connection alone; choose the wired Ethernet adapter for PXE in iVentoy.
4. Start iVentoy and open `http://127.0.0.1:26000` on the host PC.
5. Select the wired adapter and its server address. Use iVentoy's DHCP service and the displayed address pool for a direct cable connection, then start the PXE service.

Do not start iVentoy's DHCP service on a shared home or office network. Another DHCP server may already be managing that network. For a shared network, use iVentoy's documented third-party DHCP setup and have the network administrator configure it.

## Start the other PC

1. Turn on the target PC and open its one-time boot menu. Common keys include `F12`, `F9`, `F11`, or `Esc`.
2. Choose the wired network option, usually named **UEFI Network**, **IPv4 PXE**, or **Network Boot**. If asked, allow network boot in firmware settings. Do not change storage or boot-order settings beyond what is needed to choose this one-time network boot.
3. When the iVentoy menu appears, select the Centipede ISO and choose its live/start option.
4. Use Centipede as a temporary live session. Shut it down when finished, then stop iVentoy's PXE service and disconnect the Ethernet cable.

If the network option does not appear, the target's wired network adapter or firmware may not support PXE. Try a USB boot instead. Keep important files backed up; live-session files are not saved after shutdown.

## Safety and troubleshooting

- The host PC only serves the ISO; the target PC boots and runs it. The guide does not authorize an unattended or remote disk install.
- Keep the host firewall enabled. If Windows asks, allow iVentoy only on the private wired connection, and stop PXE service after use.
- Keep the PXE web console on the host at `127.0.0.1`; do not expose it to the internet.
- If the target has Secure Boot enabled and rejects the network boot, check the iVentoy Secure Boot instructions and the Centipede release notes before changing Secure Boot. Do not disable it as a blind troubleshooting step.
- If the target starts but cannot load the image, confirm both PCs use the cable-connected adapter, the PXE service is running, and the ISO is listed in iVentoy. A direct cable must provide a working link on both network adapters.

## Official references

- [iVentoy Free and Pro editions](https://www.iventoy.com/en/doc_edition.html)
- [iVentoy Windows setup and PXE steps](https://www.iventoy.com/en/doc_start.html)
- [iVentoy Secure Boot guide](https://www.iventoy.com/en/sboot.html)
- [iVentoy third-party DHCP setup](https://www.iventoy.com/en/doc_ext_dhcp.html)
