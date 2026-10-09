# Centipede OS visual identity

The operating system's visible identity is Centipede OS across the boot menus, startup splash, login screen, desktop, and guided installer. Its default wallpaper follows the requested cinematic deep-space scene: a dark metallic centipede with orange highlights wrapped around Earth. The same Centipede mark and wordmark carry through the boot menu and splash, installer, panel, and applications. The live environment uses static artwork so graphics acceleration is not required to show the brand.

| Surface | Source | Installed use |
|---|---|---|
| Mark | `packaging/live-build/config/includes.chroot/usr/share/backgrounds/centipede/centipede-mark.svg` | Installer and application icon |
| Desktop | `centipede-workspace.svg` and `centipede-earth.png` | Earth-and-centipede default wallpaper with a subtle Centipede OS wordmark |
| Boot menu | `centipede-menu.svg` | GRUB and legacy BIOS menu background |
| Startup | `centipede-boot.svg` and `usr/share/plymouth/themes/centipede/` | Plymouth splash |
| Installer | `etc/calamares/branding/centipede/branding.desc` | Centipede product name and logo |

PNG artwork is generated from those SVG sources with:

```sh
node scripts/render-brand-assets.mjs
```

The live-image build fails if required artwork or Centipede identity configuration is missing. The boot-menu hook also fails if a generated visible boot label still identifies the base distribution. Linux components and package metadata retain machine-readable compatibility fields and required upstream legal notices; those fields are not product branding.

The `v1.0.1-rc.4`, `rc.5`, and `rc.6` images were withheld after QEMU showed Debian's BIOS splash and a black live screen. The current branch fixes the nested Syslinux splash override, installs a system-wide desktop autostart, invokes the readiness probe through Python, and records the updated Earth artwork and Centipede wordmark. Exact-image BIOS/UEFI screenshots and the desktop readiness marker still must pass before publication. The stable download remains v1.0.0. Required upstream license notices and machine-readable compatibility metadata remain in the image.
